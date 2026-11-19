// Settings' options (docs/DESIGN.md §3.36): what each choice does, that a save without them is today's game, and that the
// panel stays easy to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { Game } from '../src/game.js';
import { createDefaultState, migrateState } from '../src/core/state.js';
import { renderSettings } from '../src/ui/render.js';
import { createSound } from '../src/ui/sound.js';
import { vibrationOn, EFFECTS, effectOn, cleanOptions, blowSound, hurtHeard, TEXT_SIZES, textSizeOf } from '../src/data/settings.js';
import { DISCLOSURES } from '../src/systems/disclosure.js';
import { fmt, letters, fixed, numbersIn, setNotation } from '../src/ui/format.js';
import { saverOn, atRest, REST_AFTER_MS, REST_FRAME_MS } from '../src/ui/saver.js';
import { renderAboutCard, WIKI_PAGES } from '../src/ui/features.js';
import { createAnnouncer, plainWords, fightSummary, SAY_GAP_MS, SAY_ROUTINE_MS, SAY_SAME_MS, SAY_QUEUE } from '../src/ui/announce.js';

const T0 = 1_760_000_000_000;
// A browser's sound and motor, as far as src/ui/sound.js touches them: what was heard (nodes made) and felt (patterns).
function fakeBrowser({ phone = true, audio = 'running' } = {}) {
    const log = { heard: 0, felt: [] };
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
    const node = extra => ({ connect(next) { return next; }, start() {}, stop() {}, ...extra });
    class Context {
        state = audio; currentTime = 0; sampleRate = 8000; destination = {};
        resume() { this.state = 'running'; return Promise.resolve(); }
        createGain() { return node({ gain: param() }); }
        createBiquadFilter() { return node({ type: '', Q: param(), frequency: param(), gain: param() }); }
        createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
        createOscillator() { log.heard++; return node({ type: '', frequency: param() }); }
        createBufferSource() { log.heard++; return node({ buffer: null }); }
    }
    globalThis.window = { AudioContext: Context, matchMedia: query => ({ matches: query === '(hover: none)' && phone }) };
    globalThis.document = { hidden: false };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: pattern => { log.felt.push(pattern); return true; } } });
    return log;
}

const groupsOf = html => [...html.matchAll(/<fieldset class="opt-group"><legend>([^<]+)<\/legend>([^]*?)<\/fieldset>/g)].map(m => ({ name: m[1], body: m[2] }));

test("Settings' options stand in groups, and every switch is still there", () => {
    const game = new Game(null, T0);
    const groups = groupsOf(renderSettings(game, {}, null));
    assert.deepEqual(groups.map(g => g.name), ['Sound', 'Motion and battery', 'Reading', 'Keys and log']);
    const body = name => groups.find(g => g.name === name).body;
    assert.match(body('Sound'), /FI\.setSetting\('sound', this\.checked\)/);
    assert.match(body('Sound'), /FI\.setVolume/);
    assert.match(body('Motion and battery'), /Reduce motion/);
    assert.match(body('Keys and log'), /FI\.setShortcuts/);
    assert.match(body('Keys and log'), /FI\.setPlaytestLog/);
    assert.doesNotMatch(body('Sound'), /Chime/, 'the chime waits until a mini-game has been met');
    game.state.seen.minigames = true;
    assert.match(groupsOf(renderSettings(game, {}, null)).find(g => g.name === 'Sound').body, /Chime when a mini-game chance appears/);
});

test('vibration has its own switch, on a phone; until it is used it goes with the sound, as the one switch had it', () => {
    const game = new Game(null, T0);
    const sound = () => groupsOf(renderSettings(game, { canVibrate: true }, null)).find(g => g.name === 'Sound').body;
    assert.match(sound(), /FI\.setSetting\('sound', this\.checked\)" checked> Sound</, 'the sound\'s switch says sound');
    assert.match(sound(), /FI\.setOption\('vibration', this\.checked\)" checked> Vibration</);
    assert.doesNotMatch(groupsOf(renderSettings(game, {}, null)).find(g => g.name === 'Sound').body, /Vibration/, 'not where nothing can vibrate');
    const s = game.state.settings;
    assert.equal(vibrationOn(s), true);
    s.sound = false;
    assert.equal(vibrationOn(s), false, 'a player who muted everything before this patch feels nothing new');
    game.setOption('vibration', true);
    assert.equal(vibrationOn(s), true, 'turned on, it stays on with the sound off');
    game.setOption('vibration', 'buzz');
    assert.equal('vibration' in s, false, 'what the game does not know is not kept');
    s.sound = true;
    game.setOption('vibration', false);
    assert.equal(vibrationOn(s), false, 'and off with the sound on');
});

test('the motor answers to its own switch and the sound to its own, each with the other off', t => {
    t.after(() => { delete globalThis.window; delete globalThis.document; });
    const settings = { sound: true };
    const log = fakeBrowser();
    const sfx = createSound(() => settings.sound !== false, () => 1, () => vibrationOn(settings));
    const play = name => { log.heard = 0; log.felt = []; sfx.play(name); return { heard: log.heard > 0, felt: log.felt.length > 0 }; };
    assert.deepEqual(play('crit'), { heard: false, felt: false }, 'nothing before the first gesture');
    sfx.unlock();
    assert.deepEqual(play('crit'), { heard: true, felt: true }, 'as today: the two together');
    settings.vibration = false;
    assert.deepEqual(play('crit'), { heard: true, felt: false }, 'sound without the motor');
    settings.vibration = true; settings.sound = false;
    assert.deepEqual(play('crit'), { heard: false, felt: true }, 'the motor without the sound');
    assert.deepEqual(play('click'), { heard: false, felt: false }, 'a sound with no pattern has nothing to feel');
    delete settings.vibration;
    assert.deepEqual(play('crit'), { heard: false, felt: false }, 'never touched, it went off with the sound');
    const desk = fakeBrowser({ phone: false });
    const pc = createSound(() => true, () => 1, () => true);
    pc.unlock(); pc.play('crit');
    assert.equal(desk.felt.length, 0, 'no motor on a device with a mouse');
    assert.ok(desk.heard > 0);
});

test('a save from before these choices loads with none of them, and a broken one is cleaned', () => {
    const known = Object.keys(createDefaultState(T0).settings).sort();
    const old = createDefaultState(T0);
    assert.deepEqual(Object.keys(migrateState(JSON.parse(JSON.stringify(old)), T0).settings).sort(), known, 'nothing is added to an old save');
    old.settings.vibration = 'yes';
    assert.equal('vibration' in migrateState(JSON.parse(JSON.stringify(old)), T0).settings, false);
    old.settings.vibration = false;
    assert.equal(migrateState(JSON.parse(JSON.stringify(old)), T0).settings.vibration, false, 'a real choice stays');
});

test("each effect has a switch under Reduce motion, once it has been met, and Reduce motion folds them away", () => {
    const game = new Game(null, T0);
    const s = game.state;
    const motion = (ui = {}) => groupsOf(renderSettings(game, ui, null)).find(g => g.name === 'Motion and battery').body;
    assert.doesNotMatch(motion(), /<details/, 'a new player has met none: no drawer');
    s.stats.kills = 1;
    game.tick(T0 + 100);
    assert.ok(s.seen.fx_numbers && s.seen.fx_coins);
    assert.equal(s.seen.fx_shake, undefined);
    let html = motion();
    assert.match(html, /<details class="drawer opt-drawer" {2}ontoggle="FI\.setOpen\('effects', this\.open\)"><summary>Effects<\/summary>/, 'folded at rest');
    assert.match(html, /FI\.setEffect\('numbers', this\.checked\)" checked> Floating numbers/);
    assert.match(html, /FI\.setEffect\('coins', this\.checked\)" checked>/);
    assert.doesNotMatch(html, /'shake'|'confetti'/, 'the others wait');
    assert.match(motion({ open: { effects: true } }), /<details class="drawer opt-drawer" open/);
    s.combat.bestStage = 10; s.unlocks.smithing = true;
    game.tick(T0 + 200);
    assert.match(motion(), /FI\.setEffect\('shake'/);
    assert.match(motion(), /FI\.setEffect\('confetti'/);
    game.setEffect('shake', false);
    assert.match(motion(), /FI\.setEffect\('shake', this\.checked\)" > A boss&#39;s shake/, 'and it shows off');
    s.settings.reducedMotion = true;
    assert.doesNotMatch(motion(), /<details|setEffect/, 'Reduce motion stills them all: no switches left to mean anything');
});

test('the effects are kept as the ones turned off, and only those the game knows', () => {
    const game = new Game(null, T0);
    const s = game.state.settings;
    for (const e of EFFECTS) assert.equal(effectOn(s, e.id), true, e.id);
    assert.equal('effects' in s, false);
    game.setEffect('coins', false);
    game.setEffect('confetti', false);
    assert.deepEqual(s.effects, { coins: false, confetti: false });
    assert.equal(effectOn(s, 'coins'), false);
    game.setEffect('coins', true);
    assert.deepEqual(s.effects, { confetti: false });
    game.setEffect('confetti', true);
    assert.equal('effects' in s, false, 'all on again: nothing to keep');
    assert.deepEqual(cleanOptions({ effects: { numbers: false, shake: true, nonsense: false } }), { effects: { numbers: false } });
    assert.deepEqual(cleanOptions({ effects: 'none' }), {});
    const saved = createDefaultState(T0);
    saved.settings.effects = { shake: false, '<b>': false };
    assert.deepEqual(migrateState(JSON.parse(JSON.stringify(saved)), T0).settings.effects, { shake: false });
    for (const e of EFFECTS) assert.ok(DISCLOSURES.some(d => d.id === e.met), `${e.id} opens through the disclosures`);
});

test('blows are heard at every hit, as ever, or only for the big ones', () => {
    const today = {};
    assert.equal(blowSound(today, {}), 'hit');
    assert.equal(blowSound(today, { crit: true }), 'crit');
    assert.equal(hurtHeard(today), true, 'by default nothing changes');
    const big = { blows: 'big' };
    assert.equal(blowSound(big, {}), null, 'a plain blow is quiet');
    for (const kind of ['crit', 'deathblow', 'opening', 'executed']) assert.equal(blowSound(big, { [kind]: true }), 'crit', kind);
    assert.equal(hurtHeard(big), false, 'and so is the monster on him');
    assert.deepEqual(cleanOptions({ blows: 'loud' }), {}, 'what the game does not know is not kept');
    assert.deepEqual(cleanOptions({ blows: 'all' }), {}, 'today\'s way is no field at all');
    assert.deepEqual(cleanOptions({ blows: 'big' }), { blows: 'big' });
});

test('the blows row opens with the first kill, marks its choice, and goes when nothing could be heard or felt', () => {
    const game = new Game(null, T0);
    const row = (ui = {}) => groupsOf(renderSettings(game, ui, null)).find(g => g.name === 'Sound').body;
    assert.doesNotMatch(row(), /Blows heard/, 'not before a fight has been fought');
    game.state.stats.kills = 1;
    game.tick(T0 + 100);
    assert.match(row(), /role="group" aria-label="Blows heard"/);
    assert.match(row(), /class="seg-btn on" onclick="FI\.setOption\('blows', 'all'\)" aria-pressed="true">Every hit/);
    game.setOption('blows', 'big');
    assert.match(row(), /class="seg-btn on" onclick="FI\.setOption\('blows', 'big'\)" aria-pressed="true">Crits and kills/);
    game.state.settings.sound = false;
    assert.doesNotMatch(row(), /Blows heard/, 'muted, on a device with no motor');
    game.setOption('vibration', true);
    assert.match(row({ canVibrate: true }), /Blows heard/, 'the motor still answers to it');
});

test('the battery saver: on by default on a phone only, kept per device, and at rest only when left alone', () => {
    assert.equal(saverOn(null, true), true, 'a phone starts with it on');
    assert.equal(saverOn(null, false), false, 'anything else with it off');
    assert.equal(saverOn('0', true), false, 'the choice made on this device wins');
    assert.equal(saverOn('1', false), true);
    const at = 1000000;
    const rest = extra => atRest({ on: true, now: at, touchedAt: at - REST_AFTER_MS, ...extra });
    assert.equal(rest(), true, 'left alone');
    assert.equal(rest({ touchedAt: at - REST_AFTER_MS + 1 }), false, 'touched a moment ago');
    assert.equal(rest({ on: false }), false, 'switched off');
    assert.equal(rest({ busy: true }), false, 'a mini-game or a fight on the clock wants every frame');
    assert.equal(REST_FRAME_MS, 100, 'one frame for each of the game\'s ten steps a second');
    const html = renderSettings(new Game(null, T0), { saver: true }, null);
    assert.match(html, /FI\.setSaver\(this\.checked\)" checked> Battery saver/);
    assert.doesNotMatch(JSON.stringify(new Game(null, T0).state.settings), /saver/, 'it is not in the save');
});

test('notation: letters by default, an exponent from 10^33 when mixed, from a million when scientific; small numbers as ever', t => {
    t.after(() => setNotation('short'));
    const samples = [0, 999, 1234, 999999, 1234567, 999.7e6, 2.5e9, 1.23e30, 9.994e32, 9.996e32, 1e33, 3.3e48, -2.5e9, 1.8e308, -1234567];
    const lettered = samples.map(n => fmt(n));
    assert.deepEqual(lettered.slice(0, 7), ['0', '999', '1,234', '999,999', '1.23M', '1.00B', '2.50B'], 'the default is today\'s');
    setNotation('mixed');
    assert.equal(fmt(1234567), '1.23M');
    assert.equal(fmt(1.23e30), '1.23No');
    assert.equal(fmt(9.994e32), '999No', 'letters to the last of the short names');
    assert.equal(fmt(9.996e32), '1.00e33', 'where the letters would turn to Dc');
    assert.equal(fmt(3.3e48), '3.30e48');
    assert.equal(fmt(-3.3e48), '-3.30e48');
    setNotation('scientific');
    assert.equal(fmt(999999), '999,999', 'below a million nothing changes');
    assert.equal(fmt(1234567), '1.23e6');
    assert.equal(fmt(9.996e8), '1.00e9');
    assert.equal(fmt(-2.5e9), '-2.50e9');
    assert.equal(fmt(1234567, { short: false }), '1.23e6', 'a full count too');
    assert.equal(fmt(Infinity), '0');
    assert.equal(fmt(NaN), '0');
    assert.equal(fixed(1.5), '1.50', 'a multiplier keeps its decimals');
    assert.equal(fixed(2.5e7), '2.50e7', 'until it is a big number');
    assert.deepEqual(samples.map(n => letters(n)), lettered, 'the letters themselves never change');
    setNotation('anything else');
    assert.deepEqual(samples.map(n => fmt(n)), lettered, 'an unknown choice is letters');
    assert.equal(fixed(2.5e7), '25000000.00', 'and a multiplier as it was');
});

test('figures in words the game wrote follow the notation, and the words stay', t => {
    t.after(() => setNotation('short'));
    const line = 'Prestige 12: +1.23M tokens, 4,500 gold and 2,000,000 essence at stage 300; 3 pets; 1.5s; 295QaDc health';
    assert.equal(numbersIn(line), line, 'letters: the line as it was written');
    setNotation('scientific');
    assert.equal(numbersIn(line), 'Prestige 12: +1.23e6 tokens, 4,500 gold and 2.00e6 essence at stage 300; 3 pets; 1.5s; 2.95e47 health');
    setNotation('mixed');
    assert.equal(numbersIn('+1.23M and 295QaDc'), '+1.23M and 2.95e47');
});

test('the notation changes nothing stored: the log is written in letters and a save is the same whatever the setting', t => {
    t.after(() => setNotation('short'));
    const play = mode => {
        setNotation(mode);
        const game = new Game(null, T0);
        game.state.combat.bestStage = game.state.combat.maxStage = game.state.combat.stage = 900;
        game.state.prestige.runStartedAt = 0;
        game.recompute();
        assert.ok(game.prestige(), 'a prestige was made');
        return game;
    };
    const log = g => g.state.log.map(l => l.text).join('|');
    const inLetters = play('short');
    const inScience = play('scientific');
    assert.match(log(inLetters), /Prestige 1/, 'the prestige was logged');
    assert.equal(log(inScience), log(inLetters), 'the same words whatever the notation');
    assert.match(log(inScience), /tokens/);
    assert.doesNotMatch(log(inScience), /\d\.\d\de\d/);
});

test('old saves keep letters, a choice is kept, and the row opens once numbers pass a million', () => {
    const old = createDefaultState(T0);
    delete old.settings.numberFormat;
    assert.equal(migrateState(JSON.parse(JSON.stringify(old)), T0).settings.numberFormat, 'short');
    old.settings.numberFormat = 'roman';
    assert.equal(migrateState(JSON.parse(JSON.stringify(old)), T0).settings.numberFormat, 'short', 'a broken one is letters');
    old.settings.numberFormat = 'scientific';
    assert.equal(migrateState(JSON.parse(JSON.stringify(old)), T0).settings.numberFormat, 'scientific');
    const game = new Game(null, T0);
    assert.doesNotMatch(renderSettings(game, {}, null), /Big numbers/, 'not before there is a big number');
    game.state.gold = 1e6;
    game.tick(T0 + 100);
    const html = groupsOf(renderSettings(game, {}, null)).find(g => g.name === 'Reading').body;
    assert.match(html, /aria-label="Big numbers"/);
    assert.match(html, /class="seg-btn on" onclick="FI\.setOption\('numberFormat', 'short'\)" aria-pressed="true">Letters/);
    game.setOption('numberFormat', 'mixed');
    assert.equal(game.state.settings.numberFormat, 'mixed');
    game.setOption('numberFormat', 'nope');
    assert.equal(game.state.settings.numberFormat, 'short');
});

test('the text size: four sizes, today\'s the default, kept per device and not in the save', () => {
    assert.equal(textSizeOf(null), 100, 'nothing stored: today\'s size');
    assert.equal(textSizeOf('130'), 130);
    assert.equal(textSizeOf('9000'), 100, 'what the game does not offer is today\'s size');
    assert.deepEqual(TEXT_SIZES, [100, 115, 130, 150]);
    const game = new Game(null, T0);
    const reading = ui => groupsOf(renderSettings(game, ui, null)).find(g => g.name === 'Reading').body;
    assert.match(reading({}), /class="seg-btn on" onclick="FI\.setTextSize\('100'\)" aria-pressed="true">100%/);
    assert.match(reading({ textSize: 150 }), /class="seg-btn on" onclick="FI\.setTextSize\('150'\)" aria-pressed="true">150%/);
    assert.doesNotMatch(reading({}), /Big numbers/, 'the numbers\' row waits for the first million');
    assert.doesNotMatch(JSON.stringify(game.state.settings), /text/i);
});

test('lines for a screen reader come one at a time: never a flood, the ones that matter first, no line twice', () => {
    const heard = [];
    const a = createAnnouncer(line => heard.push(line));
    let at = 1000;
    const say = (text, important = true) => a.say(text, { important, now: at });
    say('Boss, stage 10: <b>Goblin King</b>');
    assert.equal(a.pump(at), 'Boss, stage 10: Goblin King', 'the first at once, in plain words');
    say('You fall back');
    assert.equal(a.pump(at + SAY_GAP_MS - 1), null, 'not sooner than the gap');
    assert.equal(a.pump(at + SAY_GAP_MS), 'You fall back');
    at += SAY_GAP_MS + 1;
    for (let i = 0; i < 40; i++) say(`A rare drop number ${i}`, false);
    say('Combat level 40');
    assert.equal(a.pump(at + SAY_GAP_MS), 'Combat level 40', 'what matters goes first');
    assert.equal(a.pump(at + SAY_GAP_MS + 100), null, 'and a routine line waits longer');
    let total = 0;
    for (let t = at; t < at + 60000; t += 100) if (a.pump(t)) total++;
    assert.ok(total <= SAY_QUEUE, `what waited is at most ${SAY_QUEUE} lines, not forty (${total})`);
    at += 60000;
    say('The same words');
    assert.equal(a.pump(at), 'The same words');
    at += SAY_ROUTINE_MS;
    say('The same words');
    assert.equal(a.pump(at), null, 'said a moment ago: not again');
    at += SAY_SAME_MS;
    say('The same words');
    assert.equal(a.pump(at), 'The same words', 'later, again');
    say('Old news'); a.clear();
    assert.equal(a.pump(at + 60000), null, 'what waited while the page was hidden is dropped');
    assert.equal(plainWords('<small>Boss &amp; friends</small><strong>The King&#39;s</strong> <span class="x">x</span>'), "Boss & friends The King's x");
});

test('the fight in words says where he is, both healths and what is going on', () => {
    const game = new Game(null, T0);
    const c = game.state.combat;
    assert.match(fightSummary(game), /^Stage 1, [A-Z][^.]+\. You: \d[\d,]* of \d[\d,]* health\. .+ health\. Not fighting\.$/);
    c.active = true;
    assert.doesNotMatch(fightSummary(game), /Not fighting/);
    c.stage = 5; c.maxStage = 9;
    assert.match(fightSummary(game), /^Stage 5, .+, best 9\. /);
    c.enemy = { ...c.enemy, name: 'Goblin King (Boss)', boss: true, hp: 1200, maxHp: 4000 }; c.bossTimeLeft = 41200;
    assert.match(fightSummary(game), /Goblin King \(Boss\): 1,200 of 4,000 health\. 42 seconds on its clock\.$/);
    c.regroupLeft = 30000;
    assert.match(fightSummary(game), /Regrouping: the boss in 30 seconds\.$/);
    c.active = false; c.recovering = true;
    assert.match(fightSummary(game), /Resting at the campfire\.$/);
});

test('Settings has a "?": what the game offers for access, with its page on the wiki', () => {
    const html = renderSettings(new Game(null, T0), {}, null);
    assert.match(html, /<h2>Options <button class="about-btn" onclick="event\.stopPropagation\(\); FI\.about\('accessibility'\)" aria-label="About Accessibility"/);
    const card = renderAboutCard('accessibility');
    for (const words of ['Reduce motion', 'Effects', 'Battery saver', 'Vibration', 'Blows heard', 'Text size', 'Big numbers', 'Keyboard shortcuts', 'The fight in words', 'pips']) assert.ok(card.includes(words), words);
    assert.equal(WIKI_PAGES.accessibility, '/accessibility');
});

test("on a phone each painting's landmark stays in view: the block tools/paint.py writes", () => {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    const block = css.slice(css.indexOf('/* paint:begin'), css.indexOf('/* paint:end */'));
    const narrow = block.slice(block.indexOf('@media (max-width: 600px) {'));
    assert.ok(narrow.length < block.length, 'a block for narrow screens');
    assert.match(narrow, /\.battle\[data-scene="meadow"\] \.battle-sky \{ background-position-x: 88%; \}/, 'the windmill');
    assert.match(narrow, /\.battle\[data-scene="ruins"\] \.battle-sky \{ background-position-x: 82%; \}/, 'the temple');
    assert.ok(block.indexOf('.battle[data-scene="meadow"] .battle-sky { background-image') < block.indexOf('@media (max-width: 600px)'), 'after the paintings, so it wins');
});

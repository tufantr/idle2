// Settings' options (docs/DESIGN.md §3.36): what each choice does, that a save without them is today's game, and that the
// panel stays easy to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { createDefaultState, migrateState } from '../src/core/state.js';
import { renderSettings } from '../src/ui/render.js';
import { createSound } from '../src/ui/sound.js';
import { vibrationOn } from '../src/data/settings.js';

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
    assert.deepEqual(groups.map(g => g.name), ['Sound', 'Motion', 'Keys and log']);
    const body = name => groups.find(g => g.name === name).body;
    assert.match(body('Sound'), /FI\.setSetting\('sound', this\.checked\)/);
    assert.match(body('Sound'), /FI\.setVolume/);
    assert.match(body('Motion'), /Reduce motion/);
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

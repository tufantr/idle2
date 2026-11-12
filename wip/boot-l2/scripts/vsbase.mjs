// The sliced replay (this worktree) against the replay of the code it started from (004babc, a copy in boot-l2-base):
// the same saves, the same absences, the same seeds; final saves, reports and events must be deep-equal.
// node vsbase.mjs <base root> <new root>
import assert from 'node:assert/strict';

const [baseRoot, newRoot] = process.argv.slice(2);
const T0 = 1_700_000_000_000;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

async function tree(root) {
    const { Game } = await import(`${root}/src/game.js`);
    const { rng, seededRandom } = await import(`${root}/src/core/rng.js`);
    const { xpForLevel } = await import(`${root}/src/core/xp.js`);
    const { generateEquipment } = await import(`${root}/src/core/formulas.js`);
    return { Game, rng, seededRandom, xpForLevel, generateEquipment };
}
const base = await tree(baseRoot);
const mine = await tree(newRoot);

function fighter(t, { auto, stage = 45, tokens = 300 }) {
    t.rng.setSource(t.seededRandom(11));
    const game = new t.Game(null, T0);
    const s = game.state;
    s.inventory.push(t.generateEquipment({ type: 'Weapon', tier: 3, power: 4.8, materialName: 'Mithril' }, 900));
    s.prestige.tokens = tokens; s.prestige.count = 6; s.prestige.firstAt = T0 - 5 * DAY;
    s.combat.bestStage = stage;
    s.skills.combat.xp = t.xpForLevel(30);
    s.resources.cooked_boar = 400;
    s.settings.autoPrestige = auto;
    game.recompute();
    game.equipItem(900);
    game.enterCombat();
    for (let x = T0 + 1000; x <= T0 + 3 * MIN; x += 1000) game.tick(x);
    return JSON.parse(game.serialize(game.now));
}
function miner(t) {
    t.rng.setSource(t.seededRandom(12));
    const game = new t.Game(null, T0);
    game.state.skills.mining.xp = t.xpForLevel(20);
    game.recompute();
    game.startNodeAction('mining', 'copper_ore');
    for (let x = T0 + 1000; x <= T0 + MIN; x += 1000) game.tick(x);
    return JSON.parse(game.serialize(game.now));
}
function dungeon(t) {
    t.rng.setSource(t.seededRandom(15));
    const game = new t.Game(null, T0);
    const s = game.state;
    s.combat.bestStage = 40; s.combat.maxStage = 40; s.prestige.tokens = 400;
    s.skills.combat.xp = t.xpForLevel(35);
    game.recompute();
    game.enterDungeon('goblin_warren');
    game.setDungeonRepeat(true);
    for (let x = T0 + 1000; x <= T0 + 2 * MIN; x += 1000) game.tick(x);
    return JSON.parse(game.serialize(game.now));
}

function resumeBase(raw, away) {
    base.rng.setSource(base.seededRandom(5));
    const now = raw.meta.savedAt + away;
    const game = new base.Game(structuredClone(raw), now);
    const summary = game.resumeFromSave(now);
    return { save: JSON.parse(game.serialize(now)), summary, events: game.drainEvents() };
}
function resumeMine(raw, away) {
    mine.rng.setSource(mine.seededRandom(5));
    const now = raw.meta.savedAt + away;
    const game = new mine.Game(structuredClone(raw), now);
    const run = game.beginResume(now);
    let slices = 0;
    while (!run.step(() => true)) slices++;
    return { save: JSON.parse(game.serialize(now)), summary: run.summary, events: game.drainEvents(), slices };
}
function gapBase(raw, away) {
    base.rng.setSource(base.seededRandom(6));
    const start = raw.meta.savedAt;
    const game = new base.Game(structuredClone(raw), start);
    game.resumeFromSave(start);
    for (let x = start + 1000; x <= start + 5000; x += 1000) game.tick(x);
    game.drainEvents();
    const now = game.now + away;
    const summary = game.tick(now);
    return { save: JSON.parse(game.serialize(now)), summary, events: game.drainEvents() };
}
function gapMine(raw, away) {
    mine.rng.setSource(mine.seededRandom(6));
    const start = raw.meta.savedAt;
    const game = new mine.Game(structuredClone(raw), start);
    game.resumeFromSave(start);
    for (let x = start + 1000; x <= start + 5000; x += 1000) game.tick(x);
    game.drainEvents();
    const now = game.now + away;
    const run = game.beginGap(now);
    while (!run.step(() => true));
    return { save: JSON.parse(game.serialize(now)), summary: run.summary, events: game.drainEvents() };
}

const cases = [
    ['fighter, Auto on', t => fighter(t, { auto: true }), [HOUR, DAY, 30 * HOUR]],
    ['fighter, Auto off', t => fighter(t, { auto: false }), [HOUR, DAY, 30 * HOUR]],
    ['deeper fighter, Auto on', t => fighter(t, { auto: true, stage: 120, tokens: 3000 }), [DAY]],
    ['miner', miner, [HOUR, 30 * HOUR]],
    ['dungeon on repeat', dungeon, [3 * HOUR]]
];
let compared = 0;
for (const [name, build, aways] of cases) {
    const rawBase = build(base);
    const rawMine = build(mine);
    assert.deepEqual(rawMine, rawBase, `${name}: the two trees build the same save`);
    for (const away of aways) {
        const t = performance.now();
        const a = resumeBase(rawBase, away);
        const b = resumeMine(rawMine, away);
        assert.deepEqual(b.save, a.save, `${name}, ${away / HOUR} h: save`);
        assert.deepEqual(b.summary, a.summary, `${name}, ${away / HOUR} h: summary`);
        assert.deepEqual(b.events, a.events, `${name}, ${away / HOUR} h: events`);
        compared++;
        console.log(`${name}, ${away / HOUR} h away: identical (${a.summary?.mode}, ${a.summary?.kills ?? 0} kills, ${a.summary?.prestiges ?? 0} prestiges, ${b.slices} slices; ${Math.round(performance.now() - t)} ms)`);
    }
    if (name.startsWith('fighter, Auto on')) {
        for (const away of [2 * HOUR, 30 * HOUR]) {
            const a = gapBase(rawBase, away);
            const b = gapMine(rawMine, away);
            assert.deepEqual(b.save, a.save, `${name}, gap ${away / HOUR} h: save`);
            assert.deepEqual(b.summary, a.summary, `${name}, gap ${away / HOUR} h: summary`);
            assert.deepEqual(b.events, a.events, `${name}, gap ${away / HOUR} h: events`);
            compared++;
            console.log(`${name}, a gap of ${away / HOUR} h in a running tab: identical (${a.summary?.kills} kills, ${a.summary?.prestiges} prestiges)`);
        }
    }
}
console.log(`all ${compared} identical`);

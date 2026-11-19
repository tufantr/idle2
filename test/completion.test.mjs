// Completion (DESIGN §3.14): eleven parts of equal weight, each its share done, as one percentage in the Hall.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { xpForLevel, levelForXp, MAX_LEVEL } from '../src/core/xp.js';
import { seededRandom } from '../src/core/rng.js';
import { completion, COMPLETION_WHOLE } from '../src/systems/completion.js';
import { SKILL_IDS } from '../src/data/skills.js';
import { MASTERY_SKILLS, MASTERY_MAX_LEVEL, MASTERY_XP_DIVISOR, masteryActions, masteryShare } from '../src/data/mastery.js';
import { BESTIARY_NAMES, BESTIARY_MAX_STARS, bestiaryStars } from '../src/data/bestiary.js';
import { CODEX_TYPES, CODEX_SIZE, GEAR_TIERS } from '../src/data/items.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { PETS } from '../src/data/pets.js';
import { UNIQUES, TITAN_LATE_FROM } from '../src/data/dungeons.js';
import { TRIALS, TRIAL_TIERS, trialTiersCleared } from '../src/data/trials.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';
import { EVENTS } from '../src/data/events.js';
import { FESTIVAL_CLOAKS, festivalCloaksOwned } from '../src/data/capes.js';

const T0 = 1_700_000_000_000;

test('a new hero has done next to nothing, and every part is counted', () => {
    const c = completion(new Game(null, T0).state);
    assert.equal(c.parts.length, 11);
    for (const p of c.parts) assert.ok(p.of > 0 && p.have >= 0 && p.have <= p.of, p.id);
    assert.ok(c.share > 0 && c.share < 0.01);
});

/** A hero who has done everything the game holds today. */
function everything() {
    const game = new Game(null, T0);
    const s = game.state;
    for (const id of SKILL_IDS) s.skills[id].xp = xpForLevel(99);
    for (const id of MASTERY_SKILLS) for (const a of masteryActions(id)) s.mastery[id][a.key] = xpForLevel(MASTERY_MAX_LEVEL) / MASTERY_XP_DIVISOR;
    for (const name of BESTIARY_NAMES) s.stats.killsByMonster[name] = 1000;
    for (const type of CODEX_TYPES) for (let tier = 1; tier <= GEAR_TIERS.length; tier++) s.codex[`${type}/${tier}`] = true;
    for (const a of ACHIEVEMENTS) s.achievements[a.id] = T0;
    for (const p of PETS) s.pets[p.id] = T0;
    Object.values(UNIQUES).forEach((u, i) => s.inventory.push({ id: 900 + i, type: u.type, tier: u.tier, uniqueId: u.id, atk: 0, def: 0, affixes: [] }));
    s.titan.kills = TITAN_LATE_FROM + 7;
    for (const t of TRIALS) s.trials.cleared[t.id] = TRIAL_TIERS;
    s.agility.built = AGILITY_SLOTS.map(slot => slot.obstacles[0].id);
    for (const e of EVENTS) s.events.cloaks[e.id] = true;
    return s;
}

test('everything done is 100%, and each thing done moves it up', () => {
    const game = new Game(null, T0);
    const s = game.state;
    let last = completion(s).share;
    const rises = (what) => { const now = completion(s).share; assert.ok(now > last, what); last = now; };
    for (const id of SKILL_IDS) s.skills[id].xp = xpForLevel(99);
    rises('skills');
    for (const id of MASTERY_SKILLS) for (const a of masteryActions(id)) s.mastery[id][a.key] = xpForLevel(MASTERY_MAX_LEVEL) / MASTERY_XP_DIVISOR;
    rises('mastery');
    for (const name of BESTIARY_NAMES) s.stats.killsByMonster[name] = 1000;
    rises('bestiary');
    for (const type of CODEX_TYPES) for (let tier = 1; tier <= GEAR_TIERS.length; tier++) s.codex[`${type}/${tier}`] = true;
    rises('codex');
    for (const a of ACHIEVEMENTS) s.achievements[a.id] = T0;
    rises('medals');
    for (const p of PETS) s.pets[p.id] = T0;
    rises('pets');
    Object.values(UNIQUES).forEach((u, i) => s.inventory.push({ id: 900 + i, type: u.type, tier: u.tier, uniqueId: u.id, atk: 0, def: 0, affixes: [] }));
    rises('uniques');
    s.titan.kills = TITAN_LATE_FROM + 7;   // past the first twenty counts no further
    rises('titans');
    for (const t of TRIALS) s.trials.cleared[t.id] = TRIAL_TIERS;
    rises('trials');
    s.agility.built = AGILITY_SLOTS.map(slot => slot.obstacles[0].id);
    rises('course');
    for (const e of EVENTS) s.events.cloaks[e.id] = true;
    const c = completion(s);
    assert.equal(c.share, 1);
    for (const p of c.parts) assert.equal(p.share, 1, p.id);
    assert.deepEqual(completion(everything()), c, 'the same hero, built the same way');
});

// ---------- the wholes fixed at today's game (the owner, 12 November 2026: 100% is everything in the game today) ----------

// The formula before the wholes were fixed: each part divided by its own content's size, the Trials' rungs counted too.
const oldHeld = state => new Set([...Object.keys(state.uniques || {}), ...[...(state.inventory || []), ...Object.values(state.equipped || {})].filter(i => i?.uniqueId && !(i.uniqueTier > 1)).map(i => i.uniqueId)]);
function oldCompletion(state) {
    const masteryMost = MASTERY_SKILLS.reduce((n, id) => n + masteryActions(id).length * (MASTERY_MAX_LEVEL - 1), 0);
    const masteryHave = MASTERY_SKILLS.reduce((n, id) => n + Math.round(masteryShare(state, id) * masteryActions(id).length * (MASTERY_MAX_LEVEL - 1)), 0);
    const parts = [
        { id: 'skills', have: SKILL_IDS.reduce((n, id) => n + Math.min(MAX_LEVEL, levelForXp(state.skills[id]?.xp || 0)), 0), of: SKILL_IDS.length * MAX_LEVEL },
        { id: 'mastery', have: masteryHave, of: masteryMost },
        { id: 'bestiary', have: bestiaryStars(state.stats?.killsByMonster || {}), of: BESTIARY_MAX_STARS },
        { id: 'codex', have: Object.keys(state.codex || {}).length, of: CODEX_SIZE },
        { id: 'medals', have: ACHIEVEMENTS.filter(a => state.achievements?.[a.id]).length, of: ACHIEVEMENTS.length },
        { id: 'pets', have: PETS.filter(p => state.pets?.[p.id]).length, of: PETS.length },
        { id: 'uniques', have: [...oldHeld(state)].filter(id => UNIQUES[id]).length, of: Object.keys(UNIQUES).length },
        { id: 'titans', have: Math.min(TITAN_LATE_FROM, state.titan?.kills || 0), of: TITAN_LATE_FROM },
        { id: 'trials', have: trialTiersCleared(state), of: TRIALS.length * TRIAL_TIERS },
        { id: 'course', have: (state.agility?.built || []).filter(Boolean).length, of: AGILITY_SLOTS.length },
        { id: 'cloaks', have: festivalCloaksOwned(state).length, of: FESTIVAL_CLOAKS.length }
    ].map(p => ({ ...p, have: Math.min(p.have, p.of), share: p.of ? Math.min(1, p.have / p.of) : 0 }));
    return { parts, share: parts.reduce((sum, p) => sum + p.share, 0) / parts.length };
}

test('each part\'s whole is today\'s game, fixed, and today\'s game still fills every one', () => {
    assert.deepEqual({ ...COMPLETION_WHOLE }, { skills: 1089, mastery: 9408, bestiary: 549, codex: 70, medals: 51, pets: 12, uniques: 8, titans: 20, trials: 40, course: 6, cloaks: 6 });
    const parts = Object.fromEntries(completion(new Game(null, T0).state).parts.map(p => [p.id, p.of]));
    assert.deepEqual(parts, { ...COMPLETION_WHOLE }, 'each part out of its fixed whole');
    // 100% stays within reach: the content may grow, never shrink below a whole
    const content = {
        skills: SKILL_IDS.length * MAX_LEVEL, mastery: MASTERY_SKILLS.reduce((n, id) => n + masteryActions(id).length * (MASTERY_MAX_LEVEL - 1), 0),
        bestiary: BESTIARY_MAX_STARS, codex: CODEX_SIZE, medals: ACHIEVEMENTS.filter(a => !a.secret).length, pets: PETS.length,
        uniques: Object.keys(UNIQUES).length, titans: TITAN_LATE_FROM, trials: TRIALS.length * TRIAL_TIERS, course: AGILITY_SLOTS.length, cloaks: FESTIVAL_CLOAKS.length
    };
    for (const [id, whole] of Object.entries(COMPLETION_WHOLE)) assert.ok(content[id] >= whole, `${id}: ${content[id]} in the game, ${whole} to fill`);
    assert.equal(completion(everything()).share, 1);
});

test('a secret medal is never needed for the medals\' part, but one held counts toward it, capped', () => {
    const s = new Game(null, T0).state;
    const secret = ACHIEVEMENTS.filter(a => a.secret);
    const open = ACHIEVEMENTS.filter(a => !a.secret);
    assert.equal(secret.length, 3);
    const medals = () => completion(s).parts.find(p => p.id === 'medals');
    for (const a of open) s.achievements[a.id] = T0;
    assert.deepEqual([medals().have, medals().of, medals().share], [51, 51, 1], 'every open medal: the part is full without a secret one');
    delete s.achievements[open[0].id];
    delete s.achievements[open[1].id];
    s.achievements[secret[0].id] = T0;
    assert.equal(medals().have, 50, 'a secret medal held stands in for an open one');
    for (const a of ACHIEVEMENTS) s.achievements[a.id] = T0;
    assert.deepEqual([medals().have, medals().share], [51, 1], 'all 54: capped at the whole');
});

test('the Trials\' part counts each Trial\'s tiers cleared, not its rungs: a deep hero no longer fills it with Trials untried', () => {
    const s = new Game(null, T0).state;
    const trials = () => completion(s).parts.find(p => p.id === 'trials');
    Object.assign(s.trials.cleared, { brutes: 17, rusted: 15, swift_bosses: 12 });   // three Trials far up their ladders, five never cleared
    assert.deepEqual([trials().have, trials().of], [3 * TRIAL_TIERS, 40]);
    // the old formula counted 44 tiers and rungs against 40: the part was full with five Trials never cleared
    assert.equal(oldCompletion(s).parts.find(p => p.id === 'trials').share, 1);
    for (const t of TRIALS) s.trials.cleared[t.id] = Math.max(s.trials.cleared[t.id] || 0, TRIAL_TIERS);
    assert.equal(trials().share, 1, 'every Trial\'s five tiers: full');
});

/** A hero part way through everything, at random (some Trials up their ladders, past their five tiers). */
function randomHero(random) {
    const s = new Game(null, T0).state;
    const some = p => random() < p;
    for (const id of SKILL_IDS) s.skills[id].xp = xpForLevel(1 + Math.floor(random() ** 2 * 110));
    for (const id of MASTERY_SKILLS) for (const a of masteryActions(id)) if (some(0.5)) s.mastery[id][a.key] = xpForLevel(1 + Math.floor(random() * 99)) / MASTERY_XP_DIVISOR;
    for (const name of BESTIARY_NAMES) if (some(0.6)) s.stats.killsByMonster[name] = Math.floor(10 ** (random() * 3.5));
    for (const type of CODEX_TYPES) for (let tier = 1; tier <= GEAR_TIERS.length; tier++) if (some(0.4)) s.codex[`${type}/${tier}`] = true;
    for (const a of ACHIEVEMENTS) if (some(0.6)) s.achievements[a.id] = T0;
    for (const p of PETS) if (some(0.4)) s.pets[p.id] = T0;
    for (const u of Object.values(UNIQUES)) if (some(0.5)) s.uniques[u.id] = true;
    s.titan.kills = Math.floor(random() * 30);
    const ladder = some(0.5);   // half of them deep, with rungs
    for (const t of TRIALS) if (some(0.6)) s.trials.cleared[t.id] = Math.floor(random() * (ladder ? 14 : TRIAL_TIERS + 1));
    s.agility.built = AGILITY_SLOTS.map(slot => (some(0.5) ? slot.obstacles[0].id : null));
    for (const e of EVENTS) if (some(0.3)) s.events.cloaks[e.id] = true;
    return s;
}

test('no hero\'s figure falls against the old formula, but where the old one counted a Trial\'s rungs', () => {
    const random = seededRandom(46);
    // the saves the tests make, and three hundred heroes part way through
    const heroes = [new Game(null, T0).state, everything(), ...Array.from({ length: 300 }, () => randomHero(random))];
    let lower = 0, rungHeroes = 0;
    for (const s of heroes) {
        const now = completion(s), was = oldCompletion(s);
        const rungs = TRIALS.some(t => (s.trials.cleared[t.id] || 0) > TRIAL_TIERS);
        rungHeroes += rungs ? 1 : 0;
        for (const [i, part] of now.parts.entries()) {
            const old = was.parts[i];
            assert.equal(part.id, old.id);
            if (part.id === 'trials' && rungs) assert.ok(part.share <= old.share, 'the rungs no longer count');
            else assert.ok(part.share >= old.share - 1e-12, `${part.id}: ${part.share} against ${old.share}`);
            if (part.id === 'medals') assert.ok(part.share >= old.share, 'out of 51, not 54');
        }
        if (now.share < was.share - 1e-12) {
            lower++;
            assert.ok(rungs, 'a lower figure only where the old one counted rungs');
        }
    }
    assert.ok(rungHeroes > 50 && lower > 0, `${lower} of ${rungHeroes} heroes with rungs read lower: the old figure overcounted them`);
});

test('new content fills a part but never lowers the figure: a medal, a pet, a unique, a Trial, a slot or a festival', () => {
    const random = seededRandom(7);
    const heroes = [everything(), ...Array.from({ length: 40 }, () => randomHero(random))];
    const before = heroes.map(s => completion(s).share);
    // what an update might bring, added to the game's own lists for this test only
    const added = [
        [ACHIEVEMENTS, { id: 'new_medal', name: 'New', desc: '', req: { type: 'stat', key: 'kills', value: 1 }, reward: '', mods: {} }],
        [PETS, { id: 'new_pet', name: 'New', skill: 'mining', mods: {} }],
        [TRIALS, { id: 'new_trial', name: 'New', rule: 'New.', bite: {}, first: 300, heat: 1 }],
        [AGILITY_SLOTS, { level: 99, obstacles: [{ id: 'new_obstacle', name: 'New', interval: 1000, xp: 1, mods: {} }] }],
        [FESTIVAL_CLOAKS, { skill: 'fest_new', event: 'new_event', name: 'New cloak', perk: '' }]
    ];
    UNIQUES.new_unique = { id: 'new_unique', name: 'New', type: 'Ring', tier: 1 };
    for (const [list, entry] of added) list.push(entry);
    try {
        heroes.forEach((s, i) => assert.ok(completion(s).share >= before[i] - 1e-12, `hero ${i}: ${completion(s).share} against ${before[i]}`));
        assert.equal(completion(heroes[0]).share, 1, 'a hero who had everything still has 100%');
        assert.ok(oldCompletion(heroes[0]).share < 1, 'where the old formula took points off him');
        // and the new things, once had, fill a part not yet full
        const s = heroes[1];
        const pets = completion(s).parts.find(p => p.id === 'pets').have;
        s.pets.new_pet = T0;
        assert.equal(completion(s).parts.find(p => p.id === 'pets').have, Math.min(COMPLETION_WHOLE.pets, pets + 1));
    } finally {
        for (const [list] of added) list.pop();
        delete UNIQUES.new_unique;
    }
});

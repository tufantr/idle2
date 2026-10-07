// Completion (DESIGN §3.14): ten parts of equal weight, each its share done, as one percentage in the Hall.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { xpForLevel } from '../src/core/xp.js';
import { completion } from '../src/systems/completion.js';
import { SKILL_IDS } from '../src/data/skills.js';
import { MASTERY_SKILLS, MASTERY_MAX_LEVEL, MASTERY_XP_DIVISOR, masteryActions } from '../src/data/mastery.js';
import { BESTIARY_NAMES } from '../src/data/bestiary.js';
import { CODEX_TYPES, GEAR_TIERS } from '../src/data/items.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { PETS } from '../src/data/pets.js';
import { UNIQUES, TITAN_LATE_FROM } from '../src/data/dungeons.js';
import { TRIALS, TRIAL_TIERS } from '../src/data/trials.js';
import { AGILITY_SLOTS } from '../src/data/agility.js';

const T0 = 1_700_000_000_000;

test('a new hero has done next to nothing, and every part is counted', () => {
    const c = completion(new Game(null, T0).state);
    assert.equal(c.parts.length, 10);
    for (const p of c.parts) assert.ok(p.of > 0 && p.have >= 0 && p.have <= p.of, p.id);
    assert.ok(c.share > 0 && c.share < 0.01);
});

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
    const c = completion(s);
    assert.equal(c.share, 1);
    for (const p of c.parts) assert.equal(p.share, 1, p.id);
});

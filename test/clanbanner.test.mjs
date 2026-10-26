// The clan banner (the owner, October 2026; DESIGN §3.18): each level of the week's boss the clan fells raises it for
// every member, fought or not, until the week ends. It multiplies attack, defence and health, away from the boards
// and the clan boss's own fight; the boss is counted in the clan's attacks, a fifth more each level.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { Game } from '../src/game.js';
import { clanBannerMult } from '../src/core/modifiers.js';
import { powerSummary } from '../src/core/power.js';
import { migrateState } from '../src/core/state.js';
import { CLAN_BANNER, CLAN_BOSS, clanBossHealth, isoWeek } from '../src/data/social.js';

const T0 = Date.UTC(2026, 9, 14, 12);   // a Wednesday of ISO week 2026-W42
const require = createRequire(import.meta.url);

test('the banner: ×1.5 at the first kill, a quarter more each level after, three at seven', () => {
    assert.deepEqual(CLAN_BANNER, [1, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3]);
    assert.equal(CLAN_BANNER.length - 1, CLAN_BOSS.levels);
    // the boss: twenty attacks of an average member at level 1, a fifth more each level (thousandths of an attack, as the server keeps it)
    assert.deepEqual([1, 2, 7].map(clanBossHealth), [20000, 24000, 59720]);
});

test('the week is the server\'s: the game and the API count it alike', () => {
    process.env.JWT_SECRET ||= 'test-secret';
    const api = require('../api/index.js');
    for (const at of [T0, Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31, 23), Date.UTC(2027, 0, 4)]) assert.equal(isoWeek(at), api.isoWeek(at));
    assert.equal(isoWeek(T0), '2026-W42');
});

test('this week\'s banner multiplies attack, defence and health; another week\'s or none, nothing', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.meta.lastActiveAt = T0;
    s.equipped.Weapon = { id: 901, type: 'Weapon', tier: 7, name: 'Sword', rarity: 'common', atk: 1e6, def: 0, affixes: [], upgrade: 0 };
    s.equipped.Body = { id: 902, type: 'Body', tier: 7, name: 'Plate', rarity: 'common', atk: 0, def: 1e6, affixes: [], upgrade: 0 };
    game.recompute();
    const bare = { ...game.derived };
    s.clanBanner = { week: '2026-W42', kills: 2 };
    game.recompute();
    assert.equal(clanBannerMult(s), 1.75);
    for (const k of ['atk', 'def', 'maxHp']) assert.ok(Math.abs(game.derived[k] / bare[k] - 1.75) < 0.001, `${k} ×1.75: ${bare[k]} → ${game.derived[k]}`);
    assert.equal(game.derived.clanBanner, 1.75);
    s.clanBanner = { week: '2026-W41', kills: 7 };
    assert.equal(clanBannerMult(s), 1, 'last week\'s banner is down');
    // the boards and the clan boss leave it out
    s.clanBanner = { week: '2026-W42', kills: 7 };
    const withBanner = powerSummary(JSON.parse(game.serialize(T0)), T0);
    s.clanBanner = { week: '', kills: 0 };
    const without = powerSummary(JSON.parse(game.serialize(T0)), T0);
    assert.equal(withBanner.dps, without.dps);
    assert.equal(withBanner.attackDamage, without.attackDamage);
    s.combat.mode = 'clan';
    s.clanBanner = { week: '2026-W42', kills: 7 };
    game.recompute();
    assert.equal(game.derived.clanBanner, 1, 'not in the clan boss\'s own fight');
});

test('the server\'s word on the banner: kept in the save, said once as it rises', () => {
    const game = new Game(null, T0);
    game.drainEvents();
    assert.equal(game.setClanBanner({ week: '2026-W42', kills: 1 }), true);
    assert.deepEqual(game.drainEvents().filter(e => e.type === 'clanBanner').map(e => [e.kills, e.mult, e.next]), [[1, 1.5, 1.75]]);
    assert.equal(game.setClanBanner({ week: '2026-W42', kills: 1 }), false, 'the same word: nothing');
    game.setClanBanner({ week: '2026-W42', kills: 3 });
    assert.deepEqual(game.drainEvents().filter(e => e.type === 'clanBanner').map(e => e.kills), [3]);
    game.setClanBanner(null);   // out of the clan: down
    assert.deepEqual(game.state.clanBanner, { week: '', kills: 0 });
    assert.equal(game.drainEvents().filter(e => e.type === 'clanBanner').length, 0, 'a banner taken down says nothing');
    // a save keeps it; a forged one is cleaned
    game.setClanBanner({ week: '2026-W42', kills: 4 });
    assert.deepEqual(migrateState(JSON.parse(game.serialize(T0)), T0).clanBanner, { week: '2026-W42', kills: 4 });
    const forged = JSON.parse(game.serialize(T0));
    forged.clanBanner = { week: 'soon', kills: 99 };
    assert.deepEqual(migrateState(forged, T0).clanBanner, { week: '', kills: 0 });
    forged.clanBanner = { week: '2026-W42', kills: 99 };
    assert.equal(migrateState(forged, T0).clanBanner.kills, CLAN_BANNER.length - 1);
});

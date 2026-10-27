// Charms (DESIGN §3.34): kits with charges bought with essence, each opening as its skill meets what it eases, a charge
// spent each time one bites: Gem Gloves (a gem every rock), Furnace Bellows (bars without coal), Chef's Gloves (dishes
// double), the Compost Sack (harvests half again). Kept through prestige, mirrored in `meta` against older pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { migrateState } from '../src/core/state.js';
import { xpForLevel } from '../src/core/xp.js';
import { CHARMS, COMPOST_YIELD, CHARM_TOKEN_COST, charmById, chargesMax } from '../src/data/charms.js';
import { EVENTS } from '../src/data/events.js';
import { eventStatus } from '../src/systems/events.js';
import { charmsOnOffer, charmCharges } from '../src/systems/charms.js';
import { completeAction, resolveAction, canComplete } from '../src/systems/skilling.js';
import { harvest } from '../src/systems/farming.js';
import { seen } from '../src/systems/disclosure.js';
import { RESOURCES } from '../src/data/resources.js';
import { SPRITES } from '../src/data/sprites.js';

const T0 = 1_760_000_000_000;

/** A hero who has met every charm's bottleneck, with essence to spend. */
function crafter() {
    rng.setSource(seededRandom(5));
    const game = new Game(null, T0);
    const s = game.state;
    for (const id of ['mining', 'cooking', 'farming', 'smithing', 'crafting']) s.skills[id].xp = xpForLevel(80);
    s.unlocks.crafting = true;
    s.forge.Weapon.level = 12;
    s.resources.essence = 100000;
    game.recompute();
    return game;
}

/** One action of `kind` done at once (systems/skilling.js completeAction). */
function work(game, action) {
    game.state.action = { ...action, progress: 0 };
    const def = resolveAction(game.state);
    return completeAction(game, def);
}

test('each charm opens as its skill meets what it eases, and is bought with essence: charges that stack, up to a hundred purchases', () => {
    const fresh = new Game(null, T0);
    assert.deepEqual(charmsOnOffer(fresh.state), []);
    fresh.tick(T0 + 1000);
    assert.equal(seen(fresh.state, 'charms'), false);
    const game = crafter();
    assert.deepEqual(charmsOnOffer(game.state).map(c => c.id), CHARMS.map(c => c.id));
    game.tick(T0 + 1000);
    assert.equal(seen(game.state, 'charms'), true);
    // Gem Gloves wait for Crafting to open; Bellows for a forge slot past +10
    const s = game.state;
    s.unlocks.crafting = false;
    s.forge.Weapon.level = 10;
    assert.deepEqual(charmsOnOffer(s).map(c => c.id), ['chef_gloves', 'compost_sack']);
    s.unlocks.crafting = true;
    s.forge.Weapon.level = 12;
    // buying: the essence, the charges, stacking
    const charm = charmById('gem_gloves');
    assert.equal(game.buyCharm('gem_gloves'), true);
    assert.equal(s.resources.essence, 100000 - charm.essence);
    assert.equal(charmCharges(s, 'gem_gloves'), charm.charges);
    game.buyCharm('gem_gloves');
    assert.equal(charmCharges(s, 'gem_gloves'), 2 * charm.charges);
    assert.deepEqual(s.meta.charms, s.charms, 'mirrored for older pages');
    s.resources.essence = charm.essence - 1;
    assert.equal(game.buyCharm('gem_gloves'), false);
    assert.match(game.drainEvents().filter(e => e.type === 'error').pop().text, /essence/);
    s.resources.essence = 1e9;
    s.charms.gem_gloves = chargesMax(charm) - charm.charges + 1;
    assert.equal(game.buyCharm('gem_gloves'), false, 'a hundred purchases at most');
    assert.equal(game.buyCharm('nonsense'), false);
});

test('Gem Gloves: a gem with every rock while they last, then the chance as before', () => {
    const game = crafter();
    const s = game.state;
    s.charms.gem_gloves = 3;
    const gems = () => Object.keys(RESOURCES).filter(id => RESOURCES[id].category === 'gem').reduce((n, id) => n + (s.resources[id] || 0), 0);
    rng.setSource(() => 0.99);   // no gem by chance, no double
    const before = gems();
    for (let i = 0; i < 5; i++) work(game, { kind: 'node', skill: 'mining', id: 'iron_ore' });
    assert.equal(gems() - before, 3);
    assert.equal(charmCharges(s, 'gem_gloves'), 0);
    assert.ok(game.drainEvents().some(e => e.type === 'charmEmpty' && e.id === 'gem_gloves'));
});

test('Furnace Bellows: bars smelt without coal while they have charges, and a bar that took no coal spends none', () => {
    const game = crafter();
    const s = game.state;
    rng.setSource(() => 0.99);   // no mastery saving, no double
    Object.assign(s.resources, { runite_ore: 10, coal: 0, copper_ore: 5 });
    s.charms.furnace_bellows = 2;
    const runite = { kind: 'smelt', id: 'runite_bar' };
    s.action = { ...runite, progress: 0 };
    assert.equal(canComplete(s, resolveAction(s)).ok, true, 'no coal needed');
    assert.equal(work(game, runite), true);
    assert.equal(s.resources.runite_bar, 1);
    assert.equal(s.resources.coal, 0);
    assert.equal(charmCharges(s, 'furnace_bellows'), 1);
    // copper takes no coal: no charge
    work(game, { kind: 'smelt', id: 'copper_bar' });
    assert.equal(charmCharges(s, 'furnace_bellows'), 1);
    work(game, runite);
    assert.equal(charmCharges(s, 'furnace_bellows'), 0);
    // spent: coal again
    assert.equal(work(game, runite), false);
    s.resources.coal = 3;
    assert.equal(work(game, runite), true);
    assert.equal(s.resources.coal, 0);
});

test("Chef's Gloves double every dish, and the Compost Sack a harvest half again", () => {
    const game = crafter();
    const s = game.state;
    rng.setSource(() => 0.99);
    Object.assign(s.resources, { raw_shark: 5, magic_log: 5 });
    s.charms.chef_gloves = 1;
    const shark = { kind: 'node', skill: 'cooking', id: 'cooked_shark' };
    work(game, shark);
    assert.equal(s.resources.cooked_shark, 2);
    work(game, shark);
    assert.equal(s.resources.cooked_shark, 3, 'the gloves are spent');
    // a harvest: half again with compost
    const plot = s.farming.plots[0];
    const ready = crop => Object.assign(plot, { crop, plantedAt: T0 - 1e9, readyAt: T0 - 1 });
    rng.setSource(() => 0);   // the crop's lowest yield, no double (chance(0) is never true at 0)
    ready('potato');
    const plain = harvest(game, 0);
    s.charms.compost_sack = 1;
    ready('potato');
    assert.equal(harvest(game, 0), Math.round(plain * COMPOST_YIELD));
    assert.equal(charmCharges(s, 'compost_sack'), 0);
});

test('charges stay through a prestige, and saves keep them (from `meta` when an older page dropped them)', () => {
    const game = crafter();
    const s = game.state;
    s.charms = { gem_gloves: 120, compost_sack: 4 };
    s.meta.charms = { ...s.charms };
    Object.assign(s.combat, { bestStage: 60, maxStage: 60, stage: 60 });
    s.prestige.runStartedAt = 0;
    assert.equal(game.prestige(), true);
    assert.deepEqual(s.charms, { gem_gloves: 120, compost_sack: 4 });
    const raw = JSON.parse(game.serialize(T0));
    assert.deepEqual(migrateState(raw, T0).charms, { gem_gloves: 120, compost_sack: 4 });
    delete raw.charms;   // an older page saved: it didn't know `charms`
    assert.deepEqual(migrateState(raw, T0).charms, { gem_gloves: 120, compost_sack: 4 });
    raw.charms = { gem_gloves: 1e12, chef_gloves: -4, compost_sack: '2.6', nonsense: 9 };
    assert.deepEqual(migrateState(raw, T0).charms, { gem_gloves: chargesMax(charmById('gem_gloves')), compost_sack: 2 });
    // and the War Tree's ranks, the same way
    const tal = JSON.parse(game.serialize(T0));
    tal.skills.combat.xp = 1e8;
    tal.talents = { ranks: { patient_hunter: 3 }, respecs: 1 };
    tal.meta.talents = { ranks: { patient_hunter: 3 }, respecs: 1 };
    delete tal.talents;
    assert.deepEqual(migrateState(tal, T0).talents, { ranks: { patient_hunter: 3 }, respecs: 1 });
});

test('a weekend event sells the charms opened for Festival Tokens', () => {
    const game = crafter();
    const s = game.state;
    s.charms = {};
    s.events.tokens = CHARM_TOKEN_COST * 2 - 1;
    s.settings.forceEvent = null;
    if (!eventStatus(s, game.now).active) assert.equal(game.buyEventCharm('chef_gloves'), false, 'no event: the shop is shut');
    s.settings.forceEvent = EVENTS[0].id;
    assert.equal(eventStatus(s, game.now).active, true);
    assert.equal(game.buyEventCharm('chef_gloves'), true);
    assert.equal(s.events.tokens, CHARM_TOKEN_COST - 1);
    assert.equal(charmCharges(s, 'chef_gloves'), charmById('chef_gloves').charges);
    assert.equal(game.buyEventCharm('chef_gloves'), false, 'too few tokens');
    // a charm not yet opened isn't for sale
    s.events.tokens = 1000;
    s.forge.Weapon.level = 0;
    assert.equal(game.buyEventCharm('furnace_bellows'), false);
});

test('the charms data hangs together', () => {
    const skills = new Set();
    for (const c of CHARMS) {
        assert.match(c.id, /^[a-z_]+$/);
        assert.ok(!skills.has(c.skill), `one charm a skill: ${c.skill}`); skills.add(c.skill);
        assert.ok(c.charges > 0 && c.essence > 0 && c.does.endsWith('.') && c.name, c.id);
        assert.ok(SPRITES[c.icon] && SPRITES[c.badge], c.id);
        assert.equal(typeof c.opens, 'function');
    }
});

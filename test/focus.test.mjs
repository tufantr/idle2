// Focus at attack speed's cap (core/modifiers.js BASE.focusCapDamage; a player's point, November 2026): Focus's attack
// speed comes after every other bonus, and the part of it the cap leaves unused adds as much damage. Below the cap
// nothing changes; the clan fight and the server, which count no Focus, are unchanged.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { BASE, deriveStats } from '../src/core/modifiers.js';
import { generateEquipment } from '../src/core/formulas.js';
import { GEAR_TIERS, RARITIES } from '../src/data/items.js';
import { expectedDps, plainAttack, powerSummary } from '../src/core/power.js';
import { renderHeader, renderInventory, renderItemDetail, focusTip } from '../src/ui/render.js';
import { escapeHtml } from '../src/ui/format.js';

rng.setSource(seededRandom(4242));
const T0 = 1_760_000_000_000;
const MIN = 60_000;
const CAP_SWING = Math.round(BASE.baseAttackInterval / (1 + BASE.caps.attackSpeed));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

let nextId = 900;
function piece(type, speed) {
    const id = nextId++;
    return Object.assign(generateEquipment({ type, tier: 1, power: GEAR_TIERS[0].power, materialName: GEAR_TIERS[0].name, rarity: RARITIES[0], source: 'drop' }, id),
        { affixes: [{ stat: 'attackSpeed', name: 'Attack Speed', value: speed }] });
}

/** A hero whose attack speed bonuses come to `speeds` (one piece each) without Focus, with a big attack so rounding is nothing. */
function hero(...speeds) {
    const game = new Game(null, T0);
    const s = game.state;
    s.prestige.tokens = 1e7;
    const types = ['Weapon', 'Gloves', 'Boots'];
    const ids = speeds.map((speed, i) => { const p = piece(types[i], speed); s.inventory.push(p); return p.id; });
    for (const id of ids) game.equipItem(id);
    game.recompute();
    return { game, ids };
}
const focused = game => { game.state.meta.lastInputAt = game.now - 10 * MIN; game.recompute(); return game.derived; };
const unfocused = game => { game.state.meta.lastInputAt = game.now; game.recompute(); return game.derived; };

test('Focus below the cap: +15% attack speed and no damage, as before', () => {
    const { game } = hero(0.5);
    const u = unfocused(game);
    assert.ok(near(u.attackSpeedBonus, 0.5));
    assert.equal(u.focusSpeed, 0);
    assert.equal(u.focusDamage, 0);
    const f = focused(game);
    assert.ok(f.focused);
    assert.equal(f.attackInterval, Math.round(BASE.baseAttackInterval / 1.65), 'the swing gets Focus\'s speed');
    assert.ok(near(f.focusSpeed, BASE.focusAttackSpeed));
    assert.equal(f.focusDamage, 0);
    assert.equal(f.atk, u.atk, 'no damage below the cap');
    assert.ok(near(f.attackSpeedBonus, 0.5), 'the bonuses the cap marks judge leave Focus out');
});

test('Focus at the cap: the swing stays at the cap, and Focus\'s +15% is damage instead', () => {
    const { game } = hero(1.0);
    const u = unfocused(game);
    const f = focused(game);
    assert.equal(u.attackInterval, CAP_SWING);
    assert.equal(f.attackInterval, CAP_SWING, 'no faster than the cap');
    assert.ok(near(f.focusSpeed, 0));
    assert.ok(near(f.focusDamage, BASE.focusAttackSpeed));
    assert.ok(near(f.atk / u.atk, 1 + BASE.focusAttackSpeed, 1e-6), `×${(f.atk / u.atk).toFixed(4)}`);
    assert.ok(near(expectedDps(f) / expectedDps(u), 1.15, 1e-6), 'damage a second ×1.15');
});

test('partway to the cap, Focus adds speed up to it and damage for the rest, so it never pays less nearer the cap', () => {
    const { game } = hero(0.9);
    const u = unfocused(game);
    const f = focused(game);
    assert.equal(f.attackInterval, CAP_SWING);
    assert.ok(near(f.focusSpeed, 0.1) && near(f.focusDamage, 0.05), `${f.focusSpeed} speed, ${f.focusDamage} damage`);
    assert.ok(near(f.atk / u.atk, 1.05, 1e-6));
    // what Focus is worth in a fight, from far under the cap to past it: down as speed counts for less, then up to ×1.15
    const worth = speed => { const g = hero(speed).game; const a = expectedDps(unfocused(g)); return expectedDps(focused(g)) / a; };
    const steps = [0.85, 0.88, 0.9, 0.95, 0.99, 1.0, 1.2].map(worth);
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1] - 1e-6, `${steps.map(w => w.toFixed(4)).join(' ')}`);
    assert.ok(near(steps.at(-1), 1.15, 1e-6));
});

test('only Focus\'s own speed turns into damage: the rest past the cap still adds nothing', () => {
    const { game } = hero(1.0, 0.6);
    const u = unfocused(game);
    const f = focused(game);
    assert.ok(near(f.focusDamage, BASE.focusAttackSpeed), `${f.focusDamage}, not 0.75`);
    assert.ok(near(f.atk / u.atk, 1.15, 1e-6));
});

test('no Focus damage in the clan fight, which counts no Focus', () => {
    const { game } = hero(1.0);
    const s = game.state;
    s.meta.lastInputAt = T0 - 10 * MIN;
    s.meta.lastActiveAt = T0;
    const field = deriveStats(s);
    s.combat.mode = 'clan';
    const clan = deriveStats(s);
    assert.ok(field.focused && clan.focused);
    assert.ok(near(field.focusDamage, 0.15));
    assert.equal(clan.focusDamage, 0);
    assert.equal(clan.focusSpeed, 0);
    assert.ok(near(field.atk / clan.atk, 1.15, 1e-6));
});

test('the server reckons the stored hero as before: no Focus, so no Focus damage', () => {
    const { game } = hero(1.0);
    focused(game);
    assert.ok(game.derived.focusDamage > 0);
    const idle = JSON.parse(game.serialize(game.now));
    unfocused(game);
    const busy = JSON.parse(game.serialize(game.now));
    const later = T0 + 30 * MIN;
    assert.equal(plainAttack(idle, later), plainAttack(busy, later));
    assert.equal(powerSummary(idle, later).dps, powerSummary(busy, later).dps);
    const old = BASE.focusCapDamage;
    try {
        BASE.focusCapDamage = 0;
        assert.equal(plainAttack(idle, later), plainAttack(busy, later), 'and as the game before it reckoned it');
    } finally { BASE.focusCapDamage = old; }
});

test('BASE.focusCapDamage 0 is the Focus before (the measurement\'s switch)', () => {
    const { game } = hero(1.0);
    const u = unfocused(game);
    const old = BASE.focusCapDamage;
    try {
        BASE.focusCapDamage = 0;
        const f = focused(game);
        assert.equal(f.atk, u.atk);
        assert.equal(f.focusDamage, 0);
        assert.equal(f.attackInterval, CAP_SWING);
    } finally { BASE.focusCapDamage = old; }
});

test('the cap marks judge speed without Focus: a piece whose speed feeds Focus\'s damage is not marked', () => {
    // +105% without Focus: at the cap on its own, so the swing wears its mark, focused or not
    const { game, ids: [weapon, gloves, boots] } = hero(0.6, 0.25, 0.2);
    for (const d of [unfocused(game), focused(game)]) {
        assert.equal(d.attackInterval, CAP_SWING);
        assert.match(renderInventory(game, {}), /data-tip="Attack speed stops at \+100%, and yours comes to \+105%: more adds nothing\."/);
    }
    // without the boots he is at +85%: their speed counts unfocused, and focused it is what puts Focus's +15% past the cap
    // (+15% damage), so they are never marked; the gloves' and the weapon's neither
    for (const d of [unfocused(game), focused(game)]) {
        for (const id of [weapon, gloves, boots]) assert.doesNotMatch(renderItemDetail(game, id), /cap-mark/, `${id}, ${d.focused ? 'focused' : 'not focused'}`);
    }
    // +90% without Focus: the swing is at the cap only while focused, and more speed still adds there (as damage): no mark
    const under = hero(0.9).game;
    focused(under);
    assert.equal(under.derived.attackInterval, CAP_SWING);
    assert.doesNotMatch(renderInventory(under, {}), /cap-mark/);
});

test('the Focus pill\'s tip says what Focus gives now: attack speed under the cap, damage at it', () => {
    const tip = speed => focusTip(focused(hero(speed).game));
    assert.equal(tip(0.5), 'You\'ve left the game alone for a minute: +15% skill speed and +15% attack speed. Any click or key press ends it.');
    assert.equal(tip(1.0), 'You\'ve left the game alone for a minute: +15% skill speed and +15% damage (past attack speed\'s cap, Focus adds damage instead). Any click or key press ends it.');
    assert.equal(tip(0.9), 'You\'ve left the game alone for a minute: +15% skill speed, +10% attack speed and +5% damage (past attack speed\'s cap, Focus adds damage instead). Any click or key press ends it.');
    const { game } = hero(1.0);
    focused(game);
    const header = renderHeader(game, { tab: 'combat', fresh: new Set() }, null);
    assert.ok(header.includes(`<span class="focus-pill" title="${escapeHtml(focusTip(game.derived))}">`), 'the pill carries it');
    unfocused(game);
    assert.doesNotMatch(renderHeader(game, { tab: 'combat', fresh: new Set() }, null), /focus-pill/, 'no pill without Focus');
});

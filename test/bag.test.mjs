// The bag on one measure (the research loop's R16, 12 November 2026): Equip all once two or more pieces wait (P-076),
// Weaker that stays (P-077), and Undo the last sale or salvage (P-078). Pieces are judged by systems/worth.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { generateEquipment } from '../src/core/formulas.js';
import { RARITIES, GEAR_TIERS } from '../src/data/items.js';
import { upgradesWaiting, findUpgrade, isUpgrade } from '../src/systems/inventory.js';
import { judgeOf } from '../src/systems/worth.js';
import { renderCombat } from '../src/ui/render.js';

const T0 = 1_760_000_000_000;
const rarity = id => RARITIES.find(r => r.id === id);
const piece = (type, tier, id, r = 'rare') => generateEquipment({ type, tier, power: GEAR_TIERS[tier - 1].power, materialName: GEAR_TIERS[tier - 1].name, rarity: rarity(r), source: 'drop' }, id);

/** A hero at stage 100 in copper, combat level 60 (tier 5 and below can be worn). */
function hero() {
    rng.setSource(seededRandom(21));
    const game = new Game(null, T0);
    const s = game.state;
    s.skills.combat.xp = xpForLevel(60);
    s.combat.stage = s.combat.maxStage = s.combat.bestStage = 100;
    s.settings.autoSalvage = 'off';
    for (const [slot, type] of [['Weapon', 'Weapon'], ['Head', 'Head'], ['Body', 'Body'], ['Ring1', 'Ring'], ['Ring2', 'Ring']]) s.equipped[slot] = piece(type, 1, 100 + s.idCounter++, 'common');
    game.recompute();
    return game;
}

test('Equip all puts on the best waiting piece for every slot, two rings for two ring slots, and says it once', () => {
    const game = hero();
    const s = game.state;
    const sword = piece('Weapon', 4, 1);
    const helm = piece('Head', 4, 2);
    const ringA = piece('Ring', 4, 3, 'epic');
    const ringB = piece('Ring', 3, 4);
    const plate = piece('Body', 1, 5, 'common');      // no better than the one worn
    const far = piece('Weapon', 6, 6, 'legendary');   // too deep to wear yet
    s.inventory.push(plate, ringB, sword, far, helm, ringA);
    const judge = judgeOf(game);
    assert.equal(isUpgrade(s, plate, judge), false);
    const waiting = upgradesWaiting(s, judge);
    assert.deepEqual(waiting.map(o => o.item.id).sort(), [1, 2, 3, 4], 'the sword, the helm and both rings');
    assert.equal(new Set(waiting.map(o => o.slot)).size, 4, 'a slot each');
    s.combat.active = true;   // (the dock is the fight's, filling the screen)
    assert.match(renderCombat(game, { tab: 'combat' }), /FI\.equipAll\(\)[\s\S]*4 pieces/, 'the dock offers it beside the Equip');
    game.drainEvents();
    assert.equal(game.equipAll(), 4);
    assert.equal(s.equipped.Weapon.id, 1);
    assert.equal(s.equipped.Head.id, 2);
    assert.deepEqual([s.equipped.Ring1.id, s.equipped.Ring2.id].sort(), [3, 4]);
    assert.equal(findUpgrade(s, judgeOf(game)), null, 'nothing better waits');
    assert.ok(s.inventory.some(i => i.id === 5) && s.inventory.some(i => i.id === 6), 'the plate and the deep sword stay in the bag');
    assert.equal(s.inventory.length, 2 + 4, 'and the four pieces taken off went into it');
    const events = game.drainEvents().filter(e => e.type === 'equip');
    assert.equal(events.length, 1, 'one rise over the hero');
    assert.equal(events[0].count, 4);
    assert.ok(events[0].gain.atk > 0.5, `all of it: +${Math.round(events[0].gain.atk * 100)}% attack`);
    assert.equal(game.equipAll(), 0, 'nothing more to put on');
});

test('one piece waiting is the Equip alone; inside a dungeon run nothing is put on', () => {
    const game = hero();
    const s = game.state;
    s.inventory.push(piece('Weapon', 4, 1));
    game.state.combat.active = true;
    const html = renderCombat(game, { tab: 'combat' });
    assert.match(html, /▲ Equip/);
    assert.ok(!html.includes('FI.equipAll()'), 'no Equip all for one piece');
    s.inventory.push(piece('Head', 4, 2));
    s.combat.mode = 'dungeon';
    assert.equal(game.equipAll(), 0);
    assert.equal(s.equipped.Weapon.id === 1, false);
});

test('with Weaker on, an Equip also takes what it made weaker: the piece taken off and the bag\'s weaker ones of its kind', () => {
    const game = hero();
    const s = game.state;
    const old = s.equipped.Weapon;
    const sword = piece('Weapon', 4, 1);
    const middling = piece('Weapon', 2, 2);                          // better than copper, not than the new sword
    const locked = { ...piece('Weapon', 1, 3), locked: true };
    const made = { ...piece('Weapon', 1, 4), source: 'crafted' };    // the hero's own work: never swept
    const helm = piece('Head', 1, 5, 'common');                       // another kind: not this Equip's business
    s.inventory.push(sword, middling, locked, made, helm);
    s.settings.autoSalvage = 'weaker';
    const essence = s.resources.essence;
    game.drainEvents();
    assert.equal(game.equipItem(1), true);
    const ids = s.inventory.map(i => i.id).sort((a, b) => a - b);
    assert.deepEqual(ids, [3, 4, 5], 'the old sword and the middling one went');
    assert.ok(!ids.includes(old.id));
    assert.ok(s.resources.essence > essence, 'for their essence');
    const ev = game.drainEvents().find(e => e.type === 'equip');
    assert.equal(ev.swept.count, 2);
    assert.match(s.log.at(-1).text, /Salvaged 2 items made weaker by what you put on/);
    // with Weaker off nothing goes
    s.settings.autoSalvage = 'common';
    s.inventory.push(piece('Head', 4, 6));
    assert.equal(game.equipItem(6), true);
    assert.ok(s.inventory.some(i => i.type === 'Head' && i.id !== 6), 'the old helm waits in the bag');
});

test('Equip all with Weaker on sweeps every kind it put on', () => {
    const game = hero();
    const s = game.state;
    s.settings.autoSalvage = 'weaker';
    s.inventory.push(piece('Weapon', 4, 1), piece('Head', 4, 2), piece('Head', 2, 3));
    assert.equal(game.equipAll(), 2);
    assert.deepEqual(s.inventory, [], 'the two pieces taken off and the middling helm went');
});

test('automatic salvage gathers into a line a minute in the log, kept through a save', async () => {
    const { addItem } = await import('../src/systems/inventory.js');
    const { migrateState } = await import('../src/core/state.js');
    const game = hero();
    const s = game.state;
    s.equipped.Weapon = piece('Weapon', 5, 299, 'epic');   // every copper sword below is weaker
    game.recompute();
    s.settings.autoSalvage = 'weaker';
    const lines = () => s.log.filter(e => /as they came/.test(e.text));
    const logged = s.log.length;
    for (let i = 0; i < 3; i++) addItem(game, piece('Weapon', 1, 300 + i, 'rare'));
    addItem(game, piece('Weapon', 1, 310, 'common'));   // (a common one goes quietly, as before)
    assert.equal(s.log.length, logged, 'no line a piece');
    assert.equal(s.meta.salvageTally.count, 3);
    assert.equal(migrateState(JSON.parse(game.serialize(T0)), T0).meta.salvageTally.count, 3, 'a save keeps the minute');
    game.tick(T0 + 30000);
    assert.equal(lines().length, 0, 'not before its minute');
    game.tick(T0 + 61000);
    assert.equal(lines().length, 1);
    assert.match(lines()[0].text, /^♻️ Salvaged 3 pieces as they came \(3 rare\) for \d+ essence/);
    assert.equal(s.meta.salvageTally, undefined);
    addItem(game, piece('Weapon', 1, 320, 'epic'));
    game.tick(T0 + 200000);
    assert.equal(lines().length, 2, 'the next minute\'s line');
    assert.match(lines()[1].text, /1 piece as they came \(1 epic\)/);
    const raw = JSON.parse(game.serialize(T0));
    raw.meta.salvageTally = { since: 'soon', count: -3 };
    assert.equal(migrateState(raw, T0).meta.salvageTally, undefined, 'a broken tally is dropped');
});

test('the Weaker pill glows from the bag\'s first fill until Weaker is picked once', async () => {
    const { renderInventory } = await import('../src/ui/render.js');
    const { evaluateDisclosures } = await import('../src/systems/disclosure.js');
    const { BAG_SIZE } = await import('../src/data/items.js');
    const game = hero();
    const s = game.state;
    s.seen.auto_salvage = true;
    s.settings.autoSalvage = 'common';
    const pill = () => renderInventory(game, {}).match(/<button class="rarity-pill[^"]*"[^>]*FI\.setAutoSalvage\('weaker'\)/)[0];
    assert.ok(!pill().includes('glow'));
    for (let i = 0; i < BAG_SIZE; i++) s.inventory.push(piece('Boots', 1, 400 + i, 'common'));
    evaluateDisclosures(s);
    assert.equal(s.seen.bag_full, true);
    assert.ok(pill().includes(' glow'), 'the bag is full: Weaker glows');
    s.inventory.length = 3;
    evaluateDisclosures(s);
    assert.ok(pill().includes(' glow'), 'and goes on glowing');
    game.setAutoSalvage('weaker');
    evaluateDisclosures(s);
    assert.equal(s.seen.weaker_tried, true);
    game.setAutoSalvage('common');
    assert.ok(!pill().includes('glow'), 'once tried, never again');
});

// What a player sees opens as they meet it: the pieces inside the screens (systems/disclosure.js),
// the order of the first unlocks, and the words the game writes about them.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../src/game.js';
import { CAMP_UPGRADES } from '../src/data/camp.js';
import { rng, seededRandom } from '../src/core/rng.js';
import { xpForLevel } from '../src/core/xp.js';
import { migrateState } from '../src/core/state.js';
import { withArticle } from '../src/core/text.js';
import { DISCLOSURES, seen, evaluateDisclosures } from '../src/systems/disclosure.js';
import { UNLOCKS, nextGoals } from '../src/data/unlocks.js';
import { generateEquipment } from '../src/core/formulas.js';

rng.setSource(seededRandom(77));
const T0 = 1_700_000_000_000;

test('a new player has met nothing yet', () => {
    const game = new Game(null, T0);
    for (const rule of DISCLOSURES) assert.equal(seen(game.state, rule.id), false, rule.id);
    assert.deepEqual(game.state.seen, {});
});

test('each piece opens when it first means something, and says so once', () => {
    const game = new Game(null, T0);
    const s = game.state;
    const reveals = () => game.drainEvents().filter(e => e.type === 'reveal').map(e => e.id);
    const cheapest = Math.min(...CAMP_UPGRADES.map(u => u.baseCost));
    s.gold = cheapest - 1;
    game.tick(T0 + 100);
    assert.deepEqual(reveals(), [], 'not enough gold for the camp yet');
    s.gold = cheapest;
    game.tick(T0 + 200);
    assert.deepEqual(reveals(), ['camp']);
    s.gold = 0; // spent elsewhere: the camp stays
    s.resources.essence = 3;
    game.tick(T0 + 300);
    assert.deepEqual(reveals(), ['essence'], 'the camp is not announced twice');
    assert.ok(seen(s, 'camp'), 'and it does not close again');
    s.resources.essence = 0;
    game.tick(T0 + 400);
    assert.ok(seen(s, 'essence'), 'a spent currency keeps its place in the purse');

    assert.ok(!seen(s, 'world_map') && !seen(s, 'stage_nav'));
    s.stats.deaths = 1;
    game.tick(T0 + 500);
    assert.ok(seen(s, 'stage_nav') && !seen(s, 'world_map'), 'going back matters after a first defeat');
    s.combat.bestStage = 11;
    game.tick(T0 + 600);
    assert.ok(seen(s, 'world_map'), 'the map comes with the second zone');

    assert.ok(!seen(s, 'food') && !seen(s, 'potions') && !seen(s, 'jewellery') && !seen(s, 'gear'));
    s.resources.cooked_rabbit = 1;
    s.inventory.push(generateEquipment({ type: 'Ring', tier: 1, power: 1, materialName: 'Amethyst' }, s.idCounter++));
    game.tick(T0 + 700);
    assert.ok(seen(s, 'food') && seen(s, 'jewellery') && seen(s, 'gear') && !seen(s, 'potions'));

    assert.ok(!seen(s, 'minigames'));
    s.minigame.mining.opportunityUntil = T0 + 20000;
    game.tick(T0 + 800);
    assert.ok(seen(s, 'minigames'), 'the mini-game arrives with the first chance to play');
    assert.ok(!seen(s, 'mastery'));
    s.stats.masteryLevels = 20;
    game.tick(T0 + 900);
    assert.ok(seen(s, 'mastery'));
});

test('what has opened is saved, and a loaded save opens without fanfare', () => {
    const game = new Game(null, T0);
    game.state.gold = 500;
    game.tick(T0 + 100);
    const saved = JSON.parse(game.serialize(T0 + 100));
    assert.equal(saved.seen.camp, true);
    saved.seen.not_a_piece = 'yes'; // only true flags with plain names survive a load
    saved.seen['<b>'] = true;
    const again = new Game(saved, T0 + 200);
    assert.deepEqual(Object.keys(again.state.seen), ['camp']);

    // An old save has no record: it opens with everything it has earned, and no events for it.
    const old = JSON.parse(game.serialize(T0 + 100));
    delete old.seen;
    old.prestige.count = 2; old.prestige.tokens = 30; old.combat.bestStage = 40; old.resources.essence = 9; old.stats.itemsDropped = 30;
    const veteran = new Game(old, T0 + 300);
    for (const id of ['camp', 'essence', 'tokens', 'skill_points', 'world_map', 'stage_nav', 'gear', 'bag_tools', 'auto_salvage']) assert.ok(seen(veteran.state, id), id);
    assert.equal(veteran.drainEvents().filter(e => e.type === 'reveal').length, 0);
    assert.deepEqual(evaluateDisclosures(veteran.state), [], 'nothing left to open');
    assert.deepEqual(migrateState({ version: 3, seen: 'broken' }, T0).seen, {}, 'a broken record loads as empty');
});

test('developer mode shows every piece', () => {
    const game = new Game(null, T0);
    game.state.settings.devUnlockAll = true;
    for (const rule of DISCLOSURES) assert.ok(seen(game.state, rule.id), rule.id);
});

test('Crafting opens when its first piece can be made: a silver bar and a gem', () => {
    const game = new Game(null, T0);
    const s = game.state;
    s.stats.gemsFound = 1;
    s.resources.amethyst = 1;
    s.stats.barsSmelted = 40;
    s.resources.copper_bar = 20;
    s.skills.mining.xp = xpForLevel(25);
    s.unlocks.woodcutting = true;   // the bars smelted opened it long ago
    game.tick(T0 + 31_000);         // a place earned by work answers within half a minute (data/unlocks.js)
    assert.ok(!s.unlocks.crafting, 'copper bars and a gem make nothing in Crafting');
    s.resources.silver_bar = 1;
    game.tick(T0 + 62_000);
    assert.ok(s.unlocks.crafting, 'the first silver bar opens it for the gem already found');
    // a silver bar alone waits for a gem
    const other = new Game(null, T0);
    other.state.resources.gold_bar = 1;
    other.tick(T0 + 31_000);
    assert.ok(!other.state.unlocks.crafting);
    other.state.stats.gemsFound = 1;
    other.tick(T0 + 62_000);
    assert.ok(other.state.unlocks.crafting);
});

test('the loop stays in the fight: prestige can walk straight into the next run', () => {
    const fresh = () => {
        const game = new Game(null, T0);
        const s = game.state;
        s.combat.maxStage = 24; s.combat.bestStage = 24; s.combat.stage = 24;
        s.prestige.runStartedAt = 0;
        s.gold = 900; s.camp.whetstone = 2;
        game.recompute();
        return game;
    };
    const game = fresh();
    game.enterCombat();
    assert.ok(game.prestige({ resume: true }));
    assert.ok(game.state.combat.active, 'a hero who was fighting fights on');
    assert.equal(game.state.combat.enemy.stage, game.state.combat.stage, 'against the new run\'s first monster');
    assert.equal(game.state.gold, 0);
    assert.equal(game.state.camp.whetstone, 0);
    assert.equal(game.state.prestige.count, 1);

    const resting = fresh();
    assert.ok(resting.prestige({ resume: true }));
    assert.ok(!resting.state.combat.active, 'a hero who was resting keeps resting');
    const plain = fresh();
    plain.enterCombat();
    assert.ok(plain.prestige());
    assert.ok(!plain.state.combat.active, 'without resume, prestige leaves the fight as before');
    const early = new Game(null, T0);
    early.enterCombat();
    assert.equal(early.prestige({ resume: true }), false, 'a prestige that is not allowed changes nothing');
    assert.ok(early.state.combat.active);
});

test('every goal says what to do in a few words, and where (the sidebar\'s Next card)', () => {
    const tabs = new Set(UNLOCKS.map(u => u.id));
    for (const u of UNLOCKS.filter(u => !u.always)) {
        assert.ok(u.task && u.task.length <= 30, `${u.id} has a short task`);
        assert.ok(tabs.has(u.tab), `${u.id} points at a tab`);
    }
    // the place a goal sends the player to is always open by the time it is the goal
    const game = new Game(null, T0);
    for (let i = 0; i < UNLOCKS.length; i++) {
        const [goal] = nextGoals(game.state, 1);
        if (!goal) break;
        const where = UNLOCKS.find(u => u.id === goal.tab);
        assert.ok(where.always || game.state.unlocks[goal.tab], `${goal.id} sends the player to ${goal.tab}, which is open`);
        game.state.unlocks[goal.id] = true;
    }
});

test('articles: a sword, an axe, and none for a pair of boots', () => {
    assert.equal(withArticle('Copper Boots'), 'Copper Boots');
    assert.equal(withArticle('Iron Greaves'), 'Iron Greaves');
    assert.equal(withArticle('Copper Sword'), 'a Copper Sword');
    assert.equal(withArticle('Iron Axe'), 'an Iron Axe');
    assert.equal(withArticle('Amethyst'), 'an Amethyst');
    assert.equal(withArticle('Oak Bow'), 'an Oak Bow');
});

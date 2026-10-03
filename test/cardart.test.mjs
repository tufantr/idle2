// Every action card has a picture of its own (tools/cards.py cuts them into assets/paint/cards/,
// src/data/cardart.js lists them): a new node, recipe, tool or crop without one fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { CARD_ART } from '../src/data/cardart.js';
import { SKILLS } from '../src/data/skills.js';
import { SMELTING_RECIPES, TOOLS } from '../src/data/workshop.js';
import { SMITHING_TYPES, CRAFTING_TYPES } from '../src/data/items.js';
import { CROPS } from '../src/data/farming.js';

const cards = [
    ...Object.values(SKILLS).flatMap(s => (s.nodes || []).map(n => n.id)),
    ...SMELTING_RECIPES.map(r => r.id),
    ...SMITHING_TYPES.map(t => `forge_${t}`),
    ...CRAFTING_TYPES.map(t => `craft_${t}`),
    ...Object.keys(TOOLS).map(id => `tool_${id}`),
    ...CROPS.map(c => c.produces),
    'smithy', 'jeweller', 'kitchen'   // what a card without its own picture falls back to
];

test('every action card has its picture', () => {
    const missing = [...new Set(cards)].filter(name => !CARD_ART.has(name));
    assert.deepEqual(missing, [], `no picture for: ${missing.join(', ')} (add them to SHEETS in tools/cards.py)`);
});

test('every listed picture is on disk', () => {
    const absent = [...CARD_ART].filter(name => !existsSync(new URL(`../assets/paint/cards/${name}.webp`, import.meta.url)));
    assert.deepEqual(absent, []);
});

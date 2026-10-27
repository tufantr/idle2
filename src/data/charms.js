// Charms (DESIGN §3.34; the owner's go, 27 October 2026): kits with charges, bought with essence in the Shop, that make one
// skill's work go further while their charges last (Melvor's charged gloves and compost). Each opens as its skill meets
// the bottleneck it eases, its charges are kept through every prestige, and a chip in its skill's header shows how many
// are left. The work they speed is permanent progress (gems for the bench, bars for the forge, food, crops), at about its
// worth in time: essence piles up late (some 41,700 at stage 300, 378,200 at 1,000 in the simulator) where coal, gems and
// raw food run short.
//
// `charges`: what one purchase adds (a purchase stacks on any left); `essence`: its price. `opens(state, levelOf)` says
// when it shows in the Shop (levelOf(skill) is that skill's level). systems/charms.js spends a charge each time it bites.

export const CHARMS = [
    { id: 'gem_gloves', name: 'Gem Gloves', skill: 'mining', charges: 500, essence: 1000,
        icon: 'item/Gloves/3', badge: 'res/ruby', does: 'Every rock mined also brings a gem.',
        opens: (state, levelOf) => levelOf('mining') >= 30 && !!state.unlocks?.crafting },
    { id: 'furnace_bellows', name: 'Furnace Bellows', skill: 'smithing', charges: 500, essence: 1500,
        icon: 'res/runite_bar', badge: 'icon/flame', does: 'Bars smelt without coal.',
        opens: state => Object.values(state.forge || {}).some(slot => (slot?.level || 0) > 10) },
    { id: 'chef_gloves', name: "Chef's Gloves", skill: 'cooking', charges: 500, essence: 1000,
        icon: 'item/Gloves/1', badge: 'res/cooked_shark', does: 'Every dish comes out as two.',
        opens: (state, levelOf) => levelOf('cooking') >= 50 },
    { id: 'compost_sack', name: 'Compost Sack', skill: 'farming', charges: 6, essence: 750,
        icon: 'farm/growing', badge: 'icon/up', does: 'A harvest yields half as much again.',
        opens: (state, levelOf) => levelOf('farming') >= 50 }
];

/** A charm's charges for Festival Tokens in a weekend event's shop (systems/events.js): a late use for the tokens. */
export const CHARM_TOKEN_COST = 40;

/** What Compost adds to a harvest (×1.5). */
export const COMPOST_YIELD = 1.5;

/** The most charges of a charm a hero may hold: a hundred purchases' worth (so a save's figure stays in range). */
export const chargesMax = charm => charm.charges * 100;

export const charmById = id => CHARMS.find(c => c.id === id) || null;

/** The charm a skill's work uses, if any. */
export const charmForSkill = skill => CHARMS.find(c => c.skill === skill) || null;

/** Charges of a charm held now (0 when none). */
export const charmCharges = (state, id) => Math.max(0, Math.floor(Number(state?.charms?.[id]) || 0));

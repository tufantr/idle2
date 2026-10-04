// Weekend events: a template for timed content that needs no server. Every weekend (Friday 00:00 to
// Monday 00:00 UTC) one of five themed events runs, in rotation by ISO week. While it runs:
// - its modifiers apply (through the pipeline, like everything else);
// - every EVENT_ACTIONS_PER_TOKEN actions or kills earn a Festival Token, up to EVENT_DAILY_CAP a day;
// - milestones pay out at 50 / 100 / 150 tokens earned in that event;
// - the event shop sells rewards for tokens. Tokens keep between events, so nothing is lost.
// A new event is a new entry in EVENTS (the "S per event" in the roadmap).

export const EVENT_ACTIONS_PER_TOKEN = 20;
export const EVENT_DAILY_CAP = 60;
export const EVENT_START_DAY = 5;          // Friday (UTC), 0 = Sunday
export const EVENT_LENGTH_HOURS = 72;

export const EVENTS = [
    {
        id: 'harvest_festival', name: 'Harvest Festival', icon: '🌾', color: '#84cc16',
        desc: 'The fields are generous: +25% farming yield, +15% cooking and fishing speed.',
        mods: { farmYield: 0.25, skillSpeed: { cooking: 0.15, fishing: 0.15 } }
    },
    {
        id: 'titans_fury', name: "Titan's Fury", icon: '🗿', color: '#ef4444',
        desc: 'The realm stirs: +20% combat XP and gold, +10% drop chance.',
        mods: { combatXpMult: 0.20, goldMult: 0.20, dropMult: 0.10 }
    },
    {
        id: 'miners_rush', name: "Miner's Rush", icon: '⛏️', color: '#34d399',
        desc: 'Rich seams everywhere: +20% gathering speed and +10% XP from every skill.',
        mods: { skillSpeed: { mining: 0.20, woodcutting: 0.20, fishing: 0.20, hunting: 0.20 }, xpMult: 0.10 }
    },
    {
        id: 'guild_fair', name: 'Guild Fair', icon: '⚒️', color: '#e879f9',
        desc: 'The guilds compete: +20% workshop and firemaking speed, +5% quality on crafted gear.',
        mods: { skillSpeed: { smithing: 0.20, crafting: 0.20, firemaking: 0.20 }, craftQuality: 0.05 }
    },
    {
        // gildedChance is how much more often gilded monsters come (BALANCE.rewards.gildedChance): +2 = three times
        id: 'gold_fever', name: 'Gold Fever', icon: '🪙', color: '#facc15',
        desc: 'The monsters glitter: gilded monsters come three times as often, and +10% gold from combat.',
        mods: { gildedChance: 2, goldMult: 0.10 }
    }
];

// Milestones per event (tokens earned in that event), paid automatically.
export const EVENT_MILESTONES = [
    { tokens: 50,  reward: { essence: 100 },               desc: '100 essence' },
    { tokens: 100, reward: { essence: 200, diamond: 1 },   desc: '200 essence and a diamond' },
    { tokens: 150, reward: { essence: 300, diamond: 2 },   desc: '300 essence and two diamonds' }
];

// The shop, open while an event runs. `gives` goes straight into the bank.
export const EVENT_SHOP = [
    { id: 'ev_essence',  name: 'Essence Pouch',   desc: '60 essence',               cost: 20, gives: { essence: 60 } },
    { id: 'ev_diamond',  name: 'Cut Diamond',     desc: 'A diamond for jewellery',  cost: 40, gives: { diamond: 1 } },
    { id: 'ev_bait',     name: 'Angler\'s Tin',   desc: '100 fishing bait',         cost: 10, gives: { fishing_bait: 100 } },
    { id: 'ev_herbs',    name: 'Herbalist Kit',   desc: '10 of each herb',          cost: 15, gives: { guam_leaf: 10, marrentill_leaf: 10, tarromin_leaf: 10, harralander_leaf: 10 } },
    { id: 'ev_bars',     name: 'Smith\'s Crate',  desc: '10 runite bars',           cost: 60, gives: { runite_bar: 10 } }
];

export function eventById(id) {
    return EVENTS.find(e => e.id === id) || null;
}

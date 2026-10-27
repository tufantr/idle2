// Trials: challenge runs with rewards that last (docs/research_notes/robust-and-fun/B_longterm_motivation.md
// §8.2: late resets stay meaningful when each brings a choice or a new rule). From best stage
// TRIALS_FROM, the prestige dialog offers to prestige into a Trial: the next run plays under one rule,
// and reaching a tier's stage in it clears that tier for good. Each tier cleared is a record (core/
// modifiers.js recordsOf): the tokens grow ×BASE.recordMult stronger, as for 25 stages of best stage or a
// dungeon unique. A run in a Trial earns its tokens as any run does, from the stage it reaches under the
// rule, so a Trial costs some of a run's tokens: a choice, not a chore.
//
// Five tiers each, TRIAL_STEP stages apart. A rule costs a run about the same number of stages at any
// depth (power grows by a steady factor per stage), so each `first` is about the stage a hero at the
// Trials' door reaches under that rule (tools/trials.mjs measures it; DESIGN §3.26): the first tier
// falls soon after they open, the fifth about a hundred stages of best later.
//
// `bite` is what the rule changes, read where it applies: enemyAtk, enemyHp (multipliers on the stage
// monsters) and bossTime (on a stage boss's timer) in systems/combat.js spawnEnemy; heroHp (on max
// health), gear (on everything equipment gives), noTokens and noCamp in core/modifiers.js; noCamp also in
// systems/camp.js; noFood in systems/combat.js tryEat, noRegen in its health regained while fighting; oneBlow (a blow
// that lands fells the hero) and stagger (ms a landed blow puts his next swing back) in systems/combat.js enemyAttack;
// noPotion in core/modifiers.js potionEffects and systems/potions.js.
//
// Ladders without end (the owner's go, 27 October 2026): past the five tiers, a rung at stage TRIAL_LADDER.from and one
// every TRIAL_LADDER.step after, each a record like a tier. All forty tiers fell by about hour 65 in the simulator, at
// best stage ~500, and a deep hero had only the week's laurel left (docs/DESIGN.md §3.26). Three rules were sharpened
// with them, as deep they cost nothing: Glass Hero's tenth of his health (his defence kept every blow at armour's floor),
// Brutes' four times as hard and Fasting's no food (lifesteal and the potion carried him). A run may take up to
// PACT_MAX Trials at once (a Pact): their rules together, and the stage it reaches counts on each one's ladder. `heat`
// is a rule's weight on its card (about the stages it costs a deep run, in fifties).

export const TRIALS_FROM = 200;
export const TRIAL_TIERS = 5;
export const TRIAL_STEP = 25;
export const TRIAL_LADDER = { from: 500, step: 250 };
/** The last tier there is: the rungs reach the stages' end (MAX_STAGE in core/state.js, 10,000). */
export const TRIAL_MAX_TIER = TRIAL_TIERS + 1 + Math.floor((10000 - TRIAL_LADDER.from) / TRIAL_LADDER.step);
/** Trials one run may take at once (a Pact), and the best stage from which it may (the first rung's). */
export const PACT_MAX = 3;
export const PACTS_FROM = TRIAL_LADDER.from;

export const TRIALS = [
    { id: 'brutes', name: 'Brutes', art: 'highland', icon: 'mon/Mountain Troll', rule: 'Monsters hit four times as hard, and every blow that lands staggers your hero for a second.', bite: { enemyAtk: 4, stagger: 1000 }, first: 175, heat: 1 },
    { id: 'thick_hides', name: 'Thick Hides', art: 'frost', icon: 'mon/Mammoth', rule: 'Monsters have ten times the health.', bite: { enemyHp: 10 }, first: 175, heat: 2 },
    { id: 'glass', name: 'Glass Hero', art: 'depths', icon: 'item/Body/1', rule: 'Your hero falls to the first blow that lands.', bite: { oneBlow: true }, first: 170, heat: 2 },
    { id: 'rusted', name: 'Rusted Gear', art: 'ruins', icon: 'item/Shield/2', rule: 'Your gear gives a quarter of its strength.', bite: { gear: 0.25 }, first: 175, heat: 1 },
    { id: 'swift_bosses', name: 'Swift Bosses', art: 'skyreach', icon: 'mon/Thunder Roc', rule: 'Bosses give you a tenth of the time.', bite: { bossTime: 0.1 }, first: 180, heat: 1 },
    { id: 'no_camp', name: 'No Camp', art: 'camp', icon: 'campfire', rule: 'The camp stays packed.', bite: { noCamp: true }, first: 180, heat: 4 },
    { id: 'fasting', name: 'Fasting', art: 'marsh', icon: 'res/cooked_rabbit', rule: 'No food, no potions, and no health comes back while you fight.', bite: { noFood: true, noRegen: true, noPotion: true }, first: 170, heat: 1 },
    { id: 'faithless', name: 'Faithless', art: 'shrine', icon: 'res/essence', rule: 'Your tokens give nothing.', bite: { noTokens: true }, first: 125, heat: 10 }
];

const NO_BITE = Object.freeze({});

export const trialById = id => TRIALS.find(t => t.id === id) || null;

/** The Trials this run plays under, as ids (a save from before Pacts held one id, or none). */
export function trialIds(state) {
    const a = state?.trials?.active;
    const list = Array.isArray(a) ? a : a ? [a] : [];
    return list.filter((id, i) => trialById(id) && list.indexOf(id) === i).slice(0, PACT_MAX);
}

/** The rules this run plays under ('' when none; a Pact's ids joined by +). */
export const trialRule = state => trialIds(state).join('+');

// What several rules change together: their factors multiplied, a landed blow's stagger the longest, the rest any.
const FACTORS = ['enemyAtk', 'enemyHp', 'heroHp', 'gear', 'bossTime'];
const pactBites = new Map();
function mergeBites(ids) {
    const bite = {};
    for (const id of ids) for (const [k, v] of Object.entries(trialById(id).bite)) {
        if (FACTORS.includes(k)) bite[k] = (bite[k] ?? 1) * v;
        else if (k === 'stagger') bite[k] = Math.max(bite[k] || 0, v);
        else bite[k] = bite[k] || v;
    }
    return Object.freeze(bite);
}

/** What the run's rules change (data above; an empty object outside a Trial; a Pact's rules together). */
export function trialBite(state) {
    const ids = trialIds(state);
    if (!ids.length) return NO_BITE;
    if (ids.length === 1) return trialById(ids[0]).bite;
    const key = ids.join('+');
    let bite = pactBites.get(key);
    if (!bite) pactBites.set(key, bite = mergeBites(ids));
    return bite;
}

/** Tiers of a Trial cleared (0 to TRIAL_MAX_TIER: the five, then the ladder's rungs). */
export const trialTier = (state, id) => state.trials?.cleared?.[id] || 0;

/** Tiers cleared over all the Trials, rungs included: each is a record (core/modifiers.js recordsOf). */
export const trialTiersCleared = state => TRIALS.reduce((n, t) => n + Math.min(TRIAL_MAX_TIER, Math.max(0, Math.floor(trialTier(state, t.id)) || 0)), 0);

/** The stage a Trial's tier (1-based) asks for: the five 25 stages apart from its first, then the ladder's rungs. */
export const trialTarget = (trial, tier) => (tier <= TRIAL_TIERS ? trial.first + TRIAL_STEP * (tier - 1) : TRIAL_LADDER.from + TRIAL_LADDER.step * (tier - TRIAL_TIERS - 1));

// The week's Trial (robust-and-fun/B_longterm_motivation.md §8.2 item 10: late players need moments on
// the calendar, since late progress crawls). Each week, Monday 00:00 UTC to the next, one Trial is the
// week's, in turn. Beating your best stage in it from before the week began (or its first tier's stage,
// if that is higher) wins a laurel: a record, for good (core/modifiers.js recordsOf). The week's Trial can
// be played even when its tiers are cleared, so the Trials stay worth a run after the last tier falls.
// Your best in each Trial scales the goal with you. When a Trial joins, a new era starts at a future week
// (as the weekend events do: systems/events.js) so the weeks already played keep their Trial.
export const WEEK_MS = 7 * 24 * 3600 * 1000;
export const WEEKLY_FROM = Date.UTC(2024, 0, 1);   // a Monday
export const WEEKLY_ERAS = [{ from: WEEKLY_FROM, count: 8, offset: 0 }];

/** The week holding `now` and its Trial: { trial, start, end }. */
export function weeklyTrialAt(now) {
    const start = WEEKLY_FROM + Math.floor((now - WEEKLY_FROM) / WEEK_MS) * WEEK_MS;
    let era = WEEKLY_ERAS[0];
    for (const e of WEEKLY_ERAS) if (start >= e.from) era = e;
    const n = Math.floor((start - era.from) / WEEK_MS) + era.offset;
    return { trial: TRIALS[((n % era.count) + era.count) % era.count], start, end: start + WEEK_MS };
}

/** Laurels won from the week's Trials: each is a record. */
export const laurelsOf = state => Math.max(0, Math.floor(state.trials?.laurels || 0));

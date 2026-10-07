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
// systems/camp.js; noFood in systems/combat.js tryEat, noRegen in its health regained while fighting.

export const TRIALS_FROM = 200;
export const TRIAL_TIERS = 5;
export const TRIAL_STEP = 25;

export const TRIALS = [
    { id: 'brutes', name: 'Brutes', art: 'highland', icon: 'mon/Mountain Troll', rule: 'Monsters hit four times as hard.', bite: { enemyAtk: 4 }, first: 175 },
    { id: 'thick_hides', name: 'Thick Hides', art: 'frost', icon: 'mon/Mammoth', rule: 'Monsters have ten times the health.', bite: { enemyHp: 10 }, first: 175 },
    { id: 'glass', name: 'Glass Hero', art: 'depths', icon: 'item/Body/1', rule: 'Your hero has a tenth of his health.', bite: { heroHp: 0.1 }, first: 175 },
    { id: 'rusted', name: 'Rusted Gear', art: 'ruins', icon: 'item/Shield/2', rule: 'Your gear gives a quarter of its strength.', bite: { gear: 0.25 }, first: 175 },
    { id: 'swift_bosses', name: 'Swift Bosses', art: 'skyreach', icon: 'mon/Thunder Roc', rule: 'Bosses give you a tenth of the time.', bite: { bossTime: 0.1 }, first: 180 },
    { id: 'no_camp', name: 'No Camp', art: 'camp', icon: 'campfire', rule: 'The camp stays packed.', bite: { noCamp: true }, first: 180 },
    { id: 'fasting', name: 'Fasting', art: 'marsh', icon: 'res/cooked_rabbit', rule: 'No food, and no health comes back while you fight.', bite: { noFood: true, noRegen: true }, first: 185 },
    { id: 'faithless', name: 'Faithless', art: 'shrine', icon: 'res/essence', rule: 'Your tokens give nothing.', bite: { noTokens: true }, first: 125 }
];

const NO_BITE = Object.freeze({});

export const trialById = id => TRIALS.find(t => t.id === id) || null;

/** The rule this run plays under ('' when none). */
export const trialRule = state => (trialById(state.trials?.active) ? state.trials.active : '');

/** What the run's rule changes (data above; an empty object outside a Trial). */
export const trialBite = state => trialById(state.trials?.active)?.bite || NO_BITE;

/** Tiers of a Trial cleared (0 to TRIAL_TIERS). */
export const trialTier = (state, id) => state.trials?.cleared?.[id] || 0;

/** Tiers cleared over all the Trials: each is a record (core/modifiers.js recordsOf). */
export const trialTiersCleared = state => TRIALS.reduce((n, t) => n + Math.min(TRIAL_TIERS, Math.max(0, Math.floor(trialTier(state, t.id)) || 0)), 0);

/** The stage a Trial's tier (1-based) asks for. */
export const trialTarget = (trial, tier) => trial.first + TRIAL_STEP * (tier - 1);

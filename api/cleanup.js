// The night's cleanup (the research loop's P-097, November 2026): old rows the game no longer reads go, so what the server keeps
// about people has an end. Run by a systemd timer after the night's backup (deploy/vps/fantasyidle-cleanup.timer), with the API's
// own settings:
//
//   node api/cleanup.js            # deletes, and says how much
//   node api/cleanup.js --dry-run  # says how much it would delete, by the same queries, and deletes nothing
//
// What goes, and what still reads each kind of row (DESIGN §3.17 has the same as a table; test/api.test.cjs runs every read route
// before and after and finds the same answers):
//
// - Sign-in and mail counters a day after they began: their longest window (a day) is over.
// - Email codes a minute past their time, and at least a minute old: a code used up by its tries has no time left, but still holds
//   the next one back for its minute.
// - Sign-ups never confirmed, thirty days on: no token was ever given for them, so they have played nothing (and those that have
//   a save or a clan stay, however that came about). Accounts from before addresses have none and are never touched.
// - Flags past their thirty days (they no longer act), but for an account's last one, kept to show what happened.
// - The boards' weekly copies older than this week and last: only this week's is read.
// - Clan attacks and Hydra fights older than this week and last, once their week's ranking is stored. Only the week now running
//   is read for its boards, and last week's until its ranking is stored; a week's ranking can be stored only the week after it, so
//   past RANKING_LAPSES weeks one nobody came to see can never be, and its rows go too. Last week's stay also so that a fight sent
//   again after a lost answer is still known for the same fight.
// - Gifts to closed clans older than this week and last fold into the clan's totals (clan_gift_totals), but for each player's
//   highest number (their next gift counts on from it), and any their stored save has yet to take from its bank.

const { isoWeek, cleanupRules } = require('./index.js');

const DAY = 24 * 3600 * 1000;
const COUNTERS_LAST = DAY;
const SIGNUP_WAITS = 30 * DAY;
const RANKING_LAPSES = 4;   // weeks after which a week's ranking, never stored, can't be any more

/**
 * An account's stored flags without those past their time, the last one always staying: the JSON to store, or null when nothing
 * changes (or it can't be read: left as it is).
 */
function prunedFlags(flagsJson, now) {
    let flags;
    try { flags = JSON.parse(flagsJson); } catch { return null; }
    if (!Array.isArray(flags) || flags.length < 2) return null;
    const when = f => Number(f && f.at) || 0;
    const last = flags.reduce((best, f, i) => (when(f) >= when(flags[best]) ? i : best), 0);
    const kept = flags.filter((f, i) => i === last || now - when(f) < cleanupRules.FLAG_MEMORY_MS);
    return kept.length === flags.length ? null : JSON.stringify(kept);
}

/** How many of a save's hall gifts its bank has given, or null if the save can't be read (its gifts are then left alone). */
function takenBy(save) {
    if (!save) return null;
    try { return cleanupRules.giftsTaken(save.state ? JSON.parse(save.state) : null); } catch { return null; }
}

/**
 * One night's cleanup. `apply` false only counts. Each step stands alone: one that fails is named in `failed`, and the others still
 * run. Returns { counts: { step: rows }, failed: [step] }.
 */
async function runCleanup({ store, now = Date.now(), apply = true, log = console.error }) {
    const lastWeek = isoWeek(now - 7 * DAY);
    const lapsed = isoWeek(now - RANKING_LAPSES * 7 * DAY);
    const steps = {
        'sign-in counters': () => store.sweepAttempts(now - COUNTERS_LAST, apply),
        'email codes': () => store.sweepEmailCodes(now - cleanupRules.CODE_GAP_MS, apply),
        'unconfirmed sign-ups': async () => {
            if (apply) await store.dateUnconfirmed(now);
            const stale = await store.staleSignups(now - SIGNUP_WAITS);
            if (apply) for (const account of stale) await store.deleteAccount(account.id, account.username);
            return stale.length;
        },
        'old flags': async () => {
            let accounts = 0;
            for (const { id, flags } of await store.flaggedAccounts()) {
                const next = prunedFlags(flags, now);
                if (next !== null && (!apply || await store.setFlagsIf(id, flags, next))) accounts++;
            }
            return accounts;
        },
        'weekly snapshots': () => store.sweepSnapshots(lastWeek, apply),
        'clan attacks': () => store.sweepAttacks(lastWeek, lapsed, apply),
        'Hydra fights': () => store.sweepEndless(lastWeek, lapsed, apply),
        "closed clans' gifts": async () => {
            let gifts = 0;
            for (const userId of await store.closedClanGivers(lastWeek)) {
                const taken = takenBy(await store.getSave(userId));
                if (taken !== null) gifts += await store.foldClosedGifts(userId, taken, lastWeek, apply);
            }
            return gifts;
        }
    };
    const counts = {};
    const failed = [];
    for (const [name, step] of Object.entries(steps)) {
        try { counts[name] = await step(); } catch (err) {
            failed.push(name);
            log(`cleanup: ${name} failed: ${err && err.message}`);
        }
    }
    return { counts, failed };
}

module.exports = { runCleanup, prunedFlags };

if (require.main === module) {
    const store = require('./store');
    const apply = !process.argv.includes('--dry-run');
    store.ensureSchema()
        .then(() => runCleanup({ store, apply }))
        .then(({ counts, failed }) => {
            const said = Object.entries(counts).map(([name, n]) => `${n} ${name}`).join(', ');
            console.log(`cleanup${apply ? '' : ' (dry run: nothing deleted)'}: ${said}${failed.length ? `; failed: ${failed.join(', ')}` : ''}`);
            process.exit(failed.length ? 1 : 0);
        }, err => { console.error('cleanup failed:', err && err.message); process.exit(1); });
}

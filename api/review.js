// The growth check's review list, mailed to the owner once a week (DESIGN §3.17): the accounts whose ranked numbers grew
// faster than play allows but stayed inside the ceilings, which are listed instead of flagged (api/index.js
// plausibilityFlags, the table flag_reviews). Run from a weekly systemd timer with the API's own settings
// (/etc/fantasyidle/api.env: the database, the mail service's key, OWNER_ALERT_EMAIL):
//
//   node api/review.js
//
// It mails OWNER_ALERT_EMAIL a plain summary of the past seven days, each account by its username with its numbers, and
// nothing else about anyone. Without OWNER_ALERT_EMAIL it mails nothing.

const WEEK_MS = 7 * 24 * 3600 * 1000;
// The ranked numbers in words (RANKED's labels in api/index.js: a test checks that every one has its words here).
const LABELS = { bestStage: 'best stage', titanKills: 'Titans defeated', dungeonClears: 'dungeon clears', totalXp: 'total XP',
    tokens: 'prestige tokens', warLevel: 'combat levels past 99', stars: 'Stars' };

const whole = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dateOf = ms => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The list as a mail ({ subject, text }), from store.reviewsSince's rows: each account once, the most over its allowance
 * first, and under it each number at its worst day's figures, with the days and uploads that went past.
 */
function reviewMail(rows, { since, now }) {
    const span = `${dateOf(since)} to ${dateOf(now)}`;
    if (!rows.length) {
        return { subject: 'Fantasy Idle review list: nothing this week',
            text: `The review list for ${span}.\n\nNothing this week: no save grew faster than the growth check allows.\n` };
    }
    const accounts = new Map();
    for (const r of rows) {
        const account = accounts.get(r.userId) || { username: r.username, numbers: new Map(), worst: 0 };
        const number = account.numbers.get(r.metric) || { at: r, days: 0, uploads: 0 };
        if (r.share > number.at.share) number.at = r;
        number.days += 1;
        number.uploads += r.uploads;
        account.numbers.set(r.metric, number);
        account.worst = Math.max(account.worst, r.share);
        accounts.set(r.userId, account);
    }
    const listed = [...accounts.values()].sort((a, b) => b.worst - a.worst);
    const lines = listed.flatMap(a => [a.username, ...[...a.numbers].map(([metric, { at, days, uploads }]) =>
        `  ${LABELS[metric] || metric}: ${whole(at.from)} to ${whole(at.value)}, where ${whole(at.allowed)} more was allowed (${at.share.toFixed(1)} times), ${plural(days, 'day')}, ${plural(uploads, 'upload')}`), '']);
    return {
        subject: `Fantasy Idle review list: ${plural(listed.length, 'account')} this week`,
        text: `The review list for ${span}: saves whose numbers grew faster than the growth check allows, inside its ceilings. `
            + 'None of these accounts is flagged for it. To flag one by hand, see the README, "Flags".\n\n'
            + `${lines.join('\n')}\n`
    };
}

/**
 * Mail the past week's list to `to`: { sent: true, accounts, rows }, or { sent: false, why } without an address. `send` is
 * the mailer (api/mail.js's, or a test's).
 */
async function weeklyReview({ store, send, to = process.env.OWNER_ALERT_EMAIL, now = Date.now() }) {
    const since = now - WEEK_MS;
    const rows = await store.reviewsSince(since);
    const accounts = new Set(rows.map(r => r.userId)).size;
    if (!to) return { sent: false, why: 'OWNER_ALERT_EMAIL is not set', accounts, rows: rows.length };
    await send({ to, ...reviewMail(rows, { since, now }) });
    return { sent: true, accounts, rows: rows.length };
}

module.exports = { weeklyReview, reviewMail, LABELS };

if (require.main === module) {
    const store = require('./store');
    const { sendMail } = require('./mail');
    store.ensureSchema()
        .then(() => weeklyReview({ store, send: sendMail }))
        .then(r => {
            console.log(r.sent ? `review list mailed: ${plural(r.accounts, 'account')}` : `review list not mailed (${r.why}): ${plural(r.accounts, 'account')}`);
            process.exit(0);
        }, err => { console.error('review list failed:', err && err.message); process.exit(1); });
}

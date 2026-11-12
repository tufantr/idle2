// Mail from the game: the codes that confirm an email at sign-up and reset a password (api/index.js), and the owner's
// alerts (api/review.js), sent through Resend (README "The server": the domain fantasyidle.com is verified there; the key,
// made by the owner, is RESEND_API_KEY in the server's settings). The tests put their own sender in its place (setMailer).

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = () => process.env.MAIL_FROM || 'Fantasy Idle <noreply@fantasyidle.com>';

let override = null;

/** Swap the sender (the tests catch every mail; null puts Resend back). */
function setMailer(fn) { override = fn; }

async function sendMail({ to, subject, text, html }) {
    if (override) return override({ to, subject, text, html });
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('No mail service: RESEND_API_KEY is not set');
    const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM(), to: [to], subject, text, html })
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`the mail service answered ${res.status} ${detail.slice(0, 200)}`);
    }
}

// Resend's free plan sends 100 mails a day: past them sign-up codes and resets stop until midnight UTC. Every mail the game
// sends is counted in its day (sendCounted, with the rate limits: store.takeAttempt under a key a day), and the one that
// makes MAIL_ALERT_AT tells the owner (OWNER_ALERT_EMAIL), once that day (the research loop's P-100, November 2026).
const DAILY_MAIL_CAP = 100;
const MAIL_ALERT_AT = 80;
const DAY_MS = 24 * 3600 * 1000;

/**
 * Send a mail (as sendMail) and count it in the day's mails (UTC). The count and the owner's alert are the server's
 * bookkeeping: a failure there is logged, never the sender's (a code that went out must still count as sent).
 */
async function sendCounted(store, message, now = Date.now()) {
    await sendMail(message);
    try {
        const key = `mail:day:${new Date(now).toISOString().slice(0, 10)}`;
        const sent = await store.takeAttempt(key, now, DAY_MS);
        const owner = process.env.OWNER_ALERT_EMAIL;
        if (sent === MAIL_ALERT_AT && owner) {
            await sendMail({ to: owner, ...capMail(sent) });
            await store.takeAttempt(key, now, DAY_MS);   // (the alert is one of the day's mails too)
        }
    } catch (err) { console.error('mail count failed', err && err.message); }
}

/** The owner's alert: the day's mails near the plan's cap. */
function capMail(sent) {
    return {
        subject: `Fantasy Idle: ${sent} of today's ${DAILY_MAIL_CAP} mails sent`,
        text: `Fantasy Idle has sent ${sent} mails today (UTC), of the ${DAILY_MAIL_CAP} a day the mail service's plan allows. `
            + 'Past them, sign-up codes and password resets stop until midnight UTC. Many sign-ups or resets at once can do it: '
            + 'the API\'s log shows them (journalctl -u fantasyidle-api).\n'
    };
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A code's mail, in the game's colours: the code big, a line on what it is for, and what to do if it wasn't you. */
function codeMail({ username, code, purpose, minutes }) {
    const forReset = purpose === 'reset';
    const subject = forReset ? `Your Fantasy Idle password code: ${code}` : `Your Fantasy Idle code: ${code}`;
    const lead = forReset ? 'Here is your code to set a new password.' : 'Here is your code to confirm your email and start playing.';
    const ignore = forReset ? 'If you didn\'t ask for a new password, ignore this mail: your password stays as it is.'
        : 'If you didn\'t make an account at fantasyidle.com, ignore this mail.';
    const text = `Hi ${username},\n\n${lead}\n\n${code}\n\nIt works for ${minutes} minutes. ${ignore}\n\nFantasy Idle - https://fantasyidle.com\n`;
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#0d0a07;font-family:Georgia,'Times New Roman',serif;color:#f3e6cc">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" style="max-width:440px;width:100%;background:#1a130c;border:1px solid #b08a4a;border-radius:14px">
<tr><td style="padding:28px 28px 8px;text-align:center;font-size:22px;letter-spacing:2px;color:#fde68a">FANTASY IDLE</td></tr>
<tr><td style="padding:8px 28px;font-size:15px;line-height:1.5">Hi ${escapeHtml(username)},<br>${lead}</td></tr>
<tr><td style="padding:16px 28px;text-align:center"><span style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0d0a07;border:1px solid #f7d88a;font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;color:#fde68a">${code}</span></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:13px;line-height:1.5;color:#c9b48c">It works for ${minutes} minutes. ${ignore}</td></tr>
</table>
<p style="font-size:12px;color:#8a7a5c">fantasyidle.com</p>
</td></tr></table></body></html>`;
    return { subject, text, html };
}

module.exports = { sendMail, sendCounted, setMailer, codeMail, DAILY_MAIL_CAP, MAIL_ALERT_AT };

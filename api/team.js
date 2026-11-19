// The team's tool for clans (the research loop's P-113, November 2026): what the rules promise, "we may edit or clear the
// words, or rename the clan", in one step with a record, instead of SQL on the live database. It runs on the server with the
// API's own settings, as api/review.js does (deploy/vps/team.sh, installed as fantasyidle-team), and has no route: nothing
// here can be reached from outside, and there is no new secret to lose.
//
//   fantasyidle-team list [search]                     every clan, the newest first: its words, its owner, how long they've been away
//   fantasyidle-team clear <clan> --reason "why"       empties its description and "looking for" line
//       [--description "new words"] [--looking-for "new words"]     or puts these in their place
//   fantasyidle-team rename <clan> --reason "why" [--name "New Name"] [--tag NEW]     (neither: "Clan 12" [CC])
//   fantasyidle-team restore <log number> --reason "why"     puts a clan back as that entry found it
//   fantasyidle-team log [how many]                    what the team did, the newest first
//
// <clan> is its number (from `list`) or its exact name; a closed clan still shows in the weeks' rankings it left, so it can be
// renamed too. Each action writes the log, in the same statement as the change, with the words it found (so it can be put back)
// and mails the clan's owner what was done, why and how to ask again. --no-mail: where the law says not to tell them. --no-copy:
// the old words stay out of the log, for what must not be kept (docs/safety's incident steps); such an entry can't be put back.

const { clanRules } = require('./index.js');
const { teamNoticeMail } = require('./mail.js');

const DAY_MS = 24 * 3600 * 1000;
const dateOf = ms => (ms > 0 ? new Date(ms).toISOString().slice(0, 10) : 'never');
const wordsOf = clan => ({ name: clan.name, tag: clan.tag, description: clan.description, lookingFor: clan.lookingFor });

/** The words on a command line: positional ones, and each --option's value (--no-mail and --no-copy take none). */
function parseArgs(argv) {
    const args = [];
    const options = {};
    for (let i = 0; i < argv.length; i++) {
        const word = argv[i];
        if (word === '--no-mail') options.noMail = true;
        else if (word === '--no-copy') options.noCopy = true;
        else if (word.startsWith('--')) options[word.slice(2)] = argv[++i] ?? '';
        else args.push(word);
    }
    return { args, options };
}

/** Run one command. `store` the data layer, `send` the mailer, `print` where its lines go. Returns the exit code. */
async function team(argv, { store, send, now = Date.now(), print = console.log }) {
    const { args: [command, target], options } = parseArgs(argv);
    const { clanWordsOk } = await import('../src/data/social.js');
    const fail = text => { print(text); return 1; };
    const reason = String(options.reason || '').trim();

    const findClan = ref => (/^\d{1,9}$/.test(String(ref)) ? store.teamClan(Number(ref), null) : store.teamClan(null, String(ref)));

    /** The change, its log entry and the owner's mail. `next`: the clan's name, tag and words after it. */
    async function apply(action, clan, next, what) {
        let done;
        try {
            done = await store.teamEditClan({ clanId: clan.id, ...next, action, reason, oldWords: options.noCopy ? '{}' : JSON.stringify(wordsOf(clan)), newWords: JSON.stringify(next), now });
        } catch (err) {
            if (err.code === '23505') return fail(`Another clan is called ${next.name}: nothing changed.`);
            throw err;
        }
        print(`${action}: clan ${clan.id}, ${next.name} [${next.tag}]; ${done.rankings} kept week${done.rankings === 1 ? '' : 's'} rewritten; log #${done.id}`);
        if (options.noMail) print('no mail, as asked');
        else if (!clan.ownerEmail) print('no mail: nobody to tell');
        else {
            try {
                await send({ to: clan.ownerEmail, ...teamNoticeMail({ username: clan.owner, subject: 'About your Fantasy Idle clan', what, why: reason }) });
                print(`the owner, ${clan.owner}, was told`);
            } catch (err) { print(`the mail to the owner failed: ${err && err.message}`); }
        }
        return 0;
    }

    if (command === 'list') {
        for (const c of await store.teamClans(target || '')) {
            const away = c.ownerSaved > 0 ? `${Math.floor((now - c.ownerSaved) / DAY_MS)} days since they played` : 'no upload yet';
            print(`#${c.id} ${c.name} [${c.tag}], ${c.members} member${c.members === 1 ? '' : 's'}, started ${dateOf(c.createdAt)}, owner ${c.owner || 'gone'} (${away})`);
            if (c.description) print(`    description: ${c.description}`);
            if (c.lookingFor) print(`    looking for: ${c.lookingFor}`);
            if (!clanWordsOk(c.description) || !clanWordsOk(c.lookingFor)) print('    ! its words break the rule on links and handles');
        }
        return 0;
    }
    if (command === 'log') {
        for (const e of await store.teamLog(Math.min(1000, Number(target) || 50))) print(`#${e.id} ${new Date(e.at).toISOString().slice(0, 16)} ${e.action} ${e.kind} ${e.subject}: ${e.reason}\n    was ${e.oldWords}\n    now ${e.newWords}`);
        return 0;
    }
    if (!['clear', 'rename', 'restore'].includes(command) || !target) return fail(`Usage: list [search] | clear <clan> | rename <clan> | restore <log number> | log [how many], each change with --reason "why"`);
    if (!reason) return fail('Say why, with --reason "...": it goes in the log and to the clan\'s owner.');

    if (command === 'restore') {
        const entry = /^\d{1,9}$/.test(target) ? await store.teamLogEntry(Number(target)) : null;
        if (!entry || entry.kind !== 'clan') return fail(`No clan's entry #${target} in the log.`);
        const clan = await store.teamClan(entry.subject, null);
        if (!clan) return fail(`Clan ${entry.subject} has left no trace.`);
        const was = JSON.parse(entry.oldWords);
        if (!was.name) return fail(`Entry #${target} kept no copy of what it changed.`);
        return apply('restore', clan, { name: was.name, tag: was.tag, description: was.description, lookingFor: was.lookingFor }, `We put your clan back as it was: ${was.name} [${was.tag}].`);
    }

    const clan = await findClan(target);
    if (!clan) return fail(`No clan ${target}.`);
    if (command === 'clear') {
        if (!clan.open) return fail(`${clan.name} is closed: it has no words left to clear.`);
        const description = clanRules.cleanText(options.description, 200);
        const lookingFor = clanRules.cleanText(options['looking-for'], 100);
        if (!clanWordsOk(description) || !clanWordsOk(lookingFor)) return fail('Those words break the rule on links and handles.');
        return apply('clear', clan, { name: clan.name, tag: clan.tag, description, lookingFor },
            description || lookingFor ? `We changed the description and "looking for" line of your clan, ${clan.name}.` : `We cleared the description and "looking for" line of your clan, ${clan.name}.`);
    }
    const name = options.name === undefined ? (options.tag === undefined ? `Clan ${clan.id}` : clan.name) : clanRules.cleanText(options.name, 32);
    const tag = options.tag === undefined ? (options.name === undefined ? `C${clan.id.toString(36).toUpperCase()}`.slice(0, 5) : clan.tag) : clanRules.cleanText(options.tag, 5).toUpperCase();
    if (!clanRules.CLAN_NAME_RE.test(name)) return fail('Clan names are 3-32 letters, numbers, spaces, \' _ or -.');
    if (!clanRules.CLAN_TAG_RE.test(tag)) return fail('Tags are 2-5 letters or numbers.');
    return apply('rename', clan, { name, tag, description: clan.description, lookingFor: clan.lookingFor }, `We renamed your clan ${clan.name} [${clan.tag}]. It is now ${name} [${tag}].`);
}

module.exports = { team, parseArgs };

if (require.main === module) {
    const store = require('./store');
    const { sendCounted } = require('./mail');
    store.ensureSchema()
        .then(() => team(process.argv.slice(2), { store, send: message => sendCounted(store, message) }))
        .then(code => process.exit(code), err => { console.error('team tool failed:', err && err.message); process.exit(1); });
}

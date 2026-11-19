// The rehearsal before each landing (deploy/vps/rehearse.sh, rehearse.mjs, tools/rehearse-browsers.mjs), tried here on made-up
// accounts (test/helpers/rehearse-fixtures.mjs) with the old game taken from git: what it passes, what it catches, what it
// says. It runs on the staging server over the real data; everything it can do without one is exercised here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURE_NOW, identitiesOf, writeFixtures } from './helpers/rehearse-fixtures.mjs';
import { bothWays, databaseUrlFrom, figureOf, FIGURE_NAMES, formatChecks, loadServerRules, loadTree, lostPaths, parseExpected, readDatabaseAccounts, readFixtureAccounts, runChecks, suiteResult } from '../deploy/vps/rehearse.mjs';

import { flagCheck, readFixtureAccounts } from '../deploy/vps/rehearse.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const OLD_VERSION = 'pre-patch-8a53d4d';
const work = mkdtempSync(join(tmpdir(), 'rehearse-test-'));
after(() => rmSync(work, { recursive: true, force: true }));

// the old game, as it was tagged: its code and its API tests (a checkout without the tag skips what needs it)
const oldDir = join(work, 'old');
const haveOld = (() => {
    mkdirSync(oldDir);
    return spawnSync('bash', ['-c', `git -C "$0" archive ${OLD_VERSION} src test/api.test.cjs | tar -x -C "$1"`, ROOT, oldDir], { timeout: 120000 }).status === 0 && existsSync(join(oldDir, 'src/game.js'));
})();
const needsOld = { skip: haveOld ? false : `no ${OLD_VERSION} here` };

const fixtures = join(work, 'fixtures');
let rows, newTree, oldTree, rules;
before(async () => {
    rows = writeFixtures(fixtures);
    newTree = await loadTree(ROOT);
    if (haveOld) oldTree = await loadTree(oldDir);
    rules = loadServerRules(ROOT);
});

const node = (args, opts = {}) => spawnSync(process.execPath, ['--no-warnings', ...args], { encoding: 'utf8', timeout: 240000, ...opts });
const checksCli = (dir, json) => node([join(ROOT, 'deploy/vps/rehearse.mjs'), 'checks', '--old', oldDir, '--fixtures', dir, '--json', json]);
/** Every name, address, token and id of the accounts, and their heroes' and clans' names: none may be in `text`. */
const assertNoIdentity = (text, accounts = rows) => {
    for (const secret of identitiesOf(accounts)) assert.ok(!text.includes(secret), `the report holds "${secret}"`);
    assert.ok(!text.includes('@fixture.invalid') && !text.includes('qzx'), 'no address, no name');
};

test('over fixture accounts every check passes, and the report is numbers', needsOld, () => {
    const json = join(work, 'report.json');
    const r = checksCli(fixtures, json);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const report = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(report.accounts, rows.length);
    assert.equal(report.saves, rows.filter(a => a.game_state !== null).length);
    const b = report.bothWays;
    assert.deepEqual([b.lost, b.figures, b.failed, b.versionChanged, b.overUploadLimit], [0, {}, {}, 0, 0]);
    assert.deepEqual(b.unreadable, { 'the stored text: SyntaxError': 1 }, 'the save cut off in the middle, counted by its kind');
    assert.equal(b.fine, report.saves - 1);
    assert.equal(report.flags.newlyFlagged, 0);
    assert.deepEqual([report.flags.reviewThisWeek, report.flags.reviewMetrics], [1, { bestStage: 1 }], 'the hero who climbed too fast, on the list');
    assert.deepEqual([report.flags.lapsing, report.flags.accountsCleared, report.flags.standing], [2, 1, 2], "two flags from before the check's versions lapse; the owner's and this version's stand");
    assert.equal(report.completion.fellOtherPart, 0);
    assert.equal(report.completion.fell, report.completion.fellTrialsOnly, 'falls come from the Trials part alone');
    assert.ok(report.completion.rose > 0, 'medals part: each part measured against what the game holds');
    assert.deepEqual(report.verdict, []);
    for (const [name, table] of Object.entries({ powerSummary: report.numbers.powerSummary, boards: report.numbers.boards, plainAttack: report.numbers.plainAttack, clanAttack: report.numbers.clanAttack })) {
        for (const [field, row] of Object.entries(table)) assert.equal(row.differ, 0, `${name} ${field}`);
    }
    assert.ok(Object.keys(report.numbers.powerSummary).length >= 15, 'every field of powerSummary is compared');
    // what is printed and what is written: nothing of any account
    assertNoIdentity(r.stdout);
    assertNoIdentity(r.stderr);
    assertNoIdentity(readFileSync(json, 'utf8'));
});

test('an account the new rules would newly flag fails the rehearsal, and is counted, not named', needsOld, () => {
    const dir = join(work, 'impossible');
    const accounts = writeFixtures(dir, FIXTURE_NOW, { impossible: true });
    const json = join(work, 'impossible.json');
    const r = checksCli(dir, json);
    assert.equal(r.status, 1, r.stdout);
    const { flags, verdict } = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(flags.newlyFlagged, 1);
    assert.deepEqual(flags.newReasons, { 'total XP beyond any possible save': 1 });
    assert.ok(verdict.includes('accounts newly flagged'));
    assertNoIdentity(r.stdout, accounts);
});

test('a figure the save itself decides is judged from the save: a stale stored one flags nobody', async () => {
    // (on the real data: one account's stored laurel figure dated from before a fix to its sum, and its save was fine)
    const dir = join(work, 'stale');
    writeFixtures(dir, FIXTURE_NOW);
    const account = readFixtureAccounts(dir).find(a => a.saveText && a.metricsText);
    const stale = { ...account, metricsText: JSON.stringify({ ...JSON.parse(account.metricsText), laurelsBeyondWeeks: 1 }) };
    const [tree, rules] = [await loadTree(ROOT), loadServerRules(ROOT)];
    const reason = 'more laurels than weeks played';
    assert.equal(flagCheck(stale, tree, rules, FIXTURE_NOW).reasons.has(reason), false);
    assert.equal(flagCheck({ ...stale, saveText: null }, tree, rules, FIXTURE_NOW).reasons.has(reason), true, 'with no save, the stored figure is all there is');
});

test('a save whose figures the new code changes or drops on its way back is caught', needsOld, () => {
    const deep = rows.find(a => a.username === 'fixture_deep_qzx').game_state;
    const lossy = change => ({ ...newTree, Game: class extends newTree.Game { serialize(now) { const s = JSON.parse(super.serialize(now)); change(s); return JSON.stringify(s); } } });
    const figuresAfter = change => bothWays(oldTree, lossy(change), deep, FIXTURE_NOW);
    assert.equal(bothWays(oldTree, newTree, deep, FIXTURE_NOW).outcome, 'ok');
    const lost = figuresAfter(s => { s.gold = 0; s.prestige.tokens = 1; delete s.ascension; delete s.meta.hallGift; s.clanHall.lastGift = 0; s.inventory.pop(); s.equipped.Weapon = null; s.resources.coal = 0; s.skills.mining.xp = 0; s.achievements = {}; s.trials.cleared = {}; s.trials.laurels = 0; s.combat.bestStage = 5; s.combat.maxStage = 5; s.combat.stage = 5; s.prestige.count = 0; });
    assert.equal(lost.outcome, 'lost');
    for (const name of FIGURE_NAMES) assert.ok(lost.figures.includes(name), name);
    assert.deepEqual(figuresAfter(s => { s.stats.kills = 0; }).figures, ['other: stats'], 'nothing may be lost outside the named figures either');
    assert.equal(figuresAfter(s => { s.meta.newField = 1; s.prestige.history = [1, 2]; s.brandNewPart = { a: 1 }; }).outcome, 'ok', 'new optional fields are ignored');
    assert.equal(figuresAfter(s => { s.log = []; s.combat.hp = 1; s.combat.enemy = null; }).outcome, 'ok', 'the moment on screen is not progress');
    // a version that can't load it, or a save the old code itself can't read, is counted by kind
    const failing = bothWays(oldTree, { ...newTree, Game: class { constructor() { throw new RangeError('quoting the save: fixture_deep_qzx'); } } }, deep, FIXTURE_NOW);
    assert.deepEqual([failing.outcome, failing.stage, failing.kind], ['failed', 'new code, load and write', 'RangeError']);
    const noSuchSave = bothWays(oldTree, newTree, '{"cut off', FIXTURE_NOW);
    assert.deepEqual([noSuchSave.outcome, noSuchSave.kind], ['unreadable', 'SyntaxError']);
});

test('every figure the brief names has its pattern; what is the moment\'s is skipped; a list keeps its length', () => {
    const paths = { 'best stage': 'combat.bestStage', tokens: 'prestige.tokens', prestiges: 'prestige.count', Stars: 'ascension.stars', 'skill XP': 'skills.mining.xp', gold: 'gold',
        resources: 'resources.coal', inventory: 'inventory.3.atk', 'equipped pieces': 'equipped.Ring1.tier', medals: 'achievements.slayer_1', laurels: 'trials.laurels', Trials: 'trials.cleared.brutes', 'clan numbers': 'clanHall.lastGift' };
    assert.deepEqual(Object.keys(paths).sort(), [...FIGURE_NAMES].sort());
    for (const [name, path] of Object.entries(paths)) assert.equal(figureOf(path), name);
    assert.equal(figureOf('meta.hallGift'), 'clan numbers');
    assert.equal(figureOf('forge.Weapon.level'), 'other: forge');
    assert.deepEqual(lostPaths({ log: [1], combat: { hp: 1, stage: 2 }, meta: { savedAt: 3 } }, { log: [], combat: { hp: 9, stage: 2 }, meta: { savedAt: 4 } }), []);
    assert.deepEqual(lostPaths({ a: [1, 2] }, { a: [1] }), ['a']);
    assert.deepEqual(lostPaths({ a: { b: 1 } }, { a: { b: 2, c: 3 }, d: 4 }), ['a.b'], 'only what was there is asked for');
    assert.deepEqual(lostPaths({ a: { b: 1 } }, { a: 5 }), ['a']);
});

test("the server's numbers, old against new: a changed field is counted with how far it moved; it fails unless allowed", needsOld, () => {
    const accounts = readFixtureAccounts(fixtures).filter(a => a.saveText && a.saveText.length > 5000).slice(0, 2);
    const doctored = { ...newTree, power: { ...newTree.power, powerSummary: (raw, now) => { const m = newTree.power.powerSummary(raw, now); return { ...m, attackDamage: m.attackDamage * 2, tokens: m.tokens + 1 }; } } };
    const run = opts => runChecks(accounts, { oldTree, newTree: doctored, rules, now: FIXTURE_NOW, ...opts });
    const report = run();
    const row = report.numbers.powerSummary.attackDamage;
    assert.deepEqual([row.compared, row.differ], [2, 2]);
    assert.ok(row.most > 0 && Math.abs(row.mostShare - 1) < 1e-9, 'doubled: a change of 100%');
    assert.equal(report.numbers.powerSummary.tokens.most, 1);
    assert.equal(report.numbers.boards.bestStage.differ, 0);
    assert.ok(report.verdict.includes("the server's numbers changed"));
    assert.ok(formatChecks(report).some(l => /attackDamage: 2 of 2 differ/.test(l)));
    assert.ok(!run({ allowNumberChanges: true }).verdict.includes("the server's numbers changed"), 'a landing meant to move them reports them');
});

test('completion: a fall from another part than the Trials fails the rehearsal', needsOld, () => {
    const accounts = readFixtureAccounts(fixtures).filter(a => a.saveText && a.saveText.length > 5000).slice(0, 1);
    const worse = { ...newTree, completion: state => { const c = newTree.completion(state); return { ...c, share: c.share - 0.01, parts: c.parts.map(p => (p.id === 'skills' ? { ...p, share: p.share - 0.1 } : p)) }; } };
    const report = runChecks(accounts, { oldTree, newTree: worse, rules, now: FIXTURE_NOW });
    assert.deepEqual([report.completion.fellOtherPart, report.completion.partsFallen], [1, { skills: 1 }]);
    assert.ok(report.verdict.includes('completion parts other than the Trials fell'));
});

test('the database is read for numbers only, and only the staging database is read', async () => {
    const env = join(work, 'settings.env');
    writeFileSync(env, 'NODE_ENV=production\nDATABASE_URL=postgresql://fantasyidle@/fantasyidle_staging?host=/var/run/postgresql\nJWT_SECRET=x\n');
    assert.equal(databaseUrlFrom(env), 'postgresql://fantasyidle@/fantasyidle_staging?host=/var/run/postgresql');
    writeFileSync(env, 'DATABASE_URL="postgresql://fantasyidle@/fantasyidle?host=/var/run/postgresql"\n');
    assert.throws(() => databaseUrlFrom(env), err => err.name === 'SettingsError' && !err.message.includes('postgresql'), "live's address is refused");
    const asked = [];
    const dbPath = require.resolve(join(ROOT, 'api/database.js'));
    const kept = require.cache[dbPath];
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sql: (strings, ...values) => { asked.push(strings.join('$')); assert.deepEqual(values, []); return Promise.resolve({ rows: [{ game_state: '{"gold":5}', last_saved: '1700000000000', flags: '[]', metrics: null, email_verified_at: '0' }] }); } } };
    try {
        const accounts = await readDatabaseAccounts(ROOT, 'postgresql://fantasyidle@/fantasyidle_staging?host=/nowhere');
        assert.deepEqual(accounts, [{ saveText: '{"gold":5}', flagsText: '[]', metricsText: null, lastSaved: 1700000000000, verifiedAt: 0 }]);
    } finally { if (kept) require.cache[dbPath] = kept; else delete require.cache[dbPath]; delete process.env.DATABASE_URL; }
    assert.equal(asked.length, 1);
    assert.ok(!/username|email\b|password|\bid\b/.test(asked[0].replace('email_verified_at', '').replace('ORDER BY id', '')), 'no column that names anyone');
});

test('the list of intended changes: test name, reason; every entry names a test the old version really has', needsOld, () => {
    const expected = parseExpected(readFileSync(join(ROOT, 'deploy/vps/rehearse-expected.txt'), 'utf8'));
    assert.ok(expected.size >= 4);
    const oldTests = readFileSync(join(oldDir, 'test/api.test.cjs'), 'utf8');
    for (const [name, reason] of expected) {
        assert.ok(oldTests.includes(name.replaceAll("'", "\\'")) || oldTests.includes(name), `the old suite has: ${name}`);
        assert.ok(reason.length > 10, `a reason for: ${name}`);
    }
    assert.deepEqual([...parseExpected('# a comment\n\nsome test: a | b | the reason\n')], [['some test: a | b', 'the reason']]);
    assert.throws(() => parseExpected('a line without its reason'));
});

test('a suite: failures on the list are allowed, others count only if they come back when it is run again', async () => {
    const dir = join(work, 'suites');
    mkdirSync(dir);
    const once = join(dir, 'failed-once');
    const suite = (name, body) => { const file = join(dir, name); writeFileSync(file, `const { test } = require('node:test');\nconst { existsSync, writeFileSync } = require('node:fs');\n${body}`); return file; };
    const file = suite('api.test.cjs', `
        test('passes', () => {});
        test('allowed to fail', () => { throw new Error('as intended'); });
        test('fails every time', () => { throw new Error('really'); });
        test('fails once', () => { if (!existsSync(${JSON.stringify(once)})) { writeFileSync(${JSON.stringify(once)}, ''); throw new TypeError('fetch failed'); } });`);
    const r = await suiteResult(file, new Map([['allowed to fail', 'a reason'], ['no longer fails', 'a reason']]));
    assert.deepEqual(r.unexpected, ['fails every time']);
    assert.deepEqual(r.flaky, ['fails once']);
    assert.deepEqual(r.allowedFailures, ['allowed to fail']);
    assert.deepEqual(r.noLongerFailing, ['no longer fails']);
    assert.equal(r.broken, null);
    const broken = await suiteResult(suite('broken.test.cjs', "require('./nothing-here');"));
    assert.ok(broken.broken, 'a file that cannot start is told apart from a failed test');
});

// rehearse.sh with its server-side commands stood in for: root, runuser, createdb and dropdb, chown
function fakeServer(name, { oldBody, newBody = "test('this version passes', () => {});", setup = null }) {
    const base = join(work, name);
    const release = join(base, 'release'), old = join(base, 'old'), bin = join(base, 'bin');
    mkdirSync(join(release, 'deploy/vps'), { recursive: true }); mkdirSync(join(release, 'test'), { recursive: true }); mkdirSync(join(old, 'test'), { recursive: true }); mkdirSync(bin);
    for (const f of ['rehearse.sh', 'rehearse.mjs', 'rehearse-expected.txt']) cpSync(join(ROOT, 'deploy/vps', f), join(release, 'deploy/vps', f));
    symlinkSync(join(ROOT, 'src'), join(release, 'src')); symlinkSync(join(ROOT, 'api'), join(release, 'api')); symlinkSync(join(ROOT, 'test/helpers'), join(release, 'test/helpers'));
    symlinkSync(join(oldDir, 'src'), join(old, 'src'));
    const suite = body => `const { test } = require('node:test');\n${body}\n`;
    writeFileSync(join(release, 'test/api.test.cjs'), suite(newBody));
    writeFileSync(join(old, 'test/api.test.cjs'), suite(oldBody));
    if (setup) writeFileSync(join(release, 'deploy/vps/staging-setup.sh'), setup);
    const log = join(base, 'commands.log');
    const stub = (cmd, body) => { writeFileSync(join(bin, cmd), `#!/bin/sh\n${body}\n`); chmodSync(join(bin, cmd), 0o755); };
    stub('id', 'echo 0');
    stub('chown', 'exit 0');
    stub('runuser', 'shift 3; exec "$@"');   // runuser -u <user> -- <command...>
    stub('createdb', `echo "createdb $*" >> "${log}"`);
    stub('dropdb', `echo "dropdb $*" >> "${log}"`);
    const env = join(base, 'api-staging.env');
    writeFileSync(env, 'DATABASE_URL=postgresql://fantasyidle@/fantasyidle_staging?host=/nowhere\nJWT_SECRET=do-not-print-me\n');
    return { release, old, log, env, run: extra => spawnSync('bash', [join(release, 'deploy/vps/rehearse.sh'), '--old', old, '--env-file', env, ...extra], { encoding: 'utf8', timeout: 280000, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } }) };
}
const made = log => readFileSync(log, 'utf8').trim().split('\n').map(l => l.split(' ').at(-1));

test('rehearse.sh: the whole run, in a database it makes and always drops; old failures on the list pass', needsOld, () => {
    const server = fakeServer('passes', { oldBody: "test('sign-up needs an email, and the account plays once the code mailed there is entered', () => { throw new Error('intended'); });\ntest('an old test that still passes', () => {});" });
    const r = server.run(['--fixtures', fixtures]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /REHEARSAL PASSED/);
    assert.match(r.stdout, /Saves both ways: \d+ fine/);
    assert.match(r.stdout, /1 failed, 1 of them on the list of intended changes/);
    const log = readFileSync(server.log, 'utf8');
    assert.match(log, /createdb -O fantasyidle fantasyidle_rehearse_\d+\n/);
    assert.match(log, /createdb -O fantasyidle fantasyidle_rehearse_\d+_old\n/);
    assert.equal(new Set(made(server.log)).size, 2, 'two databases, one for each suite');
    for (const db of new Set(made(server.log))) assert.ok(log.trimEnd().split('\n').slice(-2).join(' ').includes(`--force ${db}`), `${db} dropped at the end`);
    assertNoIdentity(r.stdout);
    assert.ok(!r.stdout.includes('do-not-print-me') && !r.stdout.includes('postgresql://'), 'the settings are never printed');
});

test('rehearse.sh: a new failure of the old tests fails the run, and the database is dropped all the same', needsOld, () => {
    const server = fakeServer('fails', { oldBody: "test('a test nobody meant to break', () => { throw new Error('broken'); });" });
    const r = server.run(['--fixtures', fixtures]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /NOT ON THE LIST: a test nobody meant to break/);
    assert.match(r.stdout, /REHEARSAL FAILED: the API tests/);
    assert.match(readFileSync(server.log, 'utf8'), /dropdb --if-exists --force fantasyidle_rehearse_\d+/);
});

test('rehearse.sh: the data refresh is run first and says only which dump; without the database the checks report that they could not run', needsOld, () => {
    const setup = '#!/usr/bin/env bash\necho "pg_restore: row with fixture_deep_qzx@fixture.invalid"\necho "staging data: fantasyidle-2026-11-19T0330Z.dump"\n';
    const server = fakeServer('refresh', { oldBody: "test('old', () => {});", setup });
    const r = server.run([]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^staging data: fantasyidle-2026-11-19T0330Z\.dump$/m);
    assert.ok(!r.stdout.includes('fixture_deep_qzx') && !r.stdout.includes('pg_restore'), 'what the restore printed stays out');
    assert.match(r.stdout, /The rehearsal could not run: \w+/);
    assert.match(r.stdout, /REHEARSAL FAILED: the checks \(did not run\)/);
    assert.match(readFileSync(server.log, 'utf8'), /dropdb --if-exists --force/, 'the API tests still ran, and their database went');
    const refused = fakeServer('nodata', { oldBody: "test('old', () => {});", setup: '#!/usr/bin/env bash\nexit 3\n' }).run([]);
    assert.equal(refused.status, 2);
    assert.match(refused.stdout, /the data refresh failed/);
});

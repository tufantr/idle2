#!/usr/bin/env node
// The rehearsal's checks (deploy/vps/rehearse.sh runs them on the staging server, over a fresh copy of the live data, as the
// app's user; README "The server"). The release under test and the old game are imported side by side, each from its own
// folder, and every account goes through both:
//
//   1. every save, both ways: the new code loads it and writes it, the old code loads what it wrote, and what the old code
//      then holds must match what it makes of the original (new optional fields aside): a rollback loses nothing;
//   2. the growth check and flags, with the new rules, from each account's stored numbers and its save;
//   3. completion, old against new;
//   4. the server's numbers (powerSummary, plainAttack, the boards' metrics, a clan attack), old against new.
//
// And, as `api-tests`, this version's API tests and the old version's against this server (in a database rehearse.sh makes
// and drops), the old ones' failures weighed against deploy/vps/rehearse-expected.txt.
//
//   node deploy/vps/rehearse.mjs checks --old <dir> (--env-file <file> | --fixtures <dir>) [--now <ms>] [--allow-number-changes] [--json <file>]
//   node deploy/vps/rehearse.mjs api-tests --old <dir> (--env-file <file> --database <name> --old-database <name> | --memory) --work <dir> [--json <file>]
//
// Exit 0: all well; 1: a check failed; 2: it could not run. What it prints is numbers, the checks' own words and test names,
// never anything from an account: rows are read without their names, addresses and ids, a save that fails is counted by the
// kind of its error, and the game's own logging is silenced (test/rehearse.test.mjs reads the report for every fixture name).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { run as runTests } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const RELEASE = resolve(HERE, '..', '..');

const DAY = 24 * 3600 * 1000;
const OLD_FLAG_MEMORY_MS = 30 * DAY;      // how long the old server counted a stored flag, whatever wrote it
const REVIEW_WINDOW_MS = 7 * DAY;         // the review list's mail covers the past week (api/review.js)
const UPLOAD_LIMIT_BYTES = 1024 * 1024;   // the API takes a body up to 1 MB (express.json in api/index.js)
const SUITE_TIMEOUT_MS = 30 * 60 * 1000;
export const STAGING_DB = 'fantasyidle_staging';

// ---------- the two versions ----------

/** One version's game, from its folder: `Game`, the save's code, the server's stat code and completion. */
export async function loadTree(dir) {
    const at = rel => import(pathToFileURL(join(dir, rel)).href);
    const [game, state, power, completion, random] = await Promise.all([
        at('src/game.js'), at('src/core/state.js'), at('src/core/power.js'), at('src/systems/completion.js'), at('src/core/rng.js')
    ]);
    return { dir, Game: game.Game, SAVE_VERSION: state.SAVE_VERSION, power, completion: completion.completion, rng: random.rng, seededRandom: random.seededRandom };
}

/** The new server's rules for an upload (api/index.js). Its module only builds the app: nothing listens or connects. */
export function loadServerRules(dir) {
    const api = createRequire(join(dir, 'api', 'index.js'))(join(dir, 'api', 'index.js'));
    for (const name of ['plausibilityFlags', 'firstPeaks', 'flagStands', 'RANKED']) if (!api[name]) throw new Error(`api/index.js exports no ${name}`);
    return api;
}

// ---------- where the accounts come from ----------

const parseJson = text => { try { return { value: JSON.parse(text) }; } catch (err) { return { error: err }; } };
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A row as the checks take it. Nothing that names the account comes along. */
const accountOf = row => ({ saveText: row.game_state ?? null, flagsText: row.flags ?? '[]', metricsText: row.metrics ?? null, lastSaved: num(row.last_saved), verifiedAt: num(row.email_verified_at) });

/** The accounts of a fixture folder (test/helpers/rehearse-fixtures.mjs): one row a file. */
export function readFixtureAccounts(dir) {
    return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => accountOf(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
}

/** The staging database's address, from the API's settings file. Never printed. */
export function databaseUrlFrom(envFile) {
    const line = readFileSync(envFile, 'utf8').split('\n').map(l => l.trim()).find(l => /^(DATABASE_URL|POSTGRES_URL)=/.test(l));
    const url = line ? line.slice(line.indexOf('=') + 1).replace(/^(["'])(.*)\1$/, '$2') : '';
    if (!url.includes(`@/${STAGING_DB}?`)) throw Object.assign(new Error('the settings do not point at the staging database'), { name: 'SettingsError' });
    return url;
}

/** Every account in the staging database (a read: the rehearsal writes nothing there), without its name, address or id. */
export async function readDatabaseAccounts(dir, url) {
    process.env.DATABASE_URL = url;
    delete process.env.POSTGRES_URL;
    const { sql } = createRequire(join(dir, 'api', 'database.js'))(join(dir, 'api', 'database.js'));
    const { rows } = await sql`SELECT game_state, last_saved, flags, metrics, email_verified_at FROM users ORDER BY id`;
    return rows.map(accountOf);
}

// ---------- one save, both ways ----------

// What a loaded save holds that is the moment's, not the hero's: the fight on screen, the clocks of the last visit, the log.
const MOMENT = new Set(['log', 'meta.savedAt', 'meta.lastActiveAt', 'meta.lastInputAt', 'combat.hp', 'combat.enemy', 'combat.enemyAt',
    'combat.playerTimer', 'combat.enemyTimer', 'combat.combo', 'combat.lastComboAt', 'combat.lastClickAt', 'combat.lifestealRoom', 'combat.cleaveCarry']);

// The progress figures the check names, each a pattern over the paths of a loaded save. What differs elsewhere is named by
// its section of the save: nothing may be lost there either.
const FIGURES = [
    ['best stage', /^combat\.bestStage$/], ['tokens', /^prestige\.tokens$/], ['prestiges', /^prestige\.count$/], ['Stars', /^ascension\.stars$/],
    ['skill XP', /^skills\./], ['gold', /^gold$/], ['resources', /^resources\./], ['inventory', /^inventory(\.|$)/], ['equipped pieces', /^equipped\./],
    ['medals', /^achievements\./], ['laurels', /^trials\.laurels$/], ['Trials', /^trials\./], ['clan numbers', /^(clanHall|clanBanner|clanResult)(\.|$)|^meta\.hallGift$|^stats\.clan/]
];
export const FIGURE_NAMES = FIGURES.map(([name]) => name);

/** The name a differing path is counted under: a figure's, or its section's (a section is a key of the game's own state). */
export function figureOf(path) {
    for (const [name, pattern] of FIGURES) if (pattern.test(path)) return name;
    return `other: ${path.split('.')[0]}`;
}

const isObject = v => v !== null && typeof v === 'object';

/**
 * The paths where `after` doesn't hold what `before` holds. Only what `before` has is asked for: a field the new code added
 * is no loss. Lists must keep their length, entry by entry.
 */
export function lostPaths(before, after, path = '', out = []) {
    if (MOMENT.has(path)) return out;
    if (Array.isArray(before)) {
        if (!Array.isArray(after) || after.length !== before.length) { out.push(path); return out; }
        before.forEach((v, i) => lostPaths(v, after[i], `${path}.${i}`, out));
    } else if (isObject(before)) {
        if (!isObject(after) || Array.isArray(after)) { out.push(path); return out; }
        for (const key of Object.keys(before)) lostPaths(before[key], after[key], path ? `${path}.${key}` : key, out);
    } else if (before !== after) out.push(path);
    return out;
}

const seeded = (tree, seed) => tree.rng.setSource(tree.seededRandom(seed));   // the same dice for each load (gear remade, the first monster)
const kindOf = err => (err && typeof err.name === 'string' && /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'Error');

/**
 * Load a save, write it, load that. Throws with `stage` set. Both versions go through this: what the old code holds after
 * loading and writing a save itself is what the new code's writing is held to (a load isn't quite idempotent: a piece's old
 * levels move to its slot one load at a time, in the old code as in the new).
 */
function loadAndWrite(tree, raw, now, seed, stage) {
    try {
        seeded(tree, seed);
        const game = new tree.Game(raw, now);
        return { state: game.state, text: game.serialize(now) };
    } catch (err) { throw Object.assign(err instanceof Error ? err : new Error('thrown'), { stage }); }
}

/**
 * One save through both versions: { outcome: 'ok' | 'unreadable' | 'failed', ... }. 'unreadable': not JSON, or the old code
 * itself can't load it: no fault of this release, and counted apart. `oldState`, `newState`: each version's reading.
 */
export function bothWays(oldTree, newTree, saveText, now, seed = 1) {
    const parsed = parseJson(saveText);
    if (parsed.error) return { outcome: 'unreadable', stage: 'the stored text', kind: kindOf(parsed.error) };
    const raw = parsed.value;
    let original;
    try { original = loadAndWrite(oldTree, raw, now, seed, 'old code, the original'); } catch (err) { return { outcome: 'unreadable', stage: err.stage, kind: kindOf(err) }; }
    try {
        const baseline = JSON.parse(loadAndWrite(oldTree, JSON.parse(original.text), now, seed, 'old code, its own writing').text);
        const written = loadAndWrite(newTree, raw, now, seed, 'new code, load and write');
        const wrote = JSON.parse(written.text);
        const after = JSON.parse(loadAndWrite(oldTree, wrote, now, seed, "old code, the new code's writing").text);
        const figures = [...new Set(lostPaths(baseline, after).map(figureOf))];
        return { outcome: figures.length ? 'lost' : 'ok', figures, bytes: Buffer.byteLength(written.text), versionKept: wrote.version === oldTree.SAVE_VERSION, oldState: original.state, newState: written.state };
    } catch (err) { return { outcome: 'failed', stage: err.stage || 'comparing', kind: kindOf(err) }; }
}

// ---------- the growth check and flags ----------

const flagsOf = text => { const p = parseJson(text || '[]'); return Array.isArray(p.value) ? p.value.filter(isObject) : []; };
const metricsOf = text => { const p = text ? parseJson(text) : {}; return isObject(p.value) && !Array.isArray(p.value) ? p.value : null; };
/** The reasons an upload of this save is flagged for beside the numbers (api/index.js POST /api/save): developer switches. */
function switchesOn(save) {
    const s = isObject(save?.settings) ? save.settings : {};
    return s.devUnlockAll === true || (typeof s.forceEvent === 'string' && !!s.forceEvent) ? ['developer switches on'] : [];
}

const FROM_THE_SAVE = /laurels than weeks|Trial tiers beyond|Trial past the best stage|attack beyond/;

/**
 * The new rules over one account, for the account's stored numbers as they stand (`stored`: the last upload again, whose
 * growth the day's window still shows) and for its save uploaded again now (`next`).
 */
export function flagCheck(account, tree, rules, now, seed = 1) {
    const { plausibleAttackDamage, honestClimb, powerSummary } = tree.power;
    const check = (peaks, metrics, at) => rules.plausibilityFlags(peaks, metrics, at, plausibleAttackDamage, honestClimb);
    const metrics = metricsOf(account.metricsText);
    const out = { reasons: new Set(), storedReview: [], nextReview: [], unreadable: false };
    if (metrics) {
        const stored = check(metrics.peaks, metrics, account.lastSaved);
        // (only growth is judged from the stored numbers: a figure the save itself decides, such as its laurels against its
        // weeks, is worked out again from the save below, since a stored one can date from before a fix to its sum)
        stored.flags.filter(r => account.saveText === null || !FROM_THE_SAVE.test(r)).forEach(r => out.reasons.add(r));
        out.storedReview = stored.review.map(g => g.key);
    }
    const save = account.saveText === null ? {} : parseJson(account.saveText);
    if (save.error || account.saveText === null) { out.unreadable = !!save.error; return out; }
    try {
        seeded(tree, seed);
        const fresh = powerSummary(save.value, now);
        const peaks = metrics ? metrics.peaks : account.verifiedAt > 0 ? rules.firstPeaks(account.verifiedAt) : null;
        const next = check(peaks, fresh, now);
        next.flags.forEach(r => out.reasons.add(r));
        switchesOn(save.value).forEach(r => out.reasons.add(r));
        out.nextReview = next.review.map(g => g.key);
    } catch { out.unreadable = true; }
    return out;
}

// ---------- old against new ----------

const POINT = 1e-9;   // shares this close are the same

/** Completion, old against new, for one save: the totals, and which parts fell. */
export function completionChange(oldTree, newTree, oldState, newState) {
    const before = oldTree.completion(oldState), after = newTree.completion(newState);
    const parts = new Map(before.parts.map(p => [p.id, p.share]));
    const fell = after.parts.filter(p => parts.has(p.id) && p.share < parts.get(p.id) - POINT).map(p => p.id);
    return { before: before.share, after: after.share, change: after.share - before.share, fell };
}

const sameNumber = (a, b) => a === b || (Number.isNaN(a) && Number.isNaN(b));

/** A running count, per field: how many saves differ, and by how much at most (absolutely, and as a share of the old value). */
function tally(table, field, a, b) {
    const row = table[field] ||= { compared: 0, differ: 0, most: 0, mostShare: 0 };
    row.compared++;
    if (sameNumber(a, b)) return;
    row.differ++;
    if (Number.isFinite(a) && Number.isFinite(b)) {
        row.most = Math.max(row.most, Math.abs(b - a));
        row.mostShare = Math.max(row.mostShare, Math.abs(b - a) / Math.max(Math.abs(a), 1e-9));
    }
}

const BOARD_METRICS = ['bestStage', 'totalLevel', 'titanKills', 'dungeonClears', 'weeklyTrial'];   // the leaderboards' numbers (METRICS in api/index.js)

/** The server's numbers for one raw save, old against new, into `numbers` ({ powerSummary, plainAttack, boards, clanAttack }). */
export function compareNumbers(oldTree, newTree, raw, now, numbers, seed = 1) {
    // (the same dice in each: the oldest saves' gear is remade as they load)
    const both = fn => [oldTree, newTree].map(t => { seeded(t, seed); return fn(t); });
    const [a, b] = both(t => t.power.powerSummary(raw, now));
    for (const key of Object.keys(a)) tally(numbers.powerSummary, key, a[key], b[key]);
    for (const key of BOARD_METRICS) tally(numbers.boards, key, a[key], b[key]);
    tally(numbers.plainAttack, 'plainAttack', ...both(t => t.power.plainAttack(raw, now)));
    tally(numbers.clanAttack, 'clanAttack', ...both(t => t.power.clanAttackFromSave(raw, [], t.power.CLAN_FIGHT_MS, now, 0).damage));
}

// ---------- all the accounts ----------

const bump = (table, key, by = 1) => { table[key] = (table[key] || 0) + by; };

/** Every check over every account: the report, numbers and the checks' own words only. */
export function runChecks(accounts, { oldTree, newTree, rules, now, allowNumberChanges = false }) {
    const report = {
        accounts: accounts.length, saves: 0,
        bothWays: { fine: 0, failed: {}, unreadable: {}, lost: 0, figures: {}, versionChanged: 0, largestKb: 0, overUploadLimit: 0 },
        flags: { newlyFlagged: 0, newReasons: {}, flaggedAgain: 0, reviewThisWeek: 0, reviewMetrics: {}, reviewNextUpload: 0, lapsing: 0, accountsCleared: 0, standing: 0, unreadable: 0 },
        completion: { compared: 0, rose: 0, same: 0, fell: 0, fellTrialsOnly: 0, fellOtherPart: 0, partsFallen: {}, largestFall: 0, largestFallTrialsOnly: 0, largestRise: 0 },
        numbers: { powerSummary: {}, boards: {}, plainAttack: {}, clanAttack: {}, unreadable: {} }
    };
    accounts.forEach((account, i) => {
        const hasSave = account.saveText !== null;
        const seed = 1000 + i;
        if (hasSave) {
            report.saves++;
            const r = bothWays(oldTree, newTree, account.saveText, now, seed);
            const b = report.bothWays;
            if (r.outcome === 'unreadable') bump(b.unreadable, `${r.stage}: ${r.kind}`);
            else if (r.outcome === 'failed') bump(b.failed, `${r.stage}: ${r.kind}`);
            else {
                if (r.outcome === 'lost') { b.lost++; r.figures.forEach(f => bump(b.figures, f)); } else b.fine++;
                if (!r.versionKept) b.versionChanged++;
                b.largestKb = Math.max(b.largestKb, Math.ceil(r.bytes / 1024));
                if (r.bytes > UPLOAD_LIMIT_BYTES) b.overUploadLimit++;
                const c = completionChange(oldTree, newTree, r.oldState, r.newState);
                const part = report.completion;
                part.compared++;
                part.largestRise = Math.max(part.largestRise, c.change);
                c.fell.filter(id => id !== 'trials').forEach(id => bump(part.partsFallen, id));
                const others = c.fell.some(id => id !== 'trials');
                if (others) part.fellOtherPart++;
                if (c.change > POINT) part.rose++;
                else if (c.change < -POINT) {
                    part.fell++;
                    part.largestFall = Math.max(part.largestFall, -c.change);
                    if (!others && c.fell.includes('trials')) { part.fellTrialsOnly++; part.largestFallTrialsOnly = Math.max(part.largestFallTrialsOnly, -c.change); }
                } else part.same++;
                try { compareNumbers(oldTree, newTree, JSON.parse(account.saveText), now, report.numbers, seed); } catch (err) { bump(report.numbers.unreadable, kindOf(err)); }
            }
        }
        // the flags, whether or not there is a save to read (stored numbers and stored flags stand alone)
        const f = report.flags;
        const check = flagCheck(account, newTree, rules, now, seed);
        if (check.unreadable) f.unreadable++;
        const stored = flagsOf(account.flagsText);
        const known = new Set(stored.map(x => x.reason));
        const fresh = [...check.reasons].filter(r => !known.has(r));
        if (fresh.length) { f.newlyFlagged++; fresh.forEach(r => bump(f.newReasons, r)); }
        else if (check.reasons.size) f.flaggedAgain++;
        if (check.storedReview.length && now - account.lastSaved < REVIEW_WINDOW_MS) { f.reviewThisWeek++; check.storedReview.forEach(k => bump(f.reviewMetrics, k)); }
        if (check.nextReview.length) f.reviewNextUpload++;
        const counted = stored.filter(x => now - num(x.at) < OLD_FLAG_MEMORY_MS);
        const stands = stored.filter(x => rules.flagStands(x, now));
        f.lapsing += counted.filter(x => !rules.flagStands(x, now)).length;
        f.standing += stands.length;
        if (counted.length && !stands.length) f.accountsCleared++;
    });
    report.verdict = verdict(report, { allowNumberChanges });
    return report;
}

const changedFields = table => Object.entries(table).filter(([, row]) => row.differ > 0);

/** What failed, in the checks' words: nothing means this part of the rehearsal passed. */
function verdict(report, { allowNumberChanges }) {
    const { bothWays: b, flags: f, completion: c, numbers: n } = report;
    const out = [];
    if (Object.keys(b.failed).length) out.push('saves that failed to load or write');
    if (b.lost) out.push('saves that lost something');
    if (b.versionChanged) out.push('the save version changed');
    if (b.overUploadLimit) out.push('saves past the upload limit');
    if (f.newlyFlagged) out.push('accounts newly flagged');
    if (c.fellOtherPart) out.push('completion parts other than the Trials fell');
    if (!allowNumberChanges && [n.powerSummary, n.boards, n.plainAttack, n.clanAttack].some(t => changedFields(t).length)) out.push("the server's numbers changed");
    if (Object.keys(n.unreadable).length) out.push("saves the server's numbers could not be read from");
    return out;
}

// ---------- the report ----------

const figure = v => (Number.isInteger(v) && Math.abs(v) < 1e15 ? String(v) : Number(v).toPrecision(4));
const many = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const points = share => (share * 100).toFixed(2);
const counts = table => Object.entries(table).map(([k, v]) => `${k} ${v}`).join(', ');

/** The checks' part of the summary, line by line. */
export function formatChecks(r) {
    const { bothWays: b, flags: f, completion: c, numbers: n } = r;
    const lines = [`${many(r.accounts, 'account')}, ${r.saves} with a save`];
    lines.push(`1. Saves both ways: ${b.fine} fine, ${b.lost} lost something, ${Object.values(b.failed).reduce((x, y) => x + y, 0)} failed, ${Object.values(b.unreadable).reduce((x, y) => x + y, 0)} unreadable before this release too`);
    if (Object.keys(b.failed).length) lines.push(`   failed: ${counts(b.failed)}`);
    if (Object.keys(b.unreadable).length) lines.push(`   unreadable: ${counts(b.unreadable)}`);
    if (b.lost) lines.push(`   differ after the old code reads them back: ${counts(b.figures)}`);
    lines.push(`   largest save written ${b.largestKb} KB, ${b.overUploadLimit} over the upload limit${b.versionChanged ? `, ${b.versionChanged} with another save version` : ''}`);
    lines.push(`2. Flags: ${f.newlyFlagged} newly flagged${f.newlyFlagged ? ` (${counts(f.newReasons)})` : ''}, ${f.flaggedAgain} flagged again for what they were flagged for before`);
    lines.push(`   weekly review list: ${many(f.reviewThisWeek, 'account')} by their last upload this past week${f.reviewThisWeek ? ` (${counts(f.reviewMetrics)})` : ''}, ${f.reviewNextUpload} by their next upload`);
    lines.push(`   stored flags: ${f.lapsing} lapse (${many(f.accountsCleared, 'account')} no longer flagged), ${f.standing} stand${f.unreadable ? `; ${many(f.unreadable, 'save')} could not be read for it` : ''}`);
    lines.push(`3. Completion: ${c.rose} rose, ${c.fell} fell, ${c.same} the same; largest fall ${points(c.largestFall)} points, largest rise ${points(c.largestRise)}`);
    lines.push(`   falls from the Trials part alone (R8): ${c.fellTrialsOnly}, at most ${points(c.largestFallTrialsOnly)} points; saves where another part fell: ${c.fellOtherPart}${c.fellOtherPart ? ` (${counts(c.partsFallen)})` : ''}`);
    const fields = [['powerSummary', n.powerSummary], ['plainAttack', n.plainAttack], ['leaderboard metrics', n.boards], ['clan attack', n.clanAttack]];
    const changed = fields.flatMap(([label, t]) => changedFields(t).map(([k, row]) => `   ${label} ${k}: ${row.differ} of ${row.compared} differ, by at most ${figure(row.most)} (${figure(row.mostShare * 100)}%)`));
    const compared = fields.reduce((sum, [, t]) => sum + Object.keys(t).length, 0);
    lines.push(`4. Server numbers: ${changed.length ? `${changed.length} of ${compared} fields differ` : `all ${compared} fields the same`}`);
    lines.push(...changed);
    if (Object.keys(n.unreadable).length) lines.push(`   could not be read: ${counts(n.unreadable)}`);
    return lines;
}

// ---------- the API tests ----------

/** The list of intended changes: `test name | reason` a line, # for comments. */
export function parseExpected(text) {
    const map = new Map();
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const at = line.lastIndexOf(' | ');
        if (at < 0) throw new Error('a line of the expected list has no reason');
        map.set(line.slice(0, at).trim(), line.slice(at + 3).trim());
    }
    return map;
}

/** One test file in a process of its own: the names of the tests that passed and failed, and whether the file ran at all. */
export async function runSuite(file, { timeoutMs = SUITE_TIMEOUT_MS } = {}) {
    const passed = [], failed = [];
    let broken = null;
    delete process.env.NODE_TEST_CONTEXT;   // (inside a test run, node:test refuses to start another)
    const signal = AbortSignal.timeout(timeoutMs);
    try {
        const name = file.split('/').pop();
        for await (const ev of runTests({ files: [file], concurrency: 1, signal })) {
            if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
            const d = ev.data;
            if (d.nesting !== 0 || d.skip !== undefined || d.todo !== undefined) continue;
            if (d.name === name || d.name === file) { if (ev.type === 'test:fail') broken = 'the file did not run'; continue; }   // the file itself, when it could not start
            (ev.type === 'test:pass' ? passed : failed).push(d.name);
        }
    } catch (err) { broken = kindOf(err); }
    if (signal.aborted) broken = 'timed out';
    if (!broken && !passed.length && !failed.length) broken = 'no tests ran';
    return { passed, failed, broken };
}

/**
 * A suite run, and if it failed anywhere it should not have, run once more: on a busy machine a connection can drop, and a
 * failure counts only if it comes back. `allowed`: test names that may fail. Returns its counts and the names that matter.
 */
export async function suiteResult(file, allowed = new Map()) {
    const first = await runSuite(file);
    const bad = r => r.failed.filter(name => !allowed.has(name));
    let unexpected = bad(first), flaky = [], last = first;
    if (first.broken || unexpected.length) {
        last = await runSuite(file);
        const again = new Set(last.broken ? [...unexpected] : bad(last));
        flaky = unexpected.filter(name => !again.has(name));
        unexpected = [...again];
    }
    const failedNames = new Set(last.failed);
    return { passed: last.passed.length, failed: last.failed.length, broken: last.broken, unexpected, flaky, allowedFailures: [...allowed.keys()].filter(n => failedNames.has(n)), noLongerFailing: [...allowed.keys()].filter(n => !failedNames.has(n) && !last.broken) };
}

/** The old version's test file beside this release's server and game: `<work>/old-suite/test/api.test.cjs`. */
export function layOutOldSuite(oldDir, newDir, work) {
    const root = join(work, 'old-suite');
    rmSync(root, { recursive: true, force: true });
    mkdirSync(join(root, 'test'), { recursive: true });
    copyFileSync(join(oldDir, 'test', 'api.test.cjs'), join(root, 'test', 'api.test.cjs'));
    symlinkSync(join(newDir, 'test', 'helpers'), join(root, 'test', 'helpers'));   // (the in-memory store as this server needs it)
    symlinkSync(join(newDir, 'api'), join(root, 'api'));
    symlinkSync(join(newDir, 'src'), join(root, 'src'));
    return join(root, 'test', 'api.test.cjs');
}

/** Both suites, each in its throwaway database (or in memory): the report's second half. */
export async function runApiTests({ oldDir, newDir, work, databaseUrl = null, oldDatabaseUrl = null, expectedFile }) {
    const expected = parseExpected(readFileSync(expectedFile, 'utf8'));
    for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'RESEND_API_KEY', 'OWNER_ALERT_EMAIL', 'JWT_SECRET']) delete process.env[key];
    process.env.NODE_PATH = join(newDir, 'api', 'node_modules');
    const useDatabase = url => { if (url) process.env.API_TEST_DATABASE_URL = url; else delete process.env.API_TEST_DATABASE_URL; };
    useDatabase(databaseUrl);
    const current = await suiteResult(join(newDir, 'test', 'api.test.cjs'));
    useDatabase(oldDatabaseUrl);
    const old = await suiteResult(layOutOldSuite(oldDir, newDir, work), expected);
    const report = { on: databaseUrl ? 'Postgres' : 'the in-memory store', current, old };
    report.verdict = [...(current.broken ? ["this version's API tests did not run"] : []), ...(current.unexpected.length ? ["this version's API tests failed"] : []),
        ...(old.broken ? ["the old version's API tests did not run"] : []), ...(old.unexpected.length ? ["the old version's API tests failed where no change was intended"] : [])];
    return report;
}

/** The API tests' part of the summary. */
export function formatApiTests(r) {
    const { current: c, old: o } = r;
    const lines = [`5. This version's API tests, on ${r.on}: ${c.passed} passed, ${c.failed} failed${c.broken ? ` (${c.broken})` : ''}`];
    for (const name of c.unexpected) lines.push(`   FAILED: ${name}`);
    if (c.flaky.length) lines.push(`   passed when run again: ${c.flaky.length}`);
    lines.push(`6. The old version's API tests against this server: ${o.passed} passed, ${o.failed} failed${o.broken ? ` (${o.broken})` : ''}, ${o.allowedFailures.length} of them on the list of intended changes`);
    for (const name of o.unexpected) lines.push(`   NOT ON THE LIST: ${name}`);
    for (const name of o.noLongerFailing) lines.push(`   on the list, but passed: ${name}`);
    if (o.flaky.length) lines.push(`   passed when run again: ${o.flaky.length}`);
    return lines;
}

// ---------- the command ----------

const say = line => process.stdout.write(`${line}\n`);
/** The game and the server log as they run; nothing of theirs may reach this report. */
function silenceLogging() { for (const level of ['log', 'info', 'warn', 'error', 'debug', 'trace']) console[level] = () => {}; }

function finish(report, json, lines) {
    if (json) writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
    lines.forEach(say);
    for (const problem of report.verdict) say(`CHECK FAILED: ${problem}`);
    return report.verdict.length ? 1 : 0;
}

async function checks(o) {
    if (!o.old || !(o.fixtures || o['env-file'])) throw Object.assign(new Error('--old, and --fixtures or --env-file'), { name: 'UsageError' });
    const accounts = o.fixtures ? readFixtureAccounts(o.fixtures) : await readDatabaseAccounts(RELEASE, databaseUrlFrom(o['env-file']));
    const [oldTree, newTree] = await Promise.all([loadTree(resolve(o.old)), loadTree(RELEASE)]);
    const metaFile = o.fixtures && join(o.fixtures, 'now.txt');
    const now = Number(o.now) || (metaFile && existsSync(metaFile) ? Number(readFileSync(metaFile, 'utf8')) : Date.now());
    const report = runChecks(accounts, { oldTree, newTree, rules: loadServerRules(RELEASE), now, allowNumberChanges: !!o['allow-number-changes'] });
    return finish(report, o.json, formatChecks(report));
}

async function apiTests(o) {
    if (!o.old || !o.work) throw Object.assign(new Error('--old, --work'), { name: 'UsageError' });
    let databaseUrl = null, oldDatabaseUrl = null;
    if (!o.memory) {
        const urlFor = name => {
            if (!/^[a-z0-9_]{1,63}$/.test(name || '') || name === STAGING_DB) throw Object.assign(new Error('--database, --old-database'), { name: 'UsageError' });
            return databaseUrlFrom(o['env-file']).replace(`@/${STAGING_DB}?`, `@/${name}?`);
        };
        [databaseUrl, oldDatabaseUrl] = [urlFor(o.database), urlFor(o['old-database'])];
    }
    const report = await runApiTests({ oldDir: resolve(o.old), newDir: RELEASE, work: resolve(o.work), databaseUrl, oldDatabaseUrl, expectedFile: join(HERE, 'rehearse-expected.txt') });
    return finish(report, o.json, formatApiTests(report));
}

async function main() {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
        old: { type: 'string' }, fixtures: { type: 'string' }, 'env-file': { type: 'string' }, now: { type: 'string' }, json: { type: 'string' },
        database: { type: 'string' }, 'old-database': { type: 'string' }, memory: { type: 'boolean' }, work: { type: 'string' }, 'allow-number-changes': { type: 'boolean' } } });
    silenceLogging();
    const command = positionals[0];
    if (command === 'checks') return checks(values);
    if (command === 'api-tests') return apiTests(values);
    throw Object.assign(new Error('checks or api-tests'), { name: 'UsageError' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main().then(code => { process.exitCode = code; process.stdout.write('', () => process.exit(code)); }, err => {
        // the kind of error only: a driver's or a parser's message can quote what it was reading
        process.stdout.write(`The rehearsal could not run: ${err && err.name === 'UsageError' ? `usage (${err.message})` : kindOf(err)}\n`, () => process.exit(2));
    });
}

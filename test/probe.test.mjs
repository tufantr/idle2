// deploy/vps/probe.sh: the hourly look at the live game through nginx (the page, the API, an upload as big as a save, and
// nginx's own log). Run here against a stand-in server; the real one is https://fantasyidle.com through 127.0.0.1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'deploy/vps/probe.sh');

/** A stand-in for nginx and the API: `answers` maps 'GET /', 'GET /api/health' and 'POST /api/save' to a status. */
async function standIn(answers) {
    const seen = [];
    const server = createServer((req, res) => {
        let size = 0;
        req.on('data', chunk => { size += chunk.length; });
        req.on('end', () => {
            const key = `${req.method} ${req.url}`;
            seen.push({ key, size, type: req.headers['content-type'] || '' });
            res.writeHead(answers[key] ?? 404).end();
        });
    });
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    return { origin: `http://127.0.0.1:${server.address().port}`, seen, close: () => server.close() };
}

/** Run the probe, quiet, against `origin`, with an nginx log holding `logLines`. */
function probe(origin, logLines = []) {
    const dir = mkdtempSync(join(tmpdir(), 'probe-'));
    const log = join(dir, 'error.log');
    writeFileSync(log, logLines.map(l => `${l}\n`).join(''));
    const env = { ...process.env, PROBE_ORIGIN: origin, PROBE_ERROR_LOG: log, PROBE_STAMP: join(dir, 'stamp') };
    return new Promise(done => execFile('bash', [SCRIPT, '--quiet'], { env }, (err, stdout, stderr) => done({ code: err ? err.code : 0, out: stdout + stderr, dir })));
}

/** nginx's time stamp, `minutesAgo` before now (its log is in UTC on the server). */
function stamp(minutesAgo) {
    const d = new Date(Date.now() - minutesAgo * 60000);
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const WELL = { 'GET /': 200, 'GET /api/health': 200, 'POST /api/save': 401 };

test('a game that answers as it should is well: the page, the API, and an upload refused only for its missing account', async () => {
    const s = await standIn(WELL);
    try {
        const r = await probe(s.origin);
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /is well/);
        const upload = s.seen.find(x => x.key === 'POST /api/save');
        assert.ok(upload, 'it uploads');
        assert.ok(upload.size >= 200000, `the upload is as big as a save (${upload.size} bytes)`);
        assert.match(upload.type, /application\/json/);
    } finally { s.close(); }
});

test('an upload that fails before the account is looked at is found (19 November: nginx could not buffer a save)', async () => {
    const s = await standIn({ ...WELL, 'POST /api/save': 500 });
    try {
        const r = await probe(s.origin);
        assert.equal(r.code, 1);
        assert.match(r.out, /an upload as big as a save answered 500/);
    } finally { s.close(); }
});

test('the page or the API down is found', async () => {
    const s = await standIn({ ...WELL, 'GET /api/health': 502 });
    try {
        const r = await probe(s.origin);
        assert.equal(r.code, 1);
        assert.match(r.out, /the API answered 502/);
    } finally { s.close(); }
});

test("nginx's own failures of the last hour are found, without the player's address; older ones and warnings are not", async () => {
    const s = await standIn(WELL);
    try {
        const line = `${stamp(5)} [crit] 2395505#2395505: *99523 open() "/var/lib/nginx/body/0000046122" failed (13: Permission denied), client: 203.0.113.9, server: fantasyidle.com, request: "POST /api/save HTTP/2.0"`;
        const r = await probe(s.origin, [`${stamp(200)} [crit] an old one`, `${stamp(3)} [warn] a warning`, line]);
        assert.equal(r.code, 1);
        assert.match(r.out, /nginx logged 1 failures in the last hour, the first: \[crit\].*Permission denied/);
        assert.doesNotMatch(r.out, /203\.0\.113\.9/);
        // thousands of them, as on 19 November (a pipe cut short must not stop the script)
        const many = await probe(s.origin, Array.from({ length: 5000 }, () => line));
        assert.equal(many.code, 1, many.out);
        assert.match(many.out, /nginx logged 5000 failures in the last hour/);
        const quiet = await probe(s.origin, [`${stamp(200)} [crit] an old one`, `${stamp(3)} [warn] a warning`]);
        assert.equal(quiet.code, 0, quiet.out);
    } finally { s.close(); }
});

test('a quiet look (a deploy) sends no mail and leaves the hourly mail\'s stamp alone', async () => {
    const s = await standIn({ ...WELL, 'POST /api/save': 500 });
    try {
        const r = await probe(s.origin);
        assert.equal(r.code, 1);
        assert.doesNotMatch(r.out, /alert sent/);
        assert.equal(existsSync(join(r.dir, 'stamp')), false);
    } finally { s.close(); }
});

test('every deploy installs the hourly look and ends with one; the unit runs the release in place', () => {
    const activate = readFileSync(join(ROOT, 'deploy/vps/activate.sh'), 'utf8');
    assert.match(activate, /fantasyidle-probe\.service deploy\/vps\/fantasyidle-probe\.timer \/etc\/systemd\/system\//);
    assert.match(activate, /systemctl enable --now fantasyidle-probe\.timer/);
    assert.match(activate, /bash "\$REL\/deploy\/vps\/probe\.sh"/);
    const unit = readFileSync(join(ROOT, 'deploy/vps/fantasyidle-probe.service'), 'utf8');
    assert.match(unit, /ExecStart=\/bin\/bash \/srv\/fantasyidle\/current\/deploy\/vps\/probe\.sh/);
    assert.match(unit, /ConditionPathExists=\/srv\/fantasyidle\/current\/deploy\/vps\/probe\.sh/);
    assert.match(readFileSync(join(ROOT, 'deploy/vps/fantasyidle-probe.timer'), 'utf8'), /OnCalendar=hourly/);
    // the gate's cookie goes in as a header read from a file, never on curl's command line (where `ps` shows it)
    assert.doesNotMatch(readFileSync(SCRIPT, 'utf8'), /-H "Cookie:/);
});

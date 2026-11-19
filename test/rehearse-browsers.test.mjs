// tools/rehearse-browsers.mjs without a browser: the headers and the API's origins, against the tool's stand-in for staging, and
// what it prints. (Its browsers run by hand, against the stand-in or staging; see the tool's head.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('tools/rehearse-browsers.mjs: headers and origins checked against a stand-in for staging, never printing the private link', () => {
    const gate = 'qzxprivategate0123456789';
    const r = spawnSync(process.execPath, ['--no-warnings', join(ROOT, 'tools/rehearse-browsers.mjs'), '--local', '--no-browsers'], { encoding: 'utf8', timeout: 120000, env: { ...process.env, REHEARSE_STAND_IN_GATE: gate } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /ok +the API gives another site no access/);
    assert.match(r.stdout, /ok +the game: the frame rules are nginx-staging\.conf's/);
    assert.match(r.stdout, /all well/);
    assert.ok(!(r.stdout + r.stderr).includes(gate), 'the gate never appears');
});

// The server's files (deploy/vps/, README "The server") tell the operator which script to run next: each one they name
// must exist (they named deploy/vps/cloudflare.sh, which is deploy/vps/cloudflare.mjs, run with node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every file the server\'s scripts and settings name under deploy/vps exists', () => {
    const missing = [];
    for (const name of readdirSync(join(ROOT, 'deploy/vps'))) {
        const text = readFileSync(join(ROOT, 'deploy/vps', name), 'utf8');
        for (const [, path] of text.matchAll(/(deploy\/vps\/[\w.-]+\.\w+)/g)) if (!existsSync(join(ROOT, path))) missing.push(`${name}: ${path}`);
    }
    assert.deepEqual(missing, []);
});

test("the night's cleanup comes with the server's setup: after the backup, with the API's settings, and the journal kept 30 days", () => {
    const file = name => readFileSync(join(ROOT, 'deploy/vps', name), 'utf8');
    const provision = file('provision.sh');
    for (const name of ['fantasyidle-cleanup.service', 'fantasyidle-cleanup.timer', 'fantasyidle-cleanup-alert.service']) assert.ok(provision.includes(name), `provision.sh installs ${name}`);
    assert.match(provision, /systemctl enable --now fantasyidle-cleanup\.timer/);
    assert.match(provision, /MaxRetentionSec=30day/);
    assert.match(provision, /journald\.conf\.d/);
    const service = file('fantasyidle-cleanup.service');
    assert.match(service, /^ExecStart=\/usr\/bin\/node api\/cleanup\.js$/m);
    assert.match(service, /^EnvironmentFile=\/etc\/fantasyidle\/api\.env$/m);
    assert.match(service, /^User=fantasyidle$/m);
    assert.match(service, /^OnFailure=fantasyidle-cleanup-alert\.service$/m);
    assert.match(file('fantasyidle-cleanup-alert.service'), /backup-alert\.sh cleanup/);
    assert.match(file('backup-alert.sh'), /"\$MODE" = cleanup/);
    const at = text => /OnCalendar=\*-\*-\* (\d\d):(\d\d)/.exec(text).slice(1, 3).join(':');
    assert.ok(at(file('fantasyidle-cleanup.timer')) > '03:30', 'after the night\'s dump (03:30 UTC)');
    assert.match(provision, new RegExp(`OnCalendar=\\*-\\*-\\* 03:30:00 UTC`));
});

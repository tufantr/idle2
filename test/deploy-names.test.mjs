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

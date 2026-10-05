// Every module the browser loads parses. The unit tests import the logic, never src/main.js or most of
// src/ui, so a slip there (a stray `else`) would otherwise show only as a blank page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []));

test('every module under src/ parses', () => {
    const broken = files(SRC).filter(f => spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }).status !== 0);
    assert.deepEqual(broken, []);
});

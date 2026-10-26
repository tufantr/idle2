// A member's clan power (src/data/social.js clanPowerOf; the owner, October 2026: heroes orders of magnitude apart, and
// only the strongest member's attacks moved the clan boss): an attack counts by how far the hero has climbed against the
// clan, within bounds, the members averaging one, so a clan whose members all fight fells the boss as fast whoever is
// strong. tools/clanpower.mjs runs the same checks on 20,000 random clans and the levels a week.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CLAN_POWER, clanPowerOf } from '../src/data/social.js';

const near = (a, b, why = '') => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b} ${why}`);
const powers = stages => stages.map(s => clanPowerOf(s, stages));
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;

test('members average one, whatever their spread, and alike they are one each', () => {
    for (const stages of [[500], [500, 500, 500], [200, 1000], [1090, 1260], [25, 3000], [76, 90, 90, 104, 200, 422, 482, 977], [25, 25, 25, 25, 5000]]) near(mean(powers(stages)), 1, stages.join(','));
    assert.deepEqual(powers([500, 500, 500]), [1, 1, 1]);
    assert.equal(clanPowerOf(300, []), 1, 'nobody to measure against: an average member');
});

test('four times as deep counts twice as much; nobody counts more than four times another; deeper never counts less', () => {
    const [weak, strong] = powers([100, 400]);
    near(strong / weak, 2);
    assert.equal(CLAN_POWER.max / CLAN_POWER.min, 4);
    const far = powers([25, 30, 5000]);
    near(Math.max(...far) / Math.min(...far), 4, 'the bounds hold however far apart');
    const ladder = [25, 40, 90, 150, 300, 600, 1200, 2400];
    const p = powers(ladder);
    for (let i = 1; i < p.length; i++) assert.ok(p[i] >= p[i - 1], `${ladder[i]} counts at least as much as ${ladder[i - 1]}`);
});

test('the shares of two members far apart: by depth, never all or nothing', () => {
    // a stage-200 hero beside a stage-1,000 one: their damage is some 10^13 apart, their shares about 31% and 69%
    const [a, b] = powers([200, 1000]);
    near(a / (a + b), 1 / (1 + Math.sqrt(5)));
    // a member outside the clan's count (flagged, or away all week) is measured against those in it
    near(clanPowerOf(200, [1000]), CLAN_POWER.min / 1, 'five times shallower than the only one counted: the floor');
});

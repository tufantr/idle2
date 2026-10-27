---
path: /talents
keywords: war tree, talents, talent, talent points, talent tree, combat level past 99, levels past 99, blade, bulwark, hunt, capstone, respec, unlearn, deathblow, execute, opening blow, patient hunter, relentless, unbreakable, second wind
---
[[Combat]]'s levels don't stop at {{MAX_LEVEL}}. They go on along the same [[XP table]], each one slower to come than the last, and every combat level past {{MAX_LEVEL}} brings a **talent point** for the War Tree: three trees of talents, in the shape of the old talent trees of World of Warcraft. It is the long road of the late game: the first points come in hours, the thirty-first in a couple of weeks, and filling one tree takes months.

## Points

- The first point comes at combat level 100. Combat's XP used to stop at twice level {{MAX_LEVEL}}'s, which is level {{combatLevelForXp(2 * XP_FOR_MAX_LEVEL)}}, so a hero who had reached that cap has {{combatLevelForXp(2 * XP_FOR_MAX_LEVEL) - MAX_LEVEL}} points at once.
- The levels past {{MAX_LEVEL}} count for nothing but the War Tree: every bonus that comes with combat levels stops at {{MAX_LEVEL}}, as it always did. The fight shows your hero's level past {{MAX_LEVEL}}.
- The purse shows your talent points beside your skill points; tap it, or the Perks button, for the War Tree.

## The trees

- **Blade**: his attack. Harder swings, critical hits, a big first swing at a boss, and bosses that fall when their health runs low.
- **Bulwark**: staying up. Health and armour, blows turned aside, and a dodge that strikes back. It matters most where the blows are heavy: [[Trials]], [[Dungeons|dungeons]] and [[The Titan]].
- **Hunt**: the boss's clock, the loot and the climb. More time against a boss, a quicker retry after one holds out, more gold, drops and essence, and more from the Lords.

Each tree has {{ROWS}} rows. The first row is open from the start; each row after opens once you have spent {{ROW_POINTS}} more points in that tree, so the last row opens at {{ROW_POINTS * (ROWS - 1)}} and its one talent, the tree's **capstone**, is the {{ROW_POINTS * (ROWS - 1) + 1}}st point. A talent that an arrow points to also needs the talent above it at its full rank. Each talent has one to five ranks, and a point buys one rank.

There are {{TALENT_POINTS_MAX}} points' worth of talents in all, far more than any hero will have, so a tree is a choice: one capstone, or two trees halfway.

## Learning and unlearning

Tap a talent to see what it does now and at its next rank, then **Learn** to spend a point. A talent where a point can go has a green frame, a full one a gold frame, and one whose row or arrow isn't open yet is dim.

**Unlearn all** gives every point back to spend again. It costs {{fmt(RESPEC.essence)}} [[Monster Essence|essence]] the first time and {{RESPEC.growth}} times as much each time after.

## Where talents count

Talents count in every fight: the stage ladder, [[Dungeons|dungeon runs]], [[The Titan]] and [[Trials]]. In the clan boss's fight ([[Clans and leaderboards|Clans]]) only their stats count, not their rules, since the server reckons that fight. A [[Trials|Trial]]'s rule still wins: under Glass Hero the first blow that lands fells your hero, whatever the Bulwark says.

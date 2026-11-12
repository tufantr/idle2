// The stage-1,300 hero a day away: the replay in one go against the replay in 40 ms slices (CPU time), in Node.
const root = process.argv[2];
const mode = process.argv[3];   // 'one' | 'sliced'
const { Game } = await import(`${root}/src/game.js`);
const { readFile } = await import('node:fs/promises');
const raw = JSON.parse(await readFile('boot-l2-heroes/hero-1300.json', 'utf8'));
const now = raw.meta.savedAt + 24 * 3600000;
const game = new Game(raw, now);
const c0 = process.cpuUsage();
let slices = 0;
if (mode === 'one') game.resumeFromSave(now);
else {
    const run = game.beginResume(now);
    for (;;) { const until = performance.now() + 40; slices++; if (run.step(() => performance.now() >= until)) break; }
}
const c = process.cpuUsage(c0);
console.log(JSON.stringify({ mode, cpuMs: Math.round((c.user + c.system) / 1000), slices, kills: game.state.stats.kills - raw.stats.kills, prestiges: game.state.prestige.count - raw.prestige.count }));

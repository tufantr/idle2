
**A replay a slice at a time, behind a bar** (November 2026, the research loop's R20). A day away deep in the climb with
Auto prestige is seconds of work: the boot replayed it in one task with only the sidebar's title drawn, 6.8–7.4 s at
Chrome's 4× CPU throttle for a stage-1,300 hero (`docs/research_notes/research-loop/047-measurements-left.md` §3). The
replay is a generator now (`offlineReplay`, a slice each game minute), stepped by `Game.beginResume` and `beginGap`; the page
replays about 40 ms at a time and lets the browser draw between (`catchUp` in `src/main.js`). From a quarter of a second a
dialog shows a bar of the time replayed with the stage and the gold climbing beside it (at work, the skill's level and what
it makes), and the welcome-back takes its place at the end. It ends exactly as the replay in one go: until it is over
nothing plays, saves or draws the game, and anything that acts on it (a tick, an action, a save) finishes the replay first
(`test/catchup.test.mjs` compares the final saves, reports and events). A tab back from sleep takes the same path, and
signed in the time away is replayed once, for the game the sync chooses (§3.17).

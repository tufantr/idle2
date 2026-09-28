# Fantasy Idle

A browser idle RPG in the spirit of Melvor Idle: train gathering and production skills, forge your
own gear, fight through ten zones and an endless Abyss, and prestige for permanent power. Plain
JavaScript (ES modules, no build step), with an optional Express + Vercel Postgres API for cloud saves.

**Docs:** [Game design](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) ·
[Research report](docs/reports/Fantasy%20Idle%20game%20design%20research.md) · [Research notes](docs/research_notes/)

## Play locally

The game is static files, but ES modules need to be served over HTTP (opening `index.html` directly
won't work):

```bash
npx serve .            # or: python3 -m http.server 8000
```

Then open the printed URL. Add `?dev=1` to unlock every tab and mini-game immediately. Without the
API the game runs as a guest with a local save, and the login dialog says cloud saves aren't
available on that server.

## Cloud saves (optional)

`api/index.js` is an Express app deployed as a Vercel serverless function (`vercel.json` routes
`/api/*` to it). It needs:

- `POSTGRES_URL` (and the other `@vercel/postgres` variables) — the `users` table is created on boot
- `JWT_SECRET` — **required in production**; the API refuses to sign tokens without it

Endpoints: `POST /api/register`, `POST /api/login`, `POST /api/save`, `GET /api/load`.

## Tests and balance tools

Node 22+, no install needed for the game tests (the API tests use the packages in `api/node_modules`):

```bash
node --test test/*.test.mjs test/*.test.cjs   # 28 tests: game logic, saves, API, regressions
node tools/pacing.mjs                           # hours of training to reach each skill level
node tools/simulate.mjs --hours=150 --seed=1    # plays the whole game headlessly, prints milestones
```

## Project layout

```
index.html, style.css   page shell and styles
src/game.js             Game class: state, tick and every player action (no DOM)
src/core/               XP curve, formulas, modifier pipeline, state/migration, saves
src/data/               content tables: resources, skills, workshop, items, zones, perks, achievements
src/systems/            skilling, combat, inventory, prestige, camp, mini-games, offline, daily
src/ui/                 rendering and formatting
api/                    Express API for Vercel
test/, tools/           tests, simulator, pacing table
docs/                   design, roadmap, research
```

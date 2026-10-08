# Fantasy Idle

A browser idle RPG in the spirit of Melvor Idle: name your hero and pick a look, train twelve skills
at Melvor's pace (level 99 is hundreds of hours, and earns the skill's cape) and master every action
in them, forge your own gear, fight through ten zones and an endless Abyss, clear six dungeons, face
the hourly Titan, build an agility course, fill a bestiary, and prestige for
permanent power and a rank worn as the hero's cloak. Daily crates (every seventh a great one) and
weekend events bring bonuses, Festival Tokens and an event shop. Painted places, pixel sprites,
synthesized sound; it plays on a phone too. Optional accounts add cloud saves, clans with a weekly shared boss,
and opt-in leaderboards. Plain JavaScript (ES modules, no build step), with an Express + Vercel
Postgres API.

**Play:** [fantasy-idle.vercel.app](https://fantasy-idle.vercel.app) (cloud saves, clans and leaderboards wait
for the database; see [Deploy](#deploy)).

**Docs:** [Game design](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) ·
[Research report](docs/reports/Fantasy%20Idle%20game%20design%20research.md) · [Research notes](docs/research_notes/)

## Play locally

The game is static files, but ES modules need to be served over HTTP (opening `index.html` directly
won't work):

```bash
python3 tools/serve.py   # or: npx serve .   (or python3 -m http.server 8000, then reload with Ctrl+Shift+R after a change)
```

Then open the printed URL. On a local host (localhost, 127.0.0.1, *.localhost, *.test) add `?dev=1` to unlock every tab and mini-game immediately, and
`?dev=1&event=guild_fair` (or `harvest_festival`, `titans_fury`, `miners_rush`, `gold_fever`, `lucky_paws`) to run a weekend event
now. Without the API the game runs as a guest with a local save, and the login dialog says cloud
saves aren't available on that server.

## The API (cloud saves, clans, leaderboards)

`api/index.js` is an Express app deployed as a Vercel serverless function (`vercel.json` routes
`/api/*` to it). It needs:

- `POSTGRES_URL` (and the other `@vercel/postgres` variables) — tables are created on the first request
- `JWT_SECRET` — **required in production**; the API refuses to sign tokens without it

The API imports the game's own stat code (`src/core/power.js`, ES modules — `src/package.json` marks
them as such) so that clan damage and leaderboard numbers are computed on the server from the stored
save. It needs Node 20.19+ or 22+.

| Endpoint | What it does |
|---|---|
| `POST /api/register`, `POST /api/login` | accounts (bcrypt, JWTs valid 30 days) |
| `POST /api/save`, `GET /api/load` | cloud save; load returns the server's clock for offline time; uploads are checked for plausibility and flagged, never rejected |
| `GET /api/clans`, `POST /api/clans`, `POST /api/clans/join`, `POST /api/clans/leave` | find, start, join and leave clans (up to 20 members) |
| `GET /api/clan`, `POST /api/clan/attack`, `POST /api/clan/kick` | your clan, its weekly boss and board; attack (3 a day, damage computed on the server); the owner removes a member |
| `GET /api/rewards`, `POST /api/rewards/claim` | clan rewards, claimed once |
| `POST /api/leaderboard/consent`, `GET /api/leaderboard` | opt in or out; boards by best stage, total level, Titans or dungeon clears |

## Deploy

The live game is the Vercel project `fantasy-idle` (team "skinbaba1-3986's projects"), production at
https://fantasy-idle.vercel.app. It is not connected to Git: a deploy uploads exactly what is committed on
the branch, never `art/`, `runs/` or `shots/`:

```bash
rm -rf /tmp/fi-deploy && mkdir /tmp/fi-deploy && git archive claude/intelligent-einstein-y5i5iq | tar -x -C /tmp/fi-deploy
cd /tmp/fi-deploy && npx vercel link --yes --project fantasy-idle --scope skinbaba1-3986s-projects && npx vercel deploy --prod --yes
```

Without `POSTGRES_URL` and `JWT_SECRET` (above) the API answers "Database unavailable" and the game
plays as a guest with its save in the browser.

## Tests and balance tools

Node 22+, no install needed (the API tests use the packages in `api/node_modules`):

```bash
node --test test/*.test.mjs test/*.test.cjs   # game logic, loot, endgame, skills, mastery, events, saves, API
node tools/pacing.mjs                           # hours of training to reach each skill level
node tools/simulate.mjs --hours=150 --seed=1    # plays the whole game headlessly, prints milestones
node tools/shots.mjs                            # screenshots at desktop and phone widths, checks layout
```

`tools/shots.mjs` serves the game itself, shoots the main tabs (or `node tools/shots.mjs combat,farming`,
or `--fresh` for a new player's first screens) into `shots/`, and fails if anything scrolls sideways or
the page logs an error. It needs Playwright once: `npm i --no-save playwright && npx playwright install chromium`.

The API tests use an in-memory store by default. To run the same tests against a real Postgres
(checks the SQL in `api/store.js`), install `pg` somewhere on `NODE_PATH` and point them at a
throwaway database — the tests drop and recreate the tables:

```bash
API_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5432/idle_test NODE_PATH=/path/to/node_modules \
  node --test test/api.test.cjs
```

Simulator options: `--no-dungeons`, `--no-titan`, `--farm-ladder` (farm instead of dungeons),
`--farm-ladder=push` (keep fighting at the wall), `--verbose`, `--snapshot=H`.

## Project layout

```
index.html, style.css   page shell and styles
src/game.js             Game class: state, tick and every player action (no DOM)
src/core/               XP curve, formulas, modifier pipeline, state/migration, saves, server-side power
src/data/               content tables: resources, skills, workshop, items, zones, dungeons, pets,
                        farming, agility, camp, perks, achievements, unlocks, events, mastery,
                        social settings
src/systems/            skilling, combat, dungeons & Titan, inventory, farming, agility, prestige,
                        camp, mini-games, offline, daily, events, mastery, clan rewards,
                        disclosure (which pieces of the screens a player has met)
src/ui/                 rendering and formatting
api/                    Express API for Vercel: routes, data layer, connection
test/, tools/           tests, simulator, pacing table
docs/                   design, roadmap, research
```

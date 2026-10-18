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
now. On a local host the game also plays as a guest (the live site needs an account); without the API
the login dialog says cloud saves aren't available on that server.

## The API (cloud saves, clans, leaderboards)

`api/index.js` is an Express app deployed as a Vercel serverless function (`vercel.json` routes
`/api/*` to it and runs it in Frankfurt, `fra1`). It needs:

- a Postgres database: `DATABASE_URL` or `POSTGRES_URL`, a pooled connection string — tables are
  created on the first request
- `JWT_SECRET` — **required in production**; the API refuses to sign tokens without it

On Vercel, both are set by the owner, once:

1. Project `fantasy-idle` → **Storage** → **Create Database** → **Neon** (free plan), region
   **Frankfurt** (next to the function), then **Connect Project** for Production and Preview. Leave
   Development unticked: `vercel link` would copy the database password into the deploy folder.
2. Project → **Settings** → **Environment Variables**: `JWT_SECRET`, a long random value (for example
   from `openssl rand -hex 32`), for Production and Preview.
3. Deploy again (below): a deployment keeps the variables it was built with.

https://fantasy-idle.vercel.app/api/health then answers `{"ok":true,"db":true,"secret":true,"game":true}`;
a `false` names the missing part (`game`: the function could not load the game's stat code).

**A gift to a player** (gold, essence or diamonds) is one row in the database. In Vercel → Storage →
`fantasy-idle-db` → Open in Neon → SQL Editor (the label in the key makes a second run give nothing):

```sql
INSERT INTO rewards (user_id, kind, payload, created_at, dedupe)
SELECT id, 'gift', '{"gold":12000000,"text":"A gift from tufan"}', (extract(epoch from now()) * 1000)::bigint, 'gift:' || id || ':first-gold'
FROM users WHERE username = 'Yarraksalih'
ON CONFLICT (dedupe) DO NOTHING;
```

(The name exactly as the account spells it: names are one account whatever their case now, but two older
accounts could differ only in case, and a match in any case would pay both.)

The player's game claims it at its next cloud save or load (a reload at the latest), adds it and shows a
card; each gift is paid once. Gift gold is that run's, like all gold.

The API imports the game's own stat code (`src/core/power.js`, ES modules — `src/package.json` marks
them as such) so that clan damage and leaderboard numbers are computed on the server from the stored
save. It needs Node 20.19+ or 22+.

| Endpoint | What it does |
|---|---|
| `POST /api/register`, `POST /api/login` | accounts (bcrypt, JWTs valid 30 days); a sign-up gives an email, and the account plays once the code mailed there is entered (until then a login answers 409, `pending`) |
| `POST /api/verify`, `POST /api/verify/resend` | the sign-up code (6 digits, 15 minutes, 5 tries), and another one (once a minute, 5 an hour) |
| `POST /api/password/forgot`, `POST /api/password/reset` | a code to the account's email, then a new password (the same answer whether an account has the address or not) |
| `POST /api/save`, `GET /api/load` | cloud save; load returns the server's clock for offline time; uploads are checked for plausibility and flagged, never rejected; both say the clan's banner |
| `GET /api/clans`, `POST /api/clans`, `POST /api/clans/join`, `POST /api/clans/leave` | find, start, join and leave clans (up to 20 members) |
| `GET /api/clan`, `POST /api/clan/attack`, `POST /api/clan/kick` | your clan, its weekly boss, board and banner; an attack as it was fought (the strike times; the damage is computed on the server; 3 a day, banked up to 6); the owner removes a member |
| `GET /api/rewards`, `POST /api/rewards/claim` | clan rewards paid before October 2026 (the clan banner took their place), claimed once |
| `POST /api/gifts/claim` | the owner's gifts to a player (below), claimed by the game when a save or load says some wait |
| `POST /api/leaderboard/consent`, `GET /api/leaderboard` | opt in or out; boards by best stage, total level, Titans or dungeon clears |

## The server (fantasyidle.com)

Since October 2026 the game runs at **https://fantasyidle.com**, and its wiki at **https://wiki.fantasyidle.com**,
on the owner's RackNerd VPS (Ubuntu 24.04, 2 cores, 2 GB, `75.127.4.7`) behind Cloudflare (DNS, proxy, HTTPS). It
started with a fresh database; the Vercel site below is the old one, kept as it was.

- **Access:** SSH as root with a key only (passwords are refused): Claude Code's `~/.ssh/fantasyidle_ed25519` or the
  owner's `~/.ssh/id_ed25519`, the server's key pinned in `~/.ssh/known_hosts_fantasyidle`
  (`SHA256:ab8cloJyK4pnTBqAHsnpVPjVpO7JpC5UQmLgQkRUL64`). RackNerd's web console still takes the root password.
- **Safety:** the firewall lets in SSH from anywhere and the web only from Cloudflare's addresses, so nobody reaches
  the game around Cloudflare and the visitor's address it reports can be trusted (the API's login limits count it);
  fail2ban; security updates install themselves.
- **What runs:** nginx serves the game's files and the wiki, and passes `/api/` to the API (systemd
  `fantasyidle-api`, Node 22, `deploy/vps/server.cjs`), which uses a local PostgreSQL 16 (`fantasyidle`, by its
  socket). Its settings are in `/etc/fantasyidle/api.env`; the JWT secret was made there and never leaves it.
- **Backups:** every night at 03:30 UTC (`fantasyidle-backup.timer`) into `/var/backups/fantasyidle`, 14 days kept.
  Copies off the server are still to do.
- **Cloudflare:** a token for fantasyidle.com only (DNS, SSL and Certificates, Zone Settings), made by the owner, in
  `~/.config/fantasyidle/cloudflare-token` on the owner's Mac; never print it or commit it.
- **Mail:** sign-up codes and password resets go out through Resend (`api/mail.js`) from `noreply@fantasyidle.com`:
  the domain is verified there (region Ireland; its DKIM, sending and DMARC records are in Cloudflare's DNS), and
  the key, made by the owner with sending access to fantasyidle.com only, is `RESEND_API_KEY` in the server's
  `/etc/fantasyidle/api.env`. Without it a sign-up is made but its code can't go (the dialog says so).

Deploy a commit (the game, its API and its wiki together; a release whose API doesn't answer is switched back):

```bash
deploy/vps/deploy.sh
```

Set up from nothing: `deploy/vps/provision.sh` on the server (packages, firewall, user, database, backups), then
`node deploy/vps/cloudflare.mjs` here (DNS records, the origin certificate, SSL "Full (strict)"), then the deploy.
On the server, `journalctl -u fantasyidle-api` shows the API's log and `runuser -u fantasyidle -- psql` opens the
database (a gift, below, is the same SQL there).

## Deploy (the old site, on Vercel)

Until October 2026 the live game was the Vercel project `fantasy-idle` (team "skinbaba1-3986's projects"), production at
https://fantasy-idle.vercel.app. It is not connected to Git: a deploy uploads exactly what is committed on
the branch, never `art/`, `runs/` or `shots/`:

```bash
rm -rf /tmp/fi-deploy && mkdir /tmp/fi-deploy && git archive claude/intelligent-einstein-y5i5iq | tar -x -C /tmp/fi-deploy
cd /tmp/fi-deploy && npx vercel link --yes --project fantasy-idle --scope skinbaba1-3986s-projects && npx vercel deploy --prod --yes
```

Without a database and `JWT_SECRET` (above) the API answers "Database unavailable", and on the live
site nobody can sign in, so nobody can play: the game needs an account there.

## The wiki

https://fantasy-idle-wiki.vercel.app is the player wiki: a static site built from the game's own data by
`wiki/build.mjs` (see `wiki/README.md`), deployed as its own Vercel project, `fantasy-idle-wiki`. Every
table, number and picture comes from `src/` and `assets/`, so after a change to the game, rebuild and
redeploy it:

```bash
rm -rf /tmp/fi-wiki && mkdir -p /tmp/fi-wiki/src && git archive claude/intelligent-einstein-y5i5iq | tar -x -C /tmp/fi-wiki/src
cd /tmp/fi-wiki/src && WIKI_VERSION=$(git -C ~/Documents/idle2 rev-parse --short HEAD) node wiki/build.mjs --out /tmp/fi-wiki/site
cd /tmp/fi-wiki/site && npx vercel link --yes --project fantasy-idle-wiki --scope skinbaba1-3986s-projects && npx vercel deploy --prod --yes
```

`node wiki/build.mjs --serve` previews it at http://localhost:8010.

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

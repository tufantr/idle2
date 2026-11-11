# 023: Cheating, saves, privacy and security (read 11 November 2026)

This file covers how online idle games handle cheating and lost saves, what the law asks of a game that keeps emails, and a read-only review of the API and the server. It is held against the code at 6ea4de0, which the live page's date (4 November) suggests is what runs. Nothing was changed. The live site got one ordinary load of its home page, to read its headers. Two helpers read the forums; Reddit was read through the Arctic Shift archive, and the scores are its figures. I re-checked a sample of their sources, and all held. The web search budget ran out partway through, so some lines are thin and say so. This is not legal advice: section 3 ends with questions for a lawyer.

## In short

- **I found no player's data or account exposed.** The biggest risk is loss: every account, and every nightly dump, sits on one disk (`deploy/vps/provision.sh:77-101`).
- **The API's locked packages carried five published advisories** (npm audit, 11 November). One denial of service probably applied to the API as it was set up. **Fixed the same day** on the owner's word (8a53d4d): the packages moved to their patched releases, npm audit finds none left, and a compressed body is refused before it is unpacked.
- **The growth check puts Fantasy Idle between Melvor and Milky Way Idle.** Melvor has no server, no boards and no bans; Milky Way Idle has a server that decides and bans in waves. The check's weak side is what players resent elsewhere: silent penalties from fixed limits.
- **Privacy:** the server keeps emails, password hashes, saves and counters keyed by IP address. There is no privacy text, no retention rule, and no way to delete an account.
- **The basics are sound:** SQL with parameters, bcrypt, a pinned token algorithm, a secret made on the server, a sandboxed service, and escaped output. The gaps are tokens that can't be revoked, no security headers, CORS open to every site, and an origin that trusts all of Cloudflare.

## 1. Cheating and server authority

| Game | What it does | Source |
|---|---|---|
| Melvor Idle | No server checks and no boards. Its developer, 14 Mar 2022: "We don't ban for any form of cheating as this is a single player game". In 2020 they said boards would mean running everything on a server, with constant anti-cheat work, too much for one developer | [comment](https://www.reddit.com/r/MelvorIdle/comments/tdlqyl/_/i0kin2k/) (score 26), [comment](https://www.reddit.com/r/MelvorIdle/comments/j6jyrm/_/g7zfggx/) |
| Legends of IdleOn | The logic runs on the player's machine, and public injectors exist (003). Hidden thresholds act quietly: a player past level 1,000 was kept out of groups for 2–3 months (7 Nov 2024, score 13). A 300-a-day cap on gem drops, unannounced and aimed at cheaters, drew 95 comments; the developer said such systems can't be discussed (Mar 2024, score 83) | [post](https://www.reddit.com/r/idleon/comments/1gm04o1/), [post](https://www.reddit.com/r/idleon/comments/1bahy47/) |
| Milky Way Idle | The server decides. Over two weeks in May 2025 it banned 500+ main accounts and thousands of alts, for wealth funnelled from alts, trade boosting and bought coins. Temporary bans also took back 2–3 times the boosted wealth, over 100 billion coins in all. Scripts may only show information. Disputes go to a ticket or an email | [Steam, 18 May 2025](https://store.steampowered.com/news/app/3224420/view/1799817379578701), [rules](https://www.milkywayidle.com/game_rules) (read by a helper) |
| Idle Clans | The server holds the state and keeps taking more: on 24 Mar 2026 combat XP moved from the client to the server, to cut errors and desyncs. Deliberate bug abuse is a permanent ban. Appeals go by ticket in a Discord channel | [Steam](https://store.steampowered.com/news/app/2103530/view/1827626365765195), [rules](https://www.idleclans.com/gamerules) (read by a helper), [9 May 2025](https://store.steampowered.com/news/app/2103530/view/1799088287859670) |
| The Tower | 13 Oct 2026: a large ban wave, work on save integrity, and thanks to players who reported cheaters. Appeals only where a process exists | [notes](https://www.techtreegames.com/post/v29-1-patch-notes-october-13-2026), [code of conduct](https://www.techtreegames.com/code-of-conduct) |
| Clicker Heroes | Clanmates read the start time hidden in a save's id to spot impossibly fast progress | [fan wiki](https://clickerheroes.fandom.com/wiki/Clans) |

Scapewatch and NGU Idle: not read, because the search ran out. The Tower's cheater brackets: unverified.
- **Three answers in the genre, and a fourth here.** Melvor has no server and no boards. Milky Way Idle and Idle Clans have a server that decides, and they ban in waves. IdleOn's client decides, behind hidden thresholds. Fantasy Idle lets the client play, and the server works out every number other players see from the stored save, within growth limits (DESIGN §3.17).
- **What players resent most is silence**, and fixed limits that catch the best honest players, more than bans for market abuse. IdleOn's level 1,000 is one example. Here, 6 of 43 accounts were flagged on 4 November and capped for days before one player asked (001, 010).
- **Small teams catch forgeries with limits, players' reports, ban waves and board resets**, never with certainty. None of the games I read publishes its thresholds.

**What the server trusts from a save** (code review):

- **Ranked numbers** come from the server's own reading of the save. Growth limits cap them at three times the fastest simulated climb (`src/core/power.js:169-171`), and ceilings stop them outright (`api/index.js:343-358`). A forger who stays inside those limits is never flagged, and the limits allow several times the best live player's weekly gain. DESIGN §3.17 calls this the limit of a client-side game.
- **The clan boss is well shielded.** An attack counts how the fight went against the hero's own plain attack, times a clan power taken from his best stage (`api/index.js:977-985`). So forged gear adds nothing; only a forged bottle of the best potion still helps (×6.4 at most, 005). Strike lists are cut down to what a perfect player could do (`src/core/power.js:57-64`), and a flagged account deals at most 1% (`api/index.js:495`).
- **The Endless Hydra is not.** It ranks raw damage, capped only at twice what the best stage allows (`api/index.js:1036-1038`). So forged gear that stays under the attack flag counts there.
- **The hall trusts the save's bank**, and the save's own count of gifts already given (`api/index.js:618-621, 683-684`). What bounds a forged bank is the weekly cap per member, as 011 intended.
- **There is no admin route:** a gift is a row of SQL typed by hand (README "The API"). That leaves nothing to attack, and claiming a gift is atomic (`api/store.js:865-872`).

## 2. Save safety

- **Melvor:** a browser cleanup erased about 600 hours, and the only cloud copy was 66 days old (14 Sep 2021, [Steam](https://steamcommunity.com/app/1267910/discussions/0/3040481812853593632/)). Its save slots overwrote saves until v1.0.4 showed what a load would replace ([3 May 2022](https://store.steampowered.com/news/app/1267910/view/4348798430290914436), [25 May](https://store.steampowered.com/news/app/1267910/view/4437747060821096342)).
- **Cookie Clicker:** on 4–6 Feb 2025, players found their saves replaced by a fresh one, losing 8 to 1,458 hours. The cause wasn't confirmed. Some got an older copy back from Steam's remote storage ([thread](https://steamcommunity.com/app/1454400/discussions/0/595140099015967019/)).
- **Antimatter Dimensions** takes automatic backups after 1, 5, 20 and 60 minutes online, and after 10 minutes, 1 hour and 5 hours offline ([source](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/storage/storage.js)). Its cloud keeps one save a slot, overwritten each time (read by a helper).
- **None of the idle games I read keeps several server-side versions** for a player to restore. Unverified, because the search was cut short.
- **Browsers:** Safari deletes a site's script-written storage after seven days of use without a visit; apps on the Home Screen keep their own count ([WebKit, 24 Mar 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). Calling `navigator.storage.persist()` exempts a site from eviction ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- **Whole machines are lost too.** OVH's Strasbourg fire (March 2021) destroyed SBG2, along with the data and the backups kept there ([Wikipedia](https://en.wikipedia.org/wiki/OVHcloud)). GitLab lost about six hours of data in 2017 when its backups and replication all failed; nobody owned testing them ([postmortem](https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/)).

**Fantasy Idle today:**

- One save per account, overwritten at each upload, once a minute (`api/store.js:315-326`). An upload made over another device's newer save is refused (409, `api/index.js:419`).
- `pg_dump` runs every night at 03:30 UTC. The dumps are kept 14 days on the same disk, unencrypted, readable only by the postgres user (`deploy/vps/provision.sh:77-101`). The README lists copies elsewhere as still to do (`README.md:102-103`). I found no record of a restore ever being tried.
- Browsers hold a partial second copy. After a server restore, a device whose game holds more uploads it again (`syncChoice`, `src/core/save.js:308-313`). The same rule undoes a deliberate rollback (012).
- A bug that uploads an empty or damaged save replaces the only copy. Going backwards is never flagged, so nothing notices.

**Copies off the server, at this size.** A compressed dump of 45 accounts is a few megabytes (my estimate, not measured).

| Option | Cost | Note |
|---|---|---|
| Cloudflare R2 | Free up to 10 GB-month, then $0.015/GB-month; no fee to download ([pricing](https://developers.cloudflare.com/r2/pricing/)) | Uses the Cloudflare account the game already has |
| Backblaze B2 | First 10 GB free, then $6.95/TB-month ([pricing](https://www.backblaze.com/cloud-storage/pricing)) | Works with S3 tools |
| Hetzner Storage Box BX11 | €3.20 a month before VAT for 1 TB; SFTP, rsync, Borg ([page](https://www.hetzner.com/storage/storage-box/)) | Another company, in another country |
| The owner's Mac | Free | Only works while the Mac is on |

Encrypt each dump before upload: it holds emails and password hashes. restic encrypts, and it can check that a backup will restore ([restic](https://restic.net/)). Restore a dump into a scratch database once a month.

## 3. Privacy

**What the server keeps about a person** (`api/store.js`):

- **`users`:** username; bcrypt hash; email and when it was confirmed; the whole save, including the hero's name the player typed; the time of the last upload; flags, with reasons and times; the board opt-in; and the server's numbers (`:11-25, 148-150`).
- **`auth_attempts`:** counters keyed by IP address and by name. They are never deleted, except one key at a successful login (`:71-77, 825-827`). IP addresses count as personal data ([GDPR recital 30](https://gdpr-info.eu/recitals/no-30/)).
- **Clan tables:** membership, plus every attack, Hydra fight and hall gift with its time, kept so the counts hold (`:80-92, 206-219`); weekly snapshots of opted-in players (`:114-121`).
- **Outside the database:** the dumps, kept 14 days; nginx's access log, with visitors' addresses (I didn't check how long it is kept); Cloudflare, which sees every request; Resend, which gets each address and its code. Resend's free plan keeps logs 30 days ([pricing](https://resend.com/pricing)); its DPA says processing is mainly in the US, under the EU's standard clauses and the Data Privacy Framework, and says nothing about Turkey ([DPA](https://resend.com/legal/dpa)). Google gets every visitor's address when the fonts load (`index.html:29`, P-066).
- **The browser** keeps the save, its backups, the login token and the settings in localStorage (`src/core/save.js:7-16`). On 11 November the home page set no cookie and ran no analytics script. Cloudflare sets its own cookies only for features such as bot protection, and calls them strictly necessary ([Cloudflare](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/)). Its Web Analytics uses neither cookies nor localStorage ([page](https://www.cloudflare.com/web-analytics/)). The README's gift example names a real account (`README.md:60`); a placeholder would do.

**What a privacy notice must say, at least** ([GDPR art. 13](https://gdpr-info.eu/art-13-gdpr/), [KVKK art. 10](https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law)): who runs the game, and how to reach them. What is kept, why, and on what legal basis (running the account; stopping cheating and abuse). Who receives it: the host, Cloudflare and Resend; other players see names and numbers in clans, and on boards if the player opted in. Transfers abroad and the safeguard for each. How long each kind of data is kept. The player's rights (access, correction, erasure, objection, portability) and the right to complain to a regulator. That an account needs an email. And the automated part: KVKK lets a person object to a result against them that comes from solely automated analysis ([art. 11](https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law)), and a flag is such a result (P-025).

**Retention, deletion and breaches.** There is no retention rule today. A daily job could delete counters whose window has passed; the owner decides how long an idle account lives. No account can be deleted (P-070; [GDPR art. 17](https://gdpr-info.eu/art-17-gdpr/)). A deletion must also reach the clan rows, the snapshots and the counters under the player's name, and the notice can say that dumps age out after 14 days. A breach goes to the regulator within 72 hours under the GDPR ([art. 33](https://gdpr-info.eu/art-33-gdpr/)), and under KVKK the Board's decision 2019/10 sets the same 72 hours ([DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=TR)). A half-page plan would cover who to tell, the mail to players, and which secrets to rotate (a new `JWT_SECRET` signs everyone out).

**Questions for a lawyer** (alongside P-048):

1. Does the GDPR reach a free English game open to EU players? ([Art. 3(2)](https://gdpr-info.eu/art-3-gdpr/) covers free services.) Does the exemption for occasional, low-risk processing mean no EU representative is needed ([art. 27(2)](https://gdpr-info.eu/art-27-gdpr/))?
2. Does KVKK apply, and does the game need VERBİS registration? DLA Piper reads the exemption as fewer than 50 employees and under TRY 100 million a year, unless the main activity is processing special categories of data ([DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=TR)).
3. Transfers to US processors under KVKK's amended art. 9 (2024): standard contracts, notified to the Authority within five business days of signing (same source).
4. Is a flag an automated decision under KVKK art. 11 or [GDPR art. 22](https://gdpr-info.eu/art-22-gdpr/)? What must the notice say about it?
5. The minimum age (010), the language of the notice for Turkish players, and how long each kind of data may be kept.

## 4. Security review (read-only, ranked for a game of 45 accounts)

| # | Finding | Where | Impact and likelihood | Fix | Size |
|---|---|---|---|---|---|
| 1 | Every account and every dump is on one disk | `provision.sh:77-101` | All accounts lost; rare (a fire, the provider, a mistake, an intrusion) | Copy an encrypted dump off the server every night; restore one each month | S |
| 2 | npm audit, 11 Nov: 1 critical, 3 high and 1 moderate advisory in the locked packages. By my reading, four need settings this API doesn't use. One denial of service probably applies to the body parser as it is set up. Not tested | `api/index.js:11`, `api/package-lock.json` | The online side goes down for as long as someone repeats it; the advisory is public | Done 11 November (8a53d4d): patched releases, the tests, a deploy, and compressed bodies refused (415, checked on the live site) | S |
| 3 | Tokens last 30 days, sit in localStorage, and nothing revokes them: not a password reset, not a log-out | `api/index.js:17, 76-82, 282-296`; `save.js:9` | A stolen token holds the account for a month and can overwrite its only save. Stealing one needs XSS, malware or a shared device | Put a version per account in the token, bumped by a reset and by "Sign out everywhere". Send a mail when the password changes ([OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)) | S |
| 4 | No HSTS, CSP or framing rule in the live headers (11 Nov); Express's `X-Powered-By` header is on | `nginx.conf:66-71`; `api/index.js:9` | Nothing stands behind the escaping if it fails; a first visit over plain http can be intercepted | HSTS in Cloudflare, available on every plan ([docs](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/)), starting short. A CSP with `frame-ancestors` for itch.io and galaxy.click, and `connect-src 'self'`. `app.disable('x-powered-by')` ([Express](https://expressjs.com/en/advanced/best-practice-security.html)). `script-src` must keep `'unsafe-inline'` while `render.js` has 150 inline `onclick` handlers | S |
| 5 | The firewall admits all of Cloudflare's address ranges, and nginx trusts the visitor-address header those requests carry. The server's address is in public files | `provision.sh:43-55`; `nginx.conf:60`; `README.md:90`; `provision.sh:4`; `deploy.sh:9` | Other Cloudflare customers can reach the origin past this site's protections ([Certitude, 2023](https://certitude.consulting/blog/en/using-cloudflare-to-bypass-cloudflare/)). Cloudflare's shared certificate proves only that a request came from Cloudflare ([docs](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/)). Whether the address header can be forged this way: unverified | Authenticated origin pulls with the site's own certificate, or a tunnel. Take the address out of the files; git history keeps it, so only a new address fixes it fully | S–M |
| 6 | CORS is open to every site. Sign-ups and resets share one free mail quota of 100 a day ([Resend](https://resend.com/pricing)) | `api/index.js:10, 166-173` | Visitors to any other site can spend that quota from their own addresses; then nobody can sign up or reset a password until the next day | Limit CORS to the game's own origin (the game inside a frame still loads from that origin). Turnstile, which is free, on sign-up and forgot-password ([plans](https://developers.cloudflare.com/turnstile/plans/)). An alert near the cap | S |
| 7 | No limit on signed-in writes: saves of up to 1 MB, attacks, gifts | `nginx.conf:56-65` | One account can overload a 2-core server | `limit_req` on `/api/`, or Cloudflare's one free rate-limiting rule (10-second window, by IP: [docs](https://developers.cloudflare.com/waf/rate-limiting-rules/)) | S |
| 8 | Passwords may be 8 characters, with no blocklist. One name can take 100 guesses per 15 minutes from all addresses together | `api/index.js:19, 147-150` | Common passwords fall to slow guessing spread across addresses | Refuse common passwords. NIST requires a blocklist, 15 characters when a password is the only factor, and no more than 100 failures in a row ([SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)) | S |
| 9 | Sign-up says when an email already has an account; the reset route takes care not to | `api/index.js:231` | Anyone can learn whether an address plays, three tries a day per address | Give the same answer either way, and mail that address instead | S |
| 10 | The release folder belongs to the app user while root installs files from it | `activate.sh:22, 25, 32-33` | A poisoned package install script could reach root; the lockfile's hashes make that unlikely | Install the service and nginx files before the `chown`, or keep the folder owned by root | S |
| 11 | SSH as root, open to any address, keys only, with fail2ban. The provider's web console still accepts the root password | `provision.sh:48`; `README.md:93-95` | Total loss, but very unlikely | A separate deploy user; two-factor sign-in at the provider (not checked) | S |
| 12 | Small: the hall builders' names aren't escaped (names are validated, so this is safe today); counters are never cleaned; the app's database role owns its tables | `render.js:2508`; `store.js:793-827` | Defence in depth | Escape them; a daily delete; a role that can't change the schema | S |

**Done well** (checked): every SQL query uses parameters (`api/database.js:20`). bcrypt runs at cost 10 with the 72-byte cap, OWASP's minimum ([cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)). HS256 is pinned when tokens are verified. Email codes are kept as keyed hashes and compared in constant time. Login tries are counted before the password is checked, and unknown names still cost a hash check. Errors are generic and request bodies are capped. The secret was made on the server and is never sent anywhere (`provision.sh:64-75`). The service is sandboxed (`fantasyidle-api.service:16-27`), and the web ports are open only to Cloudflare. Every number another player sees is worked out on the server; boards are opt-in; nothing is listed without an account; output is escaped (`src/ui/format.js:63`).

**Not sure:** whether Cloudflare adds headers on other paths; how long nginx's logs are kept; whether the provider account has a second factor; whether the advisory in row 2 can actually be triggered here (untested); whether a restore has ever been tried.

## Held against Fantasy Idle

| Evidence | Fantasy Idle today | Verdict |
|---|---|---|
| Melvor: no server, no boards, no bans | Every number others see is worked out on the server, within growth limits | Stronger; the cost is false flags |
| Milky Way Idle: waves of 500+ bans, wealth taken back, appeals by ticket or email | No bans; a flag acts silently for 30 days, and there is nowhere to answer | P-025 |
| IdleOn: a fixed level ceiling hid an honest top player for months | A best stage past 6,000 is flagged; the deepest player gained 460 stages in a week | P-024 |
| IdleOn: an unannounced cap drew 95 comments | A flag shows only as "Capped" | Say what a flag does (P-025) |
| The Tower and Milky Way Idle rely on reports and review | No report button; the owner reads flags in the database | A review list (below) |
| How the server reckons the clan fights | The boss ignores forged gear; the Hydra counts it | The owner's call (below) |
| Melvor's 600 hours, Cookie Clicker's wipe | One save per account, overwritten every minute | P-013, with a guard |
| OVH 2021, GitLab 2017 | Dumps on the same disk; no restore ever tried | Backups off the server, first |
| GDPR art. 13, KVKK art. 10 | No privacy text anywhere | A privacy page now, not at a sale |
| KVKK art. 11: the right to object to automated results | Flags are automated results | P-025 doubles as compliance |
| OWASP: renew sessions on password change; keep tokens out of localStorage | 30-day tokens in localStorage, never revoked | Revocable tokens and a CSP |
| NIST: a blocklist of common passwords | 8 characters, no blocklist | A blocklist |
| Certitude and Cloudflare's docs: Cloudflare's ranges are shared | All of Cloudflare trusted; the server's address public | Lock the origin to the site's own zone |

## Proposals from this file

Listed in the order to do them. New ones carry no number.

1. **Backups off the server, encrypted and tested** (Add, S): a nightly encrypted copy to object storage, a monthly restore into a scratch database, and an alert when a night is missed. Why: one disk holds every account and every dump. OVH and GitLab lost data in exactly these two ways, a backup in the same place and a backup never tested. R2's free tier covers the cost.
2. **Patch the API's packages** (Change, S): **done 11 November** (8a53d4d), on the owner's word. Keep it so: `npm audit` in `api/` before each deploy.
3. **Tokens that can be revoked** (Change, S): a version per account in each token, checked where the name is checked now (`api/index.js:76-82`). A password reset and a "Sign out everywhere" button in Settings bump it; a mail goes out when the password changes. Why: today a 30-day token survives a reset.
4. **A privacy page and a cleanup job** (Add, S–M): one page, linked from the sign-up dialog and the wiki, saying what section 3 lists. A daily delete of counters past their window, and a half-page breach plan. Why: emails and IP-keyed counters are kept today with no text at all. The law asks for the notice when data is collected, whether or not anything is sold. The wording waits for the lawyer (P-048).
5. **Security headers** (Change, S): HSTS through Cloudflare, starting with a month; a CSP with `frame-ancestors`, `connect-src 'self'` and `object-src 'none'`; `X-Powered-By` off. Why: none of these are set today. Moving the 150 inline handlers to listeners (M, later) would then allow a strict `script-src`.
6. **Flags that list before they act** (Change, S–M, with P-025): only the ceilings act at once. A save that grows fast but stays within the limits goes on a weekly list for the owner, with the share of its allowance it used. Why: on 4 November, limits set too tight capped 6 of 43 accounts for days, and review is how small teams work. Risk: a forger plays on until the owner reviews the list.
7. **Abuse guards** (Change, S): CORS limited to the game's origin; Turnstile on sign-up and forgot-password; an alert near 100 mails a day; a per-address request limit on `/api/`. Why: rows 6 and 7.
8. **Refuse common passwords** (Change, S): check the few thousand most common at sign-up and reset, and say why one is refused. Why: NIST requires a blocklist. Whether the minimum rises above 8 is the owner's call.
9. **An origin that answers only its own zone** (Change, S–M): authenticated pulls with the site's own certificate, or a tunnel; the address out of the README and the scripts, and a new address if the provider allows. Why: row 5. Unlikely to be used, but cheap.
10. **Small hardening** (Change, S): the same answer at sign-up for an email already used; the release folder kept root's while npm runs; a deploy user; the builders' names escaped; a placeholder name in the README's gift example.
11. **The Hydra counted like the boss** (Change, S–M, the owner's call): depth from how the fight went against the hero's own plain attack, times a figure from his best stage. Why: the boss already ignores forged gear this way. Against: gear would stop counting at the Hydra, and that may be its point.

**Evidence for proposals already listed:**

- **P-013:** Melvor's 600 hours, Cookie Clicker's wipe, Antimatter Dimensions' timed backups, and no server-side history found elsewhere (unverified). Add a guard: when an upload's best stage or total XP falls by more than half, keep the old save aside for the owner. Any restore also needs the generation mark 012 found.
- **P-024:** IdleOn's fixed level ceiling hid an honest top player for 2–3 months. That is the failure this proposal heads off.
- **P-025:** KVKK art. 11 gives a right to object to automated results. Every game read offers some route: a ticket, an email, a Discord channel, an appeal where one exists. IdleOn's silent cap shows what silence costs.
- **P-049:** the privacy page and the copies off the server are due now, sale or not.
- **P-066 and P-069:** the fonts are a privacy matter too, since Google receives every visitor's address; a guest's save meets Safari's seven-day rule, which MDN's `persist()` answers.
- **P-070:** erasure under GDPR art. 17 and KVKK art. 7 and 11. It must reach the clan rows, snapshots and counters, and the dumps age out in 14 days.

**For the queue:** a timed restore drill on a copy of the database; the growth limits against live saves (with the owner's OK each time), to set the review list's threshold; the Hydra's gain from forged gear, measured with the tools; Scapewatch's and NGU Idle's anti-cheat, The Tower's cheater brackets and Milky Way Idle's ban disputes (the search budget ran out); the lawyer's answers (P-048); and, for the owner to check, how long the server keeps nginx's logs and whether the provider account has a second factor.

# 018: How small idle games find players (read 11 November 2026)

Read from Reddit through the [Arctic Shift](https://arctic-shift.photon-reddit.com/) archive (Reddit can't be fetched; scores are what the archive holds), galaxy.click's pages and
[source](https://codeberg.org/galaxy/click), Steam's store and Steamworks docs, CrazyGames', Poki's, Apple's, Google's and WebKit's docs, GameDiscoverCo, and Fantasy Idle's code.
Steam's `appreviews` endpoint now sends every request to the store's home page (checked today), so §6's language counts come from each store page's
row for the visitor's language (`?l=<language>`), which shows only larger groups (the smallest seen was 211). Aggregators' figures and developers' claims are unverified.

## 1. Where the first players came from

- **Melvor Idle** showed itself on r/incremental_games at alpha v0.04 ([141 points, 170 comments](https://www.reddit.com/r/incremental_games/comments/d3h832/), September 2019) and posted each update
  ([129](https://www.reddit.com/r/incremental_games/comments/dol1dl/), [178](https://www.reddit.com/r/incremental_games/comments/eoei78/), [203](https://www.reddit.com/r/incremental_games/comments/jbibq0/)); Android in March 2020, iOS in June, Steam in November ([231](https://www.reddit.com/r/incremental_games/comments/jxgfcp/)). r/2007scape barely noticed: three posts by July 2020, 1 point each ([search](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=2007scape&title=Melvor&before=2020-06-30)). A million players by 1.0 (claim, [Game Developer](https://www.gamedeveloper.com/press-release/melvor-idle-version-10-on-pc-and-mobile-marks-official-end-of-early-access)).
- **Launch posts and AMAs, in the browser era.** NGU Idle: 8–12 players a day in a hidden Kongregate preview, about 5,000 a day by May after its release post
  ([150, 220 comments](https://www.reddit.com/r/incremental_games/comments/7v06hs/)), a first month of sales worth 1.5 times the developer's old yearly salary (the developer, [AMA](https://www.reddit.com/r/incremental_games/comments/8n1rxe/)). IdleOn opened with an AMA by the maker of
  Idle Skilling ([461, 538 comments](https://www.reddit.com/r/incremental_games/comments/jr7eon/), November 2020), bringing an earlier game's audience. Antimatter Dimensions reached Steam with its biggest update ([635](https://www.reddit.com/r/incremental_games/comments/zo9d0v/)).
- **Players' posts beat developers'.** Unnamed Space Idle: a player's recommendation ([206](https://www.reddit.com/r/incremental_games/comments/10nc3w4/)) against its update post ([74](https://www.reddit.com/r/incremental_games/comments/1065fnn/)), January 2023. Nodebuster (August 2024)
  had no launch post; a player brought it two months later ([109](https://www.reddit.com/r/incremental_games/comments/1g98y7n/)); 97% of 14,253 reviews ([histogram](https://store.steampowered.com/appreviewhistogram/3107330?l=english&review_score_preference=0)).
- **The Steam hits came through YouTube and Steam's lists.** Gnorp launched with 1.7k wishlists and a Discord of about 100, sold 120k+ in a month, found almost wholly that way, in English only ([GameDiscoverCo](https://newsletter.gamediscover.co/p/how-this-solo-dev-incremental-game)).
  Tiny Terraces, a farming idle: 28,000 wishlists, its best day 1,500 from a Next Fest feature, 132 YouTube Shorts with 1.1M views, 5,000+ copies and $26,799 gross in month one (the developer, [Gamepressure](https://www.gamepressure.com/newsroom/how-much-can-you-earn-as-an-indie-dev-tiny-terraces-creator-share/zb889b)).
- **Scapewatch** posted one text nine times in five subreddits on 15–16 June 2026, with a free playtest: r/incremental_games [83](https://www.reddit.com/r/incremental_games/comments/1u6z6ja/) and 53, r/PBBG 37, r/inkarnate 177,
  r/ScapeLikes 2. Its two r/incremental_games versions disagreed on AI; 006 found its claim later contradicted. It claims 6,000 online a week after reaching Steam ([post](https://www.reddit.com/r/scapewatch/comments/1wxpm36/)). **Ensis IDLE** has no r/incremental_games post by name, yet 93.1k play hours on [galaxy.click](https://galaxy.click/play/712).

| Channel | What it gives now | Fit |
|---|---|---|
| r/incremental_games | 1 Oct–10 Nov 2026: 2,542 posts, 62 a day, 36% removed or deleted, median 1 point, 41 past 100. Kept Steam posts: 64 of 440 past 20; kept developer posts naming a browser: 3 of 236, best 39 ([query](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=incremental_games&after=2026-10-01&before=2026-11-11)) | One post in 30 days; browser games fare worst |
| Feedback Friday | 69, 56 and 38 entries ([16 Oct](https://www.reddit.com/r/incremental_games/comments/1x769dv/), [30 Oct](https://www.reddit.com/r/incremental_games/comments/1xj5ekv/), [6 Nov](https://www.reddit.com/r/incremental_games/comments/1xp4c3j/)); median replies 0, 0, 2.5; 35, 29 and 12 got none | Weekly, free, small |
| galaxy.click | The 100 newest games (22 July on): median 1,645 play hours, 25 favourites ([list](https://galaxy.click/explore/new)); four pages sampled: 2,022–7,991 plays ([one](https://galaxy.click/play/900)) | The likeliest first thousand, if accepted |
| itch.io | Fantasy Idle's page: 1 rating, no comments (README "Listings"); a No-AI search filter since 3 November ([Power Up Gaming](https://powerupgaming.co.uk/2026/11/05/itch-io-expands-its-no-ai-filters-as-generative-ai-games-continue-to-flood-the-platform/)) | Keep; small |
| r/PBBG, r/ScapeLikes | PBBG, May–November: 1,703 posts, median 1, 24 past 20; ten other contributions per promotion since July ([rule](https://www.reddit.com/r/PBBG/comments/1uox9vi/)); top post against AI-made games ([76](https://www.reddit.com/r/PBBG/comments/1wnmmsl/)). ScapeLikes, 2026: 101 idle posts, median 1, best a browser idle RuneScape-like ([45](https://www.reddit.com/r/ScapeLikes/comments/1uwz1fi/)) | The closest niches; they ask for time |
| r/WebGames | July–August: 108 idle posts, median 1, none at 20 ([rules](https://arctic-shift.photon-reddit.com/api/subreddits/rules?subreddits=WebGames,MelvorIdle); r/MelvorIdle bars self-promotion without leave) | Weak |
| CrazyGames | A trial of 7+ days and 500 plays; good marks are 10+ minute sessions, 10–15% back on day 1, load under 10 s ([metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)). Email logins off, guests first; full launch ties progress to its account and runs its ads ([accounts](https://docs.crazygames.com/requirements/account-integration/), [intro](https://docs.crazygames.com/requirements/intro/)) | Clans would need its accounts |
| Poki, Kongregate, Hacker News | Poki: curated, outside requests blocked by default, no purchases ([requirements](https://developers.poki.com/guide/requirements-quality)). Kongregate: closed to new games since July 2020 ([PC Gamer](https://pcgamer.com/browser-game-portal-kongregate-is-no-longer-accepting-new-games)). 61 Show HN idle or clicker games: median 2 points, best since 2025 13 ([Algolia](https://hn.algolia.com/api/v1/search?query=idle&tags=show_hn&restrictSearchableAttributes=title)) | None |
| YouTube, Shorts, TikTok | Every case found was a Steam game: Gnorp, Tiny Terraces, Harvest Dice Profit after one creator's video ([164](https://www.reddit.com/r/incremental_games/comments/1xflexb/)) | Later, with Steam |

## 2. What a first post needs

- **The sub's rules.** Own content once in 30 days, and only if playable ([February](https://www.reddit.com/r/incremental_games/comments/1r40mgr/); rules 3 and 4 since June). Since 2 June a developer's post needs a
  section labelled `AI Disclosure`: whether, for what, and how much (how far assets were edited; the Steam page too), or it is removed; Feedback Friday is exempt ([877](https://www.reddit.com/r/incremental_games/comments/1tublm5/)).
- **Fantasy Idle's own post** (22 October, 13:07 UTC, Prototype flair) ended at 0 points, 18% upvoted, 9 comments ([post](https://www.reddit.com/r/incremental_games/comments/1xci39j/)). Its disclosure named Gemini, Claude
  and the CC0 sprites, not how much was edited. The top comment (4 points): "Instant downvote for needing an account". Another player got in by deleting the
  sign-in form; the guest option came that day (ROADMAP, 22 October). One found it more fun than expected. Rule 3 allows the next post from 21 November.
- **AI.** A satire of AI-written Melvor-like pitches, its body one word repeated, scored [800](https://www.reddit.com/r/incremental_games/comments/1siundm/) (April); a meme on itch.io's loose AI tags [513](https://www.reddit.com/r/incremental_games/comments/1xhwtce/). Disclosed code help passes
  when the game shows well: Oreloop named Claude for its code and reached [274](https://www.reddit.com/r/incremental_games/comments/1xk7d1v/). AI art doesn't: of 14 posts in October–November whose disclosure said AI made
  some art or audio (hand-read from a keyword search), one passed 20 (23); the rest scored 0–3, among them a free web idle RPG with Gemini art ([0](https://www.reddit.com/r/incremental_games/comments/1xb5baa/)).
- **What worked:** one concrete idea in the title (book sorting, [254](https://www.reddit.com/r/incremental_games/comments/1x3j41q/)); a link that plays at once; one question; the developer in the comments. "Melvor-like" is no hook:
  about 20 developers pitched one from April to November, nearly all ending at 0–1, the best a returning Steam demo at [61](https://www.reddit.com/r/incremental_games/comments/1u6mutn/) ([search](https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=incremental_games&title=Melvor&after=2026-04-01)). October's
  red-flags thread named AI-looking interfaces, pages about the developer, no gameplay shown, and prestige that changes nothing; three comments preferred browser idle games to Steam ones ([130, 163 comments](https://www.reddit.com/r/incremental_games/comments/1wy8jfq/)).
- **galaxy.click** names heavy generative AI first among its usual rejections ([verification](https://galaxy.click/docs/verification)). Its reviewers ask whether an average player would rate a game 3 of 5,
  and 4 of 5 where AI played a big part; of games a coding agent built from a prompt it says "We don't want these games." ([handbook](https://codeberg.org/galaxy/click/src/branch/master/src/components/oversight/Handbook.svelte)). Since 31 October AI-made games
  may first face Consideration, a keep-or-toss vote the developer isn't told of ([history](https://codeberg.org/galaxy/click/commits/branch/master/src/components/oversight/Handbook.svelte)). Email or password walls are refused, guests are fine, nothing may be
  bought through galaxy. Fantasy Idle isn't found there by name; "High Fantasy Idle" (48.6k play hours) is ([search](https://galaxy.click/search?q=fantasy+idle)); Steam has a "Fantasy Idle RPG" since 27 October ([post](https://www.reddit.com/r/incremental_games/comments/1xh80rv/)).
  **Disclosure that works** is specific, consistent and early: Ensis's upfront note drew no complaints (006; its art was human); Scapewatch's two versions became the story.

## 3. Timing around Melvor Idle 2

- **A big launch doesn't sink small ones on Steam:** across hundreds of 2022 launches, games out in a big game's week converted as well as others; interest built
  beforehand decided ([GameDiscoverCo](https://newsletter.gamediscover.co/p/can-another-big-game-release-crush)). No study of Reddit posts found. **No lift seen either:** Melvor-likes posted the week after Melvor Idle 2's demo
  scored 20 and 0; when Melvor reached Steam in November 2020, requests for games like it got 0–2 points ([one](https://www.reddit.com/r/incremental_games/comments/jq185j/)).
- **The gap it leaves:** Early Access is Steam only, on computers ([store](https://store.steampowered.com/api/appdetails?appids=3218350)); phones are planned during Early Access, the web with no date ([developers, 29 September](https://news.melvoridle.com/melvor-idle-2-development-progress-update-september-2026/));
  a moderator confirmed it ([thread](https://www.reddit.com/r/MelvorIdle/comments/1xj0rl1/)). Players asked for phone and browser play ([21](https://www.reddit.com/r/MelvorIdle/comments/1xcfm28/), [7](https://www.reddit.com/r/MelvorIdle/comments/1xlzpos/)). Lowbar Legends (13 November) is free but Windows only ([store](https://store.steampowered.com/api/appdetails?appids=5011370)).
- **Options for the owner.** A, before (12–16 November): only Feedback Friday on the 13th, Lowbar Legends' day. B, launch week (17–20): Melvor Idle 2 fills the feeds
  (r/MelvorIdle's October top posts were its news, 405 and 642), and own posts wait for the 21st anyway. C, after (from 21 November): say what Melvor Idle 2 lacks at launch (free, in a browser and on a
  phone, clans with a weekly boss); Feedback Friday on the 20th can try the words. D, later: wait for galaxy.click's answer and the fixes below, then post with new work to show.

## 4. Steam

- **What Steam asks:** $100 a game, paid back after $1,000 ([fee](https://partner.steamgames.com/doc/gettingstarted/appfee)); a first game waits 21 days after paying, shows a coming-soon page two weeks, and each review takes 3–5 working days, plan 7
  ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding), [review](https://partner.steamgames.com/doc/store/review_process)). Next Fest: 22 February–1 March and 14–21 June 2027 ([dates](https://partner.steamgames.com/doc/marketing/upcoming_events)), once per game, a public page and a demo, unreleased till it ends ([rules](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest)). A Playtest is a free side app
  with a lighter review ([docs](https://partner.steamgames.com/doc/features/playtest)). Since January the AI survey covers what players see, not coding tools ([PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)): the paintings must be declared. Refunds: 14 days and under 2 hours played ([policy](https://store.steampowered.com/steam_refunds/)).
- **What the others did.** Antimatter Dimensions: Electron with Greenworks, Steam achievements, a Steam ticket signing into PlayFab and the SteamID into its Firebase cloud, purchases through Steam
  ([code](https://github.com/IvarK/AntimatterDimensionsSourceCode/tree/master/src/steam)). Cookie Clicker: Electron and Greenworks with Workshop mods (SteamDB via a search summary, unverified), $4.99, the web still free. Melvor Idle: $9.99, 86 achievements, no Steam Cloud
  listed, 13 languages. Kittens Game: $7.99 since February 2026, Steam Cloud, 37 achievements. Scapewatch: Steam sign-in only, one account in the browser and on Android (006). Idle Clans: free, cross-platform ([store data](https://store.steampowered.com/api/appdetails?appids=2103530); swap the id).
- **What Fantasy Idle would need (L):** an Electron or NW.js shell round the packaged files (Tauri's web view is reported to clash with the overlay, [forum](https://www.construct.net/en/forum/construct-3/how-do-i-8/steamworks-addon-not-working-186984),
  unverified); an API route that checks a Steam ticket with `AuthenticateUserTicket` and a publisher key, then finds or makes the account for that SteamID ([docs](https://partner.steamgames.com/doc/webapi/ISteamUserAuth));
  a guest's save in the app's folder, which Auto-Cloud syncs with no code ([Cloud](https://partner.steamgames.com/doc/features/cloud)); the 54 achievements (`src/data/achievements.js`) mapped; the paintings declared.

## 5. Phones

- **The installed web app:** `manifest.json` opens standalone; there is no service worker (none in `src/`, `index.html` or `deploy/`). Chrome installs from its menu
  without one (108 on phones) but prompts only with a fetch handler ([Chrome](https://developer.chrome.com/blog/update-install-criteria)); iOS 26 opens every Home Screen site as an app ([WebKit](https://webkit.org/?p=16993)).
- **Push:** iOS 16.4 brought web push to Home Screen apps only, asked on a tap ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); iOS 18.4 added Declarative Web Push ([WebKit](https://webkit.org/?p=16574)). Fantasy Idle would need a service
  worker (P-008), push keys, a subscriptions table and a timer; the server holds each account's save and `last_saved` (`api/store.js:18`), so it knows when the
  third crate ripens (one every 20 hours) or the 24 offline hours are full. Guests have no server copy.
- **iPhone guests can lose their game:** Safari deletes a site's stored data after seven days of use without a visit; Home Screen apps keep their own count
  ([WebKit, 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)); `persist()` is granted mainly to them ([WebKit, 2023](https://webkit.org/blog/14403/updates-to-storage-policy/)). A guest's game is in `localStorage` (`src/core/save.js:19`) and never asks to persist.
- **Store wraps:** Google Play takes a Trusted Web Activity, the site itself in Chrome, proven by Digital Asset Links ([Chrome](https://developer.chrome.com/docs/android/trusted-web-activity/)); a new personal account first
  runs a closed test of 12 testers for 14 days ([Google](https://support.google.com/googleplay/android-developer/answer/14151465)) and must offer account deletion in the app and on the web ([Google](https://support.google.com/googleplay/android-developer/answer/13327111)).
  Apple wants more than a repackaged website (4.2), deletion in the app (5.1.1(v)), and for user content such as clan names a filter, reports, blocking and a contact (1.2) ([guidelines](https://developer.apple.com/app-store/review/guidelines/)). Capacitor schedules local notifications with no server ([docs](https://capacitorjs.com/docs/apis/local-notifications)). The API has no delete route (`api/index.js`).

## 6. Translations

| Game (all-language reviews on its store page) | English | Largest others |
|---|---|---|
| Milky Way Idle (2,476) | 31% | Simplified Chinese 58% |
| Idle Slayer (11,062) | 40% | Brazilian Portuguese 19%, Spanish 11%, Russian 9% |
| Melvor Idle (14,788) | 59% | Simplified Chinese 22%, Traditional Chinese 4%, Russian 3% |
| Cookie Clicker (89,178) | 62% | Brazilian Portuguese 8%, Spanish 7%, Russian 5%, Simplified Chinese 4% |
| Unnamed Space Idle (4,599) | 66% | Simplified Chinese 12%, Russian 7% |
| IdleOn (30,237) | 73% | German 4%, Brazilian Portuguese 4%, Russian 3.5%, Simplified Chinese 3% |
| Antimatter Dimensions (4,698), English only | 73% | Simplified Chinese 5%, Russian 5% |
| Gnorp Apologue (9,686) | 77% | Simplified Chinese 8.5% |
| Nodebuster (13,957), English only | 77% | Brazilian Portuguese 5%, German 4% |
| NGU Idle (13,073), English only | 84% | German 2.5%, Simplified Chinese 2%, Russian 2% |

([Melvor in Chinese](https://store.steampowered.com/app/1267910/?l=schinese); swap the id and `l=`.) The median game has 34% of its reviews in other languages (15–69%), the English-only
three 16–27%; Soda Dungeon 2 (55%: Chinese 11%, Brazilian Portuguese 9%), Revolution Idle (59%: Russian 10%) and Leaf Blower Revolution (85%) are in the medians. Counting a missing language as 0, medians: Simplified Chinese 4.4%, Russian 3.5%, German 2.5%, Brazilian Portuguese 1.9%, Spanish 1.2%. Chinese
leads in 6 of 13 and reaches 11–58% in four. Gnorp's buyers: US 51%, UK 7%, Germany and Canada 6% (GameDiscoverCo, §1).

- **Cost here:** no text layer; numbers formatted `en-US` (`src/ui/format.js:14`); about 2,300 prose strings, 17,500 words, in `src/ui`, `src/data`, `src/systems`
  and `src/main.js` (my rough count), and 40,000 words in `wiki/content`. The fonts load from Google (`index.html`): unreliable in mainland China (vendor blog,
  [Chinafy](https://www.chinafy.com/blog/how-to-fix-font-loading-issues-in-china), unverified) and behind a €100 award in Munich in 2022 (first instance, [Bitdefender](https://www.bitdefender.com/blog/hotforsecurity/german-website-fined-100-euros-after-court-says-googles-font-library-violates-gdpr/)).
- **Most for the least:** Simplified Chinese, the largest group, once the fonts come from the game's own server and a native speaker checks; then Russian or
  Brazilian Portuguese, present in most games at 2–10%. This is Steam's mix; a web game's may differ.

## Held against Fantasy Idle

| Evidence | Fantasy Idle today | Verdict |
|---|---|---|
| The first post's top comment was the sign-up wall; galaxy.click refuses email walls; CrazyGames puts guests first | The site shows the sign-in first, with Play as guest; framed, a guest at once (`src/main.js:130-142`) | A guest-first link for posts |
| The sub, galaxy.click, itch.io and Steam each ask for an AI disclosure | Disclosed in the post, on itch.io, the galaxy form and the wiki; nothing in the game | P-020 gains weight |
| AI-made art sinks posts; disclosed code help passes | 63 Gemini paintings and 98 card pictures (`assets/CREDITS.md`); CC0 sprites | The art is the risk |
| Browser posts rarely pass 20; a galaxy.click listing brings thousands of plays | itch.io: 1 rating; galaxy.click: not live by name | galaxy.click is the likelier first thousand |
| Melvor Idle 2 starts Steam-only; its players asked about phones and browsers | Free in a browser and on phones, installable | The message after 21 November |
| Web push works on Android and from the iOS Home Screen | No service worker, no push | M, with P-008 |
| Safari clears an unvisited site's data after seven days | Guest saves in `localStorage`, no `persist()` | S |
| Store wraps need account deletion and reports on user content | No delete route; clan names are the players' own | S–M; P-025 |
| A third of idle games' reviews aren't English | English only, no text layer | P-042, after the fonts |
| A generic name collides | "High Fantasy Idle" on galaxy.click, "Fantasy Idle RPG" on Steam | The domain in every title |

## Proposals from this file

In the order I'd do them:

1. **A link that starts as a guest** (Change, S): `fantasyidle.com/?guest` acts like the framed game, straight into the fight with the account one click away, while the bare address keeps the owner's sign-in first. The first post's top complaint, galaxy.click's rule and CrazyGames' default all point here.
2. **Say in the game how it was made** (P-020, Change, S): a credits line in Settings naming Gemini, Dungeon Crawl Stone Soup and the AI-written code, worded as on the listings, with how much was edited. Every channel above now asks.
3. **Serve the two fonts from the game's own server** (Change, S): one blocking request to Google gone; China and the Munich award (§6).
4. **Count where accounts come from** (Add, S): a tag on each listing's link and the framing site, counted at sign-up with no personal data. At 45 accounts the owner can't yet tell which channel works.
5. **A second post from 21 November** (Change, S, the owner's call): the guest link; a title naming free browser and phone play and the clan boss; a short clip of the fight; one question; the full disclosure. Option C, with Feedback Friday on the 20th to try the words.
6. **Keep a guest's game on phones** (Add, S): ask the browser to persist the save; the Guest pill's "?" says where the game lives and that Safari clears it after seven days away unless it is on the Home Screen.
7. **Delete my account** (Add, S–M): in Settings and by a web page; Apple, Google and P-049's groundwork need it before any store wrap.
8. **Opt-in push for a full bank of crates and full offline time** (Add, M, after P-008): accounts only, two notices; three crates, not one, so a skipped day still costs nothing. Support is clear; demand is thin (IdleOn's players use an outside tool for timers, 007).
9. **A text layer, then Simplified Chinese** (P-042, Add, L): strings out of `src/ui` and `src/data`, number formats per language, a native checker.
10. **Steam later** (Add, L): a Playtest to try the shell, then a page for Next Fest in June 2027. February works only if the shell, the sign-in and a demo are done by about January, since the 21-day wait, two weeks of page and two reviews come first. The web stays free; this is for reach, as some idle players avoid Steam.
11. **Google Play as a Trusted Web Activity** (Add, M): after 7; the same site, 12 testers from the Discord for 14 days. The App Store last (4.2).

**Ideas that don't fit:** CrazyGames and Poki (their accounts or a blocked API, their ads; clans need the game's own accounts); Hacker News (median 2); r/MelvorIdle
without the mods' leave; Shorts and TikTok as a steady job for one person before any Steam page; Kongregate (closed). Replacing the 161 pictures would meet the
grievance, but they are the game's look: the owner's call, not proposed. A new name is the owner's brand; the domain in titles is enough.

**For the queue:** Melvor Idle 2's and Lowbar Legends' launches (17 and 13 November); galaxy.click's answer on the submission; referrers in Cloudflare's analytics
(the owner); r/ScapeLikes' rules; Idlescape's free Steam launch (8 January 2027); how Kittens Game wrapped its web game; Tiny Terraces and Harvest Dice Profit.

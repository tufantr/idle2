# 003: The social side of online idle games (read 30 October 2026)

Read by a subagent from wikis, Steam reviews and threads, patch notes, the press and Reddit mirrors (Reddit itself
couldn't be opened). "Unverified" marks a fact from one search snippet or one fan source. Then held against Fantasy
Idle's clans (DESIGN §3.18, §3.35; `api/index.js`).

## Clans at a glance

| Game | Size | What the clan does, and how often | How rewards are shared |
|---|---|---|---|
| Idle Clans | 20 (a solo Ironman may found a clan of one, 3x credits) | 5% of every member's skill XP goes to the clan; daily events; bosses up to 20 at once (online only); 4 weekly quests, each a buff the clan picks from 3–4; raids of 1–6; a weekly Clan Cup of 41 boards | Boss loot split evenly; credits buy clan upgrades |
| Legends of IdleOn | 30, to 210 with guild level | 10 guild points from each member's first login a day; 13 daily and 7 weekly tasks | Every bonus to every member; small guilds earn double points by default |
| Firestone Idle RPG | grows with guild level | Expeditions; a shared crystal mined with pickaxes; a monthly Chaos Rift | By damage, +10/6/4% for the top three, 1% for a member who never hit |
| Tap Titans 2 | 50 | Raids with a few attacks per 12-hour cycle | Everyone in the clan when the raid began |
| AFK Arena / Journey | 30 (to 70) | Daily boss hunts (2 tries, a third bought with VIP); Guild Wars over five days, 10 members at least; Journey's real-time Clash of Glory | By damage, plus a top-damage bonus |
| RuneScape 3 | 500 | The Clan Citadel, kept weekly; 1,000–2,700 resources a member a week | Capping (~900 a week) unlocks bonus XP |
| Old School RuneScape | 500 | A social layer: broadcasts of drops, pets, levels, personal bests; event reminders; "last seen" | Nothing shared (Group Ironman shares storage) |

Sources: [Idle Clans clan](https://idleclans.wiki/w/Clan), [clan bosses](https://idleclans.wiki/w/Clan_Bosses),
[Clan Cup](https://idleclans.wiki/w/Clan_cup), [IdleOn guilds](https://idleon.wiki/wiki/Guilds),
[Firestone crystal](https://firestone-idle-rpg.de/wiki/Arcane_Crystal), [AFK guild wars](https://afk.guide/afk-arena-guild-wars/),
[RS3 Clan Citadel](https://runescape.wiki/w/Clan_Citadel), [OSRS clan](https://oldschool.runescape.wiki/w/Clan).

## What worked and what failed, with the evidence

- **Asynchronous wins.** The designs that live with small rosters let each member hit alone (Tap Titans 2's raids,
  AFK's hunts, Firestone's crystal). Online-only bosses (Idle Clans) and fixed-hour wars (AFK Journey's Clash of Glory)
  push clans into schedules.
- **Decay and deadlines failed.** RS3's citadel wore down when a week wasn't paid; upkeep was cut to 20% in December
  2017 and the visitor rule lowered in 2018; requiring a clan for citadels drew a backlash in 2011
  ([talk page](https://runescape.wiki/w/Talk:Clan_Citadel)). Tap Titans 2 removed its six-cycle raid deadline in July
  2022 ([patch notes](https://www.allpatchnotes.com/tap-titans-2-1-july-2022-patch-notes-exciting-clan-raid-changes)).
- **Gating on other people stalls.** IdleOn quests that needed another player stalled because chat was ignored; a player
  wrote that social media shouldn't be needed for complete content
  ([Steam thread](https://steamcommunity.com/app/1476970/discussions/0/3195866053914509013)).
- **Paid or uncapped contribution wrecks fairness.** Firestone's top player held about 100 times fifth's points, and
  players asked for daily limits ([Steam thread](https://steamcommunity.com/app/1013320/discussions/0/510695796907216586/));
  AFK sells a third hunt at VIP 6.
- **Markets need crowds and draw bots.** Idle Clans' order book works because volume exists; Task Bar Hero's tradeable
  drops brought bot farms within weeks (51% positive of 4,072 reviews)
  ([Kotaku](https://kotaku.com/steams-latest-chart-topping-idle-game-is-packed-with-bots-trying-to-sell-in-game-weapons-for-1000-2000706738));
  OSRS bans over 67,000 bots a week ([Jagex](https://oldschool.runescape.wiki/w/Update:Bots,_Bans_and_Appeals:_An_Update)).
  Scapewatch (Steam, 25 September 2026, 88% of 562) launched with clans, broadcasts and raids, and no market.
- **A feed makes a quiet clan feel alive.** OSRS and Scapewatch broadcast members' drops, pets, levels and personal
  bests; it costs no moderation, unlike chat (Idle Pixel's mutes, Milky Way Idle's weighted reports).
- **Clients that decide get cheated.** IdleOn runs much of its logic on the player's machine, and public cheat injectors
  exist ([IdleonWeb](https://github.com/xi-ve/IdleonWeb)).
- **Small teams' social features end when the team tires.** Idlescape's volunteers announced a sunset on 1 October 2025;
  a new owner took over ([news](https://www.idlescape.com/news/new-management)).

## Held against Fantasy Idle

| Lesson | Fantasy Idle today | Verdict |
|---|---|---|
| Asynchronous attacks with saved heroes | The weekly boss is fought with the saved hero, three a day, six banked | Aligned |
| Forgive a missed day | Attacks bank up to two days | Aligned |
| No market; give within the clan | No market; the Clan Hall takes gifts | Aligned |
| The server decides | Every number another player sees comes from the stored save; forged-save checks | Aligned |
| Split automatically, with a floor | The banner lifts every member, fought or not; the board shows shares | Aligned |
| Pause, never decay | The hall doesn't decay; the banner is the week's | Aligned |
| Cap each member, never sell attempts | Three attacks a day; hall gifts limited by a member's week of work | Aligned; keep it so when power goes on sale |
| Rank for the population you have | Weekly divisions (Gold, Silver, Bronze) for three live clans; one division shown this week | Gap: divisions add little at this size |
| Scale to the roster, favour small clans | A boss level is counted in members' attacks (level 1 = 20, x1.2 a level), so it takes about 13 fully active members to fell all seven; a solo player fells one (x1.5), three players two (x1.75), a full clan seven (x3) | Gap at today's size: no clan can reach the top, and the top three live clans felled 3–4 levels this week |
| Never gate progress on another person | The banner is up to x3 for clan members and x1.5 at most alone | The owner's design (clans are the heart); worth showing the numbers |
| A feed of members' milestones | The Clan Hall shows gifts; nothing else of members' play | Gap: cheap to add |
| Clear out ghosts | Leadership passes to the longest-serving member only when the leader leaves; no "last seen" shown | Gap: small |
| Block hopping | The Endless Hydra counts members who were in when the week began; the banner counts anyone in the clan | Small gap, low risk at this size |
| Normal play feeds the clan | Only gifts and attacks feed it | The clan-levels idea could take 5% of members' XP, as Idle Clans does |

## What it says about the open clan ideas

The owner's open choice is between clan levels with talents, weekly clan quests and clan wars. The evidence:

- **Weekly quests are the common, cheap, asynchronous form:** Idle Clans gives four a week, each letting the clan pick a
  buff (five at most); IdleOn has 13 daily and 7 weekly guild tasks; Tap Titans 2 has clan quests. They feed the clan
  from normal play and need no crowd.
- **Clan levels are a slow counter fed passively:** Idle Clans sends 5% of members' skill XP to the clan; IdleOn
  counts each member's first login of the day. They make a member who only logs in still count.
- **Wars need many clans and matchmaking:** AFK needs 10 members and merges small guilds; Journey's war is real-time at
  a fixed hour. The owner's roadmap already says "once there are enough clans".

So the research favours quests and levels together, as Idle Clans has them: weekly quests that members finish by
playing, paying clan XP, and levels that open clan talents. Wars stay later.

## Proposals from this file

- **A clan feed** (Add, S–M): the Clan tab lists members' moments, worked out on the server from their uploads: a new
  best stage past each hundred, a Lord felled, a skill to 99, a pet, a unique, a Trial tier. A quiet clan looks alive;
  no chat to moderate.
- **"Last seen" and leaders who come back** (Add, S): the member list shows when each member last played (the server
  has `last_saved`), and a leader away for 30 days hands the clan to the longest-serving active member.
- **One table while the clans are few** (Change, S): below some number of clans (eight, say), the week's ranking is one
  table with no divisions, and each clan's own best week is shown beside it; divisions come back as clans fill.
- **Small clans can reach the banner's top while the game is small** (Change, S, the owner's balance call): size a
  boss level to the clan's active members up to some number (for instance, as if a clan had at least eight), so three
  players can fell more than two levels; or keep it and say on the boss how many attacks each level takes. Numbers to
  measure with `tools/clanpower.mjs` first.
- **Clan quests and clan levels, together** (Add, M–L, the owner's open choice): four weekly quests met by playing
  (gather, craft, fell, give), each paying clan XP and a buff the clan picks; members' XP feeding the clan at a small
  share; levels opening clan talents. Wars later.
- **A newcomer's banner from the next week** (Change, S, low priority): as the Endless Hydra already does, so a player
  can't hop into a strong clan for its banner at the week's end.

# 044: Players again: the Discord's third pass, and live depth week by week (read 12 November 2026)

Two reads.
- **The Discord.** The game's server (#welcome, #general, #announcements, #feedback, #bug-reports and #suggestions) was read in the owner's
  browser at 00:40 Istanbul time on 12 November.
- **The live database.** Read-only (`SET default_transaction_read_only = on`), at 21:37 UTC on 11 November:
  - `weekly_snapshots`: each board player's best stage at their first upload of each ISO week;
  - `users` and `clan_members`: clan membership and the last upload;
  - clan attacks and Hydra fights by week.

No password, email or save was read, and no player is named here.
- Letters stand for players.
- C is the owner's own account.
- B is a tester's account, which was given gold for tests in October. Its pace is not a player's.

## In short

- **Nobody has written in the Discord since 4 November.** The last words were the false-flag thread in #bug-reports, already read in 001's
  second pass. #general's last post is from 1 November and #announcements' from 29 October. The server has 7 members (8 on 30 October).
  The fixes of 4 November, three of them for one player's reports, were never announced there.
- **Live players climb fast to about 1,800, then slow hard.** Below 1,800 they gain 600–1,470 stages a week. Above it, gains drop to
  60–200 in the first three days of this week. One player went from stage 183 to 1,650 in a week, then to 2,260 the next.
- **That is faster than the simulator's bot.** The bot reaches 2,000 at 831–847 hours of game time, five weeks (032). Player A crossed
  1,000 and 2,000 within about two weeks of wall-clock time. Wall-clock time is at least the game time, since time away past 24 hours is
  lost. This is evidence for P-122, and the yardstick for 039's fixed bot.
- **Clan members are the players who stay.**
  - Of members more than two weeks old, 10 of 18 played in the last 7 days; of the others, 2 of 24.
  - Every player past stage 1,000 is in a clan, and non-members' median best is stage 29.
  - This is selection, not proof: the Clan tab opens with depth, and players who leave early never reach it.
- **The clans' week kept going while the Discord was quiet.** 8, 10 and 11 players attacked the clan boss in the weeks from 19 October,
  26 October and 2 November, and 7 have so far this week. 6 and 7 players fought the weekend Hydra.

## The Discord

| Channel | Last post | Since 4 November |
|---|---|---|
| #general | 1 November | none |
| #feedback | 1 November | none |
| #suggestions | 1 November | none |
| #bug-reports | 4 November (the flag thread, in 001) | none after it |
| #announcements | 29 October | none |
| #welcome | 30 October | none |

There is no new idea, report or question to add to 001. Three of the 7 members were online when the server was read.

- **What went unsaid.** The deploys of 4 November (2b8bc24, 6ea4de0) fixed the false flags, the black box behind a talent's word, and
  Smithing's "missing" actions (the metals' strip). One player had reported all three. They were told in the thread, but nothing went to
  #announcements, where the last patch notes are from 29 October. The two promises of 1 November (P-074) are still open, 11 days on.
- **What it means.** At this size the Discord lives on the owner's posts. P-111 makes a changelog post one yes at each deploy, P-016 puts
  the same lines in the game, and P-043's monthly totals give a reason to post when nothing has shipped. P-110 still matters: nobody who
  left the server since 30 October can be reached there.

## Live depth by week

Each cell is the best stage at the player's first upload of the ISO week (W43 starts 19 October, W44 26 October, W45 2 November and W46
9 November). A dash means no snapshot: snapshots are kept only for players on the boards.

| Player | W43 | W44 | W45 | W46 | Best, 11 Nov | Last upload |
|---|---|---|---|---|---|---|
| A | 102 | 183 | 1,650 | 2,260 | 2,320 | 11 Nov |
| B (tester) | 360 | 1,258 | 1,860 | 1,920 | 2,070 | 11 Nov |
| C (owner) | 90 | 1,090 | 1,610 | 1,950 | 2,050 | 11 Nov |
| D | 378 | 474 | 1,803 | – | 1,870 | 3 Nov |
| E | – | 590 | 920 | 1,680 | 1,840 | 11 Nov |
| F | – | 90 | 183 | 1,540 | 1,740 | 11 Nov |
| G | 193 | – | – | – | 2,440 | 11 Nov |
| H | 347 | – | – | – | 1,480 | 25 Oct |
| I | 134 | – | – | – | 977 | 25 Oct |
| J | 160 | 410 | – | – | 580 | 30 Oct |
| K | – | 104 | 450 | – | 550 | 6 Nov |
| L | 119 | – | – | – | 422 | 24 Oct |

- **The fast stretch.** A gained 1,467 stages in one week (W44 to W45), D 1,329, F 1,357 and E 760. Each gain began between stage 183
  and stage 920.
- **The slow stretch.**
  - A gained 610 the next week, then 60 in this week's first three days, at 2,260–2,320.
  - E gained 160 and F 200 in the same three days, at 1,680–1,840.
  - The owner's and the tester's heroes gained 60–340 a week between 1,860 and 2,070.
  - The deepest, G, went from 1,980 to 2,440 in the week to 11 November (027). One hero can still move 460 a week past the wall.
- **Where players stopped.** Five board players' last uploads came before 7 November, at stages 422, 580, 977, 1,480 and 1,870. That's
  five of twelve in three weeks, at every depth.
- **The bot.**
  - 013's batch: at 300 hours the bot stood at 1,460.
  - 032: it reached 2,000 at 831–847 hours.
  - A stood at 1,650 within two weeks of starting (336 hours or less), and passed 2,000 a week later.
  - 039 re-measures with the stall test fixed. A's path and the slowdown near 1,800–2,000 are the live marks to set it against.

## Clans and who stays

| | Accounts | Played in 7 days | Played in 1 day | Older than 14 days: played in 7 days | Median best | Past 1,000 |
|---|---|---|---|---|---|---|
| In a clan | 19 | 11 | 10 | 10 of 18 | 1,452 | 10 |
| Not in a clan | 26 | 4 | 2 | 2 of 24 | 29 | 0 |

- **Clans by size.** The five clans have 10, 4, 3, 1 and 1 members. Of those, 5, 2, 3, 1 and 0 played in the last 7 days.
- **The clan boss.** Players attacking it: 3 in W42, 8 in W43, 10 in W44, 11 in W45, and 7 so far in W46 (8, 64, 139, 133 and 47 attacks).
- **The Hydra.** 6 players fought it in W44 and 7 in W45 (10 and 13 fights). W46's weekend hasn't come.
- **What it means.**
  - A weekly clan quest (P-004) would reach about 11 players today, and the clan's week already holds them without the Discord.
  - The largest clan has 5 active players of its 10. The list showing who plays (P-035) and a leader's handover after 30 days away
    (P-009) fit what is there.
  - Membership marks the players who stay. It can't show that clans make them stay.

## Held against Fantasy Idle

| Finding | The game today | Verdict |
|---|---|---|
| The Discord is silent once the owner stops posting | A deploy posts nothing (`deploy/vps/deploy.sh`); #announcements was last used 29 October | P-111 with P-016; P-043 |
| A promise to a player still open after 11 days | No wiki link in the game; no mark at the speed cap (041, P-074) | P-074 first |
| Live heroes faster than the bot, then slow near 1,800–2,000 | The bot's stall test is broken (P-122) | P-122; 039 |
| The deepest player gains 460 a week; others 60–200 | The ceiling is 6,000 and the save's wall 10,000 (P-024) | P-024 stands; its date depends on the deepest hero |
| Clan members stay, and others leave early | The Clan tab opens with depth; no clan quests yet | P-004; P-035, P-009 |

## Proposals from this file

None new. It adds evidence for P-111, P-016, P-043, P-074, P-122, P-024, P-004, P-035 and P-009.

**For the queue:** the Discord again after Melvor Idle 2's launch week; live depth by week again in two weeks (W47–W48), to see whether the
slowdown near 1,800–2,000 holds for the next players; the depth where players stop, once there are more of them.

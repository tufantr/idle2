# 001: Fantasy Idle's own Discord, 22–30 October 2026

Read on 30 October 2026: #general, #feedback, #suggestions and #bug-reports of the game's Discord (the owner's server).
Eight members; two or three post. Players heard from: Shadeofnight (most active), Tigers, closer92, 5lbsOfPez, paseux.
Three clans were live in the week's ranking: Insomniacs [ZZZ], Curiosity [CUTE], Dal DaSSaq [SIK].

## Everything players said, and where it stands

| Date | Who | What | Where it stands |
|---|---|---|---|
| 23 Oct | Shadeofnight | The bonfire is capped at an hour: show it on screen; longer would help overnight | Shown in every skill (513a3ff). The cap stays: the owner keeps the fire for active play |
| 23 Oct | Shadeofnight | Welcome messages clutter #general | #welcome made |
| 23 Oct | Shadeofnight | Agility: "best off not building anything", obstacles seem to slow the lap | The owner explained it in chat (a lap is the sum of the built obstacles' times; upgrades add XP per lap). The course itself doesn't show the trade-off |
| 23 Oct | Tigers | Training Cooking so food is never short | Supplies matter to players, as intended (DESIGN §3.28) |
| 27 Oct | closer92 | "How do I export my guest account?" | Not possible by design (f5494d5: an account starts its own game); the player started over |
| 28 Oct | 5lbsOfPez | What roadmap is there? | The owner posted it in #general with a reaction vote (clan levels or clan quests); two days on, no votes, one other reaction |
| 29 Oct | Shadeofnight | Spare uniques for Salvage weaker; jewellery salvaging for nothing; Combat XP past 99 | Built or answered (fbf5369) |
| 29 Oct | Shadeofnight | "Is there a good reason to take 3 Trials per prestige?", "does it matter which 3?" | Answered in chat by the owner; the dialog doesn't make the answer evident |
| 29 Oct | Shadeofnight | Tell open games that a new version is out | Built (798cc79) |
| 30 Oct | paseux | Let an Ascension go straight into a Trial (Faithless, "your tokens give nothing"), unlocked after an Ascension and five Faithless tiers | The owner: interesting, will check the balance |
| 30 Oct | paseux | Bug: "Everybody 2nd" (a screenshot of the Clan tab's week's ranking) | Not yet answered. Measured below: a real display bug |

## The crowns bug, measured

In "This week's ranking" (`clanStandings` in `src/ui/render.js`) the top three wear a crown, tinted by place in
`style.css`: 2nd greyed (`grayscale`), 3rd sepia, 1st left as the atlas draws it. The atlas's crown is red and amber with blue and white gems,
not gold, so at half scale the 1st reads like the others (012 works out grey for the 2nd and nearly the same brown for the 1st and 3rd). The player's screenshot shows that, for this week's ranks and for last week's crowns beside the division names. The same crown marks a clan in the
clan list and on its own panel (`crownMark`), where a title names the place; the ranking's crowns have no title.

## What the feedback says as a whole

- **Most of it is about clarity, not content.** Agility, Trials and Pacts, the salvage messages, the bonfire's time,
  the crowns: each rule worked, but the screen didn't show its consequence, so players reasoned from what they saw and
  got it wrong. The house rule ("show what is ready on the thing itself") applies to consequences too.
- **Players reach the late systems within a week.** Trials, Pacts and Ascension are already in play (Shadeofnight on
  29 October, paseux on 30 October): late-game clarity matters now, not later.
- **The community is too small for reaction votes.** Eight members, two or three active: a vote by reactions gave
  no signal in two days. Discord's native polls (a fixed end, a count shown to all) or one direct question to the
  active players would do more.
- **A guest's game stays behind when the player makes an account.** The sign-in says so before a guest starts, and the
  decision (an account starts its own game, so a guest's unchecked save never reaches the clans and boards) is sound;
  a player who wants an account later still starts over, which is the cost of that decision.

## Proposals from this file

- **Crowns that read as 1st, 2nd and 3rd** (Change, S): tint the 1st gold, and give the ranking's crowns the title the
  clan list's already have. A bug a player reported.
- **The course shows what an obstacle changes** (Change, S): today the course says "N s a run · N XP", and an
  obstacle's own time and XP sit in its button's title, which a phone never shows (`renderAgility`). Show the course's
  XP per hour, and on each obstacle to build or upgrade the change it makes to that rate beside its bonus, so a player
  sees that the bonuses are the point and what each costs in speed.
- **Trial cards and Pacts show what they pay** (Change, S): before choosing, the pick line says in numbers what the run
  would clear (each Trial's next tier and the records it brings), so "why three?" answers itself. Check the current
  pick line first (`FI.pickTrial` in `src/main.js`).
- **Ascend into a Trial** (paseux's idea): no change proposed (the owner's reasoning, 1 November, tested on the game
  code). Faithless lasts one run: the tokens stay held, worth nothing in that run, and come back at the next prestige
  with what the run paid. So it needs no timing around an Ascension. One simulated hero (seed 1, no Trials before):
  at best 500 a plain run reaches 490 and a Faithless run 320, paying 52% of the plain run's tokens; at best 900, 890 and
  510, paying 43%. The shortfall is 2.0% and 1.5% of the tokens held, against +5% on what tokens give for a new tier. The
  Faithless card says only "Your tokens give nothing"; the "?" says the next prestige ends a Trial (see P-007).
- No change for guests: the sign-in already says "A guest plays in this browser only, and an account made later starts
  a new game", and Settings says it again (`src/ui/render.js`). closer92 was told, and asked anyway.

## Second pass, 30 October to 4 November (read 4 November)

The same channels. Names are left out where a false flag is involved (flagged accounts stay out of this repo).

| Date | Who | What | Where it stands |
|---|---|---|---|
| 31 Oct | paseux | Withdrew "Everybody 2nd" after reading the wiki | The crowns stay a small fix (P-001), no longer a reported bug |
| 31 Oct | paseux | "The skill's 12 actions", but only 7 show | Told on 1 November they open with the level; wrong, at Smithing 84 with 160+ levels in the other five. They are the metals at the anvil, listed since 6ea4de0 |
| 31 Oct | paseux | A link to the wiki in the game; a mark when attack speed reaches its cap | The owner, 1 November: both "this week". Not built |
| 1 Nov | paseux | A black box behind a word over the boss | The War Tree's words shared a class with its talent frames. Fixed in 6ea4de0 |
| 1 Nov | a player | Gone from the leaderboard | Told it was the delay after changing clans, which doesn't touch boards. A false flag was the cause. |
| 4 Nov | a player | Clan attacks suddenly doing almost nothing | A false flag, capped at 1%. Limits fixed (2b8bc24), flags cleared, the 4 attacks given back |
| 4 Nov | a player | Do lower metals need low gear to train? | The owner: "for now, yes". True: reinforcing uses the best tier the slot has held, so a lower metal trains only by rerolling a worn low piece: 282 rerolls of a copper chest piece for mastery 50, 36,207 for 99 (5 bars a reroll, a second of practice a bar) |

What it adds:

- **One careful player found five real issues in a week.** Each came with a precise description. They read the wiki, and it settled one.
- **The game's own word for a flag didn't explain it.** "Capped: this account's save showed impossible numbers" was reported as a message about "no possible value". Nothing says what to do next, and players were capped for days before one of them asked (P-025).
- **Answers given from memory went wrong twice.** Both sounded right, and both took days to come apart. The code and the database settled them in minutes.

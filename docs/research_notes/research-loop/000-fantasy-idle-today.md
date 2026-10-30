# Fantasy Idle today: the baseline every finding is held against

What the game has on 30 October 2026 (commit 798cc79), in one line each, from `docs/DESIGN.md` (section numbers in
brackets) and the code. Update it when the game changes, so a gap analysis compares against the live game.

## Skills and production

- **Eleven skills** on the OSRS/Melvor XP table to 99 [§3.1], at Melvor's pace: 190–290 h of training per skill
  (`src/data/pace.js`). Mining, Woodcutting, Hunting (with the river, which took Fishing), Cooking, Firemaking,
  Alchemy, Farming, Smithing, Crafting, Agility, and Combat.
- **Firemaking's bonfire:** +XP in every skill and a chance of doubles in the producing ones, up to an hour [§3.10].
- **Smithing:** smelting, and the anvil that reinforces and rerolls the gear worn, slot by slot, without a top
  [§3.4, §3.31]. No forging: all weapons and armour drop in the fight [§3.25].
- **Crafting:** jewellery at every rarity, plain pieces (a bar, no gem), and the jeweller's bench (gem slots) [§3.4].
- **Alchemy:** potions on the clock (one-minute doses) [§3.28]. **Cooking:** food that carries the fight [§3.28].
- **Farming:** plots and crops. **Agility:** a course of obstacles with bonuses [§3.10].
- **Tools** bought in the Shop, tier by tier [§3.3]. **Mastery** per action, 1–99, without Melvor's pool [§3.20].
- **Pets:** one per skill (twelve), Melvor's chance formula, about 70 h at level 99 [§3.13].
- **Mini-games:** chances while skilling, open a minute, small rewards; **Focus:** +speed after a minute untouched
  [§3.15]. **Charms:** charged kits bought with essence (four) [§3.34].

## The fight

- **Stages:** ten authored lands of ten stages (a boss with a clock on each tenth), then the Abyss without end in named
  strata, a Lord every 100th stage from 200, a medal every 500 [§3.7, §3.32]. Gilded monsters. A world map.
- **Clicks:** a strike on the monster (a quarter second apart), a combo; a new monster can't be struck for 0.42 s as it
  drops in [§3.6]. A mouse macro is fair play (the owner).
- **Supplies:** food and potions [§3.28]; **the camp:** gold buys attack and health, the biggest gold sink [§3.8].
- **Gear:** drops, rarities up to Mythic and Primal, affixes, reforging, auto-salvage, a 40-slot bag, uniques from
  dungeons (eight a tier) and the Seal that hands them in for records [§3.5, §3.11, §3.25, §3.29, §3.31].
- **Dungeons:** authored gauntlets with a 60-second boss clock, gear locked inside, tiers [§3.11].
- **The Titan:** a 60-second damage race once an hour from stage 20, three banked, a permanent bonus each [§3.12].
- **Combat past 99:** the War Tree, three trees of talents, a point a level up to 233 [§3.33].
- **The full-screen fight:** the fight fills the screen with a dock holding what a run needs [§3.23].

## Resets and long goals

- **Prestige** from stage 10: tokens (permanent attack and defence), skill points for perks, records that multiply,
  Auto prestige later [§3.9]. **Trials** from best stage 200: eight rule sets, endless ladders, Pacts [§3.26].
  **Ascension** from best stage 300: Stars [§3.27].
- **Achievements:** 45 (+1% each to attack, defence and skill speed), medals, the hall of trophies, a bestiary (kill
  stars at 10, 100 and 1,000), a codex of items, a collection [§3.14].
- **A completion percentage** in the Hall: eleven equal parts (skill levels, mastery, bestiary stars, the codex,
  medals, pets, uniques, the first Titans, Trial tiers, Agility's slots, festival cloaks), only ever rising
  (`src/systems/completion.js`). No cape for 100% yet (ROADMAP). **Looks** earned by medals, **capes** at 99, festival **cloaks** [§3.19].
- **The daily crate:** one every 20 hours, three banked, every seventh a great one [§3.14].
- **Weekend events** on the UTC calendar, with their shop and milestones [§3.19].

## Online

- **Accounts** with the server's save as the game (uploads every minute), or a **guest** in one browser [§3.17].
  Offline progress replays up to 24 hours (perks and the Zipline add more) with a welcome-back report [§3.16].
- **Clans** of up to 20: a weekly clan boss fought on screen (three attacks a day, six banked, openings to strike), the
  clan banner (x1.5 to x3 for every member as it falls), the weekend's Endless Hydra and weekly divisions, the Clan
  Hall built from members' gifts (skilling and supply bonuses, the clan's cloak), opt-in leaderboards [§3.18, §3.35].
  Every number another player sees is computed on the server from the stored save.
- **A new version, offered** in the top bar (§3.17, 29 October 2026).

## Look and feel

- Painted backdrops (Gemini) behind pixel sprites (Dungeon Crawl Stone Soup, CC0), the battle scene and the skill
  stage, synthesized sound, celebrations for big moments, a screen that grows with the player (disclosure), phones
  with a bottom hotbar, an installable web app, reduced motion honoured [§3.21–§3.23].

## Around the game

- A wiki built from the game's data (wiki.fantasyidle.com), a Discord (#feedback, #bug-reports, #suggestions), an
  itch.io page, a galaxy.click submission. Free, no ads, nothing to buy; the owner intends to sell power later
  (ROADMAP, Decisions 2). Tens of players in the public beta since 22 October 2026.

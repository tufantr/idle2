# 022: The economy and offline play (read 11 November 2026)

Read: wikis, patch notes and game source (Melvor Idle, OSRS, Milky Way Idle, Idle Clans, IdleOn, Antimatter Dimensions, Cookie Clicker, Evolve), two games' market data, Steam
reviews, Reddit via the Arctic Shift archive, two designers; four helpers read in parallel, weighty figures were re-read, and no page held instructions aimed at the reader.
Measured on 6ea4de0's code: a scratch `tools/simulate.mjs` booked every coin, essence, bar and gem to what moved it (300 h; always on, `--auto --pacts --charms`;
`--player=checkin3 --auto`; seeds 1, 2); `tools/ledger.mjs` and a camp bench read heroes it saved at stages 700, 1,000 and 1,300. No live saves.

**In short:** gold can't go the way of Melvor's GP: it resets each run, and past 25 levels the camp's price rises ×1.6 a level, so any amount buys more (the always-on bot
spent 91–92%). But deep, one camp button in three still works: past stage 1,000, 51–67% of camp gold buys Armour Rack and Hearth levels past the defence cap and any threat.
Moved to the Whetstone (the one gold purchase that moves the deep climb, worth 183–214 stages), that gold would add only 3.3 stages, so what the buttons lose is honesty, not
power. Essence piles up (2M unspent at hour 300) while bars bind, and fixed material rewards turn to noise. Offline, 24 full-rate hours are the generous end of free caps and
accounts run on the server's clock; the report hides the hours the cap cut.

## How others keep a currency meaningful, and where one died

- **Melvor's GP is the cautionary tale.** Bank slots cost 34 GP at first and a flat 5M from the 119th, so 500 slots come to about 1.9B
  ([Bank](https://wiki.melvoridle.com/w/Bank), summed here); the dearest item is a 2.15B hat ([Shop](https://wiki.melvoridle.com/w/Shop)), against 110–225B an hour at best
  ([Money Making](https://wiki.melvoridle.com/w/Money_Making)). Its developers wrote that Township's Trader "devalued GP entirely" and capped it
  ([v1.1.1](https://wiki.melvoridle.com/w/V1.1.1)); in September 2026 a player still held 14B with nothing to buy
  ([archive](https://arctic-shift.photon-reddit.com/api/comments/search?link_id=1wb82h0&limit=100)).
- **Markets tax every sale, and prices still drift.** OSRS's 1% Grand Exchange tax (2021) went to 2% in May 2025, its money sinks having fallen behind
  ([2021](https://oldschool.runescape.wiki/w/Update:Grand_Exchange_Tax_%26_Item_Sink), [2025](https://oldschool.runescape.wiki/w/Update:Yama_CAs_%26_More!)). Milky Way Idle
  takes 4% for buffs everyone gets ([Marketplace](https://milkywayidle.wiki.gg/wiki/Marketplace)), yet a bag of 10 Cowbells now sells near 1.35M coins
  ([file](https://www.milkywayidle.com/game_data/marketplace.json)), 282.5k in June 2025 by a helper's reading of an archive (unverified). Idle Clans takes 1%
  ([API](https://query.idleclans.com/api/Configuration/market-settings)), and its median item fell to 0.95× in the year to November (587 items, worked out here from its
  [prices](https://query.idleclans.com/api/PlayerMarket/items/prices/history?period=1y)).
- **Long incrementals make sinks exponential, or convert the surplus.** IdleOn's coins run in 30 tiers of ×100 to 1e58, and Vault prices grow ×1.025 to ×25 a level
  ([Coins](https://idleon.wiki/wiki/Coins), [Vault](https://idleon.wiki/wiki/Upgrade_Vault)). NGU's linear sinks fell behind (a late player held e82 gold against costs of e9
  to e25, [Steam](https://steamcommunity.com/app/1147690/discussions/0/2967272951893239748)), so it added Money Pit tiers to 1e70
  ([wiki](https://ngu-idle.fandom.com/wiki/Money_Pit)). Realm Grinder pays gems as the square root of coins and at Ascension takes every income multiplier to its tenth root
  ([Gems](https://realm-grinder.fandom.com/wiki/Gems), [Ascension](https://realm-grinder.fandom.com/wiki/Ascension)); in Antimatter Dimensions autobuyers take the buying over
  and its last layer removes it ([code](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/secret-formula/reality/imaginary-upgrades.js)).
- **The rule under it** ([Daniel Cook, Value chains](https://lostgarden.com/2021/12/12/value-chains/)): sinks are fixed, repeatable, exponential or competitive; long-term
  players overwhelm fixed ones, and a surplus stops pulling players to the work that made it.

## Crafting against drops

- **A bridge, with drops at the peak.** Melvor's smithed Rune and Dragon armour serve from combat 40 to 85 and dropped God armour from 85; its crafted level-100 sets beat God
  armour, and its very best gear drops again ([Attack/Training](https://wiki.melvoridle.com/w/Attack/Training),
  [Throne of the Herald](https://wiki.melvoridle.com/w/Combat_Guide/Throne_of_the_Herald)). Last Epoch keeps its top two affix tiers drop-only so the hunt stays worth it
  ([2020](https://forum.lastepoch.com/t/introducing-tier-6-and-7-item-affixes/22279)).
- **Busywork when the product is worn briefly or only fed to a level.** A 3,215-hour Melvor review says most craftable gear is worn briefly, a few potions overshadow about
  90%, and a finished Township makes gathering redundant ([Steam](https://steamcommunity.com/app/1267910/reviews/?browsefilter=toprated&filterLanguage=english)); Smithing
  70–99 takes 98,375 runite bars ([Smithing/Training](https://wiki.melvoridle.com/w/Smithing/Training)).
- **A random stop is punished; a sure step is praised.** Diablo 4's tempering bricked an item after about five tries and its top masterwork cost 10M gold, cut to 2.5M in two
  weeks ([Charlie Intel](https://charlieintel.com/diablo/diablo-4-tempering-system-needs-change-to-save-bricked-items-329582),
  [Dexerto](https://www.dexerto.com/diablo/diablo-4-1-4-1-patch-notes-masterworking-improvements-2745106/)); Last Epoch's crafts all succeed until a visible budget runs out
  ([2021](https://forum.lastepoch.com/t/crafting-changes-coming-to-eternal-legends-update-0-8-4/45597)).

## Offline play

| Game | Free cap | Rate | Past the cap | Source |
|---|---|---|---|---|
| Melvor Idle | 24 h (12 h until 2021, then 18 h) | full, replayed | lost | [wiki](https://wiki.melvoridle.com/w/Offline_Progression), [V1.0](https://wiki.melvoridle.com/w/V1.0) |
| Idle Clans | 12 h; +6 h for 44.2M gold, +6 h with premium | full | lost | [upgrades](https://idleclans.wiki/w/Offline_progress), [premium](https://idleclans.wiki/w/Premium_membership_token) |
| Milky Way Idle | 10 h; 72 h for 26,700 Cowbells, +10 h with the MooPass | full | the queue stops | [Cowbell Store](https://milkywayidle.wiki.gg/wiki/Cowbell_Store) |
| Scapewatch | 16 h (8 in the demo); 48 h with two paid packs | full, on its server | lost | 006 |
| Egg, Inc. | up to 6 h; 30 h with a $9.99 permit | half; full with it | lost | [Silos](https://egg-inc.fandom.com/wiki/Grain_Silos), [Permit](https://egg-inc.fandom.com/wiki/Permit) |
| Legends of IdleOn | no hour cap found | fighting 20%, up to 85% | kept until claimed | 007 |
| Cookie Clicker | none until an upgrade; then 1 h, up to 176 h | 5%, up to 91% | a tenth of the rate | [main.js](https://orteil.dashnet.org/cookieclicker/main.js) |
| Antimatter Dimensions | no time cap; 100,000 ticks by default | full, coarser ticks | none | [player.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/core/player.js) |
| **Fantasy Idle** | **24 h; 36 h with Endurance, 41 h with the Zipline** | **full, replayed** | **lost** | `core/modifiers.js`, `data/perks.js` |

- **Players punish sold hours, not a free day.** 8 of Scapewatch's 10 most helpful negative reviews name its paid offline time; none of Melvor's or Idle Clans' top ten mention
  offline ([Scapewatch](https://steamcommunity.com/app/4671380/negativereviews/?browsefilter=toprated&filterLanguage=english),
  [Melvor](https://steamcommunity.com/app/1267910/reviews/?browsefilter=toprated&filterLanguage=english),
  [Idle Clans](https://steamcommunity.com/app/2103530/reviews/?browsefilter=toprated&filterLanguage=english)). Kongregate's Anthony Pecorella told GDC Europe 2016 that Egg,
  Inc.'s two-hour limit was a mistake that largely made them quit it
  ([slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)). The helpers found no published figure that splits retention
  by cap.
- **Good reports count what was cut.** Melvor has told a player past the cap since 2020 and pushes a notice when it is reached
  ([V0.16.2](https://wiki.melvoridle.com/w/V0.16.2), [V0.19.1](https://wiki.melvoridle.com/w/V0.19.1)); Cookie Clicker splits the time paid at full and reduced rates
  ([main.js](https://orteil.dashnet.org/cookieclicker/main.js)); Antimatter Dimensions shows about 30 resources before and after
  ([modal](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/components/modals/AwayProgressModal.vue)) and opens a recap of every system after 14 days
  away ([recap](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/components/modals/catchup/CatchupModal.vue)). Fantasy Idle's report says more, but
  prints only the counted time: 30 hours away reads "24h 0m" and "offline time is capped", with the six lost hours nowhere (`ui/render.js:2843`, `:2901`).
- **Clocks.** AD refuses negative time ([game.js](https://github.com/IvarK/AntimatterDimensionsSourceCode/blob/master/src/game.js)) and Scapewatch plays on its server
  ([wiki](https://scapewatchidlemmo.wiki/)). Fantasy Idle does the strongest for accounts: time away is the server's (`core/save.js` `pull`), the growth check allows only real
  server time plus 30 minutes (`api/index.js` `SLACK_MS`), and a clock turned back carries on (`game.js` `tick`). Only guests, kept off every board, read the device's clock.

## Fantasy Idle's economy, measured

| 300 hours, seeds 1 / 2 | Always on (`--auto --pacts --charms`) | Three visits a day (`--player=checkin3 --auto`) |
|---|---|---|
| Best stage | 1,850 / 1,870 | 458 / 590 |
| Gold spent, and lost unspent at prestiges | 92% and 8% / 91% and 8% | 4% and 96% / 30% and 70% |
| Armour Rack and Hearth, share of camp gold | 63% / 63% | 64% / 65% |
| Essence got, spent, held at the end | 2.02M, 92k, 1.93M / 2.10M, 81k, 2.02M | 0.77M, 0, 0.77M / 0.84M, 0, 0.84M |
| Runite bars got and used; diamonds got and used | 226k and 222k, 293k and 39k / 236k and 232k, 304k and 22k | 71k and 20, 128k and 0 / 80k and 20, 140k and 0 |
| Forge (weapon), bench (amulet); Smithing, Crafting | +30, +28; 89, 68 / +30, +24; 89, 64 | +0, +0; 1, 1 (both seeds) |

- **Gold can't glut.** It resets at every prestige, and the camp's price past 25 levels rises ×1.6 a level while a kill's gold grows ×1.035 a stage, so a deeper run buys one
  more level of each every 14 stages (`data/camp.js`). The always-on bot spent 91–92%, nearly all on the camp, in every 25-hour band.
- **Deep, one camp button in three still works.** The bench gives each saved hero the camp a run near his best would buy. The Armour Rack reaches the 90% cap with 48–57 of its
  107 levels at stage 700, 52–62 of 129 at 1,000 and 54–55 of 151 at 1,300. The Hearth is all needed at 700 (a boss's blow takes 4.5–7.2% of his health), not at 1,300 (0.9%;
  114 levels keep a blow under 4%, so the clock's 23 blows can't fell him). On a ×1.6 ladder the top levels hold nearly all the gold, so camp gold past these points is 33% at
  700, 51–65% at 1,000 and 67% at 1,300; without the two at all a boss's blow would take 16 to 38 times his health. Put into the Whetstone that gold buys 2.3 more levels (ln 3
  / ln 1.6), 3.3 stages at the boss: the cost is meaning, not power, yet the dock offers all three, each with its Max, every run (`campTokens`).
- **Past stage 1,000 the Whetstone is the one purchase that moves the climb.** It is worth 183 stages at the boss at 1,000 and 214 at 1,300, behind only tokens (416, 487)
  among sources other than the gear itself (`tools/ledger.mjs`), and carried 31 of each 300 stages from 700 to 1,300 (`--flow`). A level is 1.4 stages and doubling a run's
  gold buys 1.5 more levels, so gold bonuses are small (the War Tree's Scavenger, +25% for 5 points, is 0.7 stages). The rest is done or trivial: supplies cost 4–6 kills, the
  bag takes 12 buys, agility's prices are fixed, and the Essence Cache sells 10 essence for 30 kills to a hero holding 2M.
- **Essence piles up, bars bind, diamonds wait on a skill.** The always-on heroes spent 4–5% of their essence (the anvil 53–63%, the bench 24–30%, charms 13–16%), and past
  hour 125 under 2%. Runite bars went 98% into the forge: the weapon's next level at hour 300 asks 6,513 bars and 434 essence. Diamonds piled up because past +10 the bench
  asks a Crafting level a level and pays a fixed XP: it stopped at +28 and +24 by hour 100, behind Crafting 68 and 64 (the bot crafted half an hour in 300). Fixed rewards are
  noise: a milestone's 100–300 essence and 1–2 diamonds, the event shop's 10 runite bars (`data/events.js`), the crate's 3 essence a tier (`systems/daily.js`).
- **Three visits a day** lose 70–96% of their gold at prestiges Auto makes while away, the parked Quartermaster's case (ROADMAP: 7% spent; 530 → 850 with a buyer). Their bot
  leaves the fight running at every exit, so Smithing and Crafting stayed at 1 and its bars, gems and essence went unused.
- **Notation.** At 2,440, the best live depth (P-024), a monster has 2.95e47 health, which `fmt` writes 295QaDc; 1.3e42 reads 1.30TDc. A 57-point r/incremental_games thread
  asking for scientific notation (August 2024) has the problem in one reply: "The upgrade button said 1.2tDd. I have 1.3e42. Do I have enough?"
  ([archive](https://arctic-shift.photon-reddit.com/api/comments/search?link_id=1f4c7cz&limit=100)). Antimatter Dimensions offers 21 notations and by default turns scientific
  at 1e33 ([code](https://github.com/antimatter-dimensions/notations/blob/master/src/mixed-scientific.ts)); `fmt` keeps letters to 1e306.

## Held against Fantasy Idle

| Elsewhere | Fantasy Idle today | Verdict |
|---|---|---|
| Fixed sinks overwhelmed: Melvor players hold billions; its developers capped a faucet | Gold resets each run; past 25 levels the camp's price rises ×1.6 a level and takes any amount | Holds: no glut can form |
| Exponential sinks keep a currency's pull (Cook; IdleOn's Vault) | The camp is exponential, but deep its Armour Rack and Hearth buy levels past what works | Gap: two of three buttons dead deep |
| A currency whose sinks stop growing loses its pull (Melvor's GP; NGU's gold, though it resets) | Essence never resets; the forge's essence grows by a fixed step; rewards pay fixed counts | Gap: 96% of essence unspent; fixed rewards fade |
| Markets tax every sale (OSRS 2%, Milky Way Idle 4%, Idle Clans 1%) | No market or trade | Doesn't carry over |
| Buying automated once trivial (Antimatter Dimensions' autobuyers) | The camp is bought by hand, and nothing buys it while away | Parked by the owner (the Quartermaster) |
| Crafting a bridge, drops at the peak; a sure step, not a random stop (Melvor, Last Epoch, Diablo 4's fix) | Weapons and armour drop; crafted jewellery stops at Legendary; reinforcing always succeeds | Right shape |
| 24 hours free at full rate (Melvor); sold hours punished (Scapewatch) | 24 h at full rate, 41 h with perks and the Zipline, nothing sold | Right; keep it (P-057) |
| The report counts what the cap cut (Melvor, Cookie Clicker) | "Offline time is capped", without the hours lost | Small gap |
| Time away on a server's clock; negative time refused (Scapewatch, AD) | The server's clock for accounts, a growth check, a clock turned back handled | As good as the best |
| Scientific from 1e33 by default (AD); players want e-numbers past e30–e60 | Letters to 1e306, compound names from 1e33 (TDc, QaDc) | Evidence for P-018 |

## Proposals from this file

1. **The camp says which levels still work** (Change, S–M; P-075 carried to the camp, with P-074's cap mark). Each token shows its next level's worth in stages at the wall
   that binds, as items do (`gainStages`), and the Armour Rack and Hearth say so once defence is past the cap and a boss's blow is a sliver. Why: past stage 1,000, 51–67% of
   camp gold buys levels that move nothing, behind two of the three buttons; moving it is worth only 3.3 stages, so this is honesty on the button (a fact, not a suggestion
   note), not power.
2. **Size P-062's spill before it reaches the camp** (evidence for P-062). Capped defence spilt into attack at full value would count the Armour Rack's 151 levels as attack,
   about +214 stages at 1,300, far past any build in 015: a spill must be a small fraction, or leave the camp out.
3. **Rewards in materials priced like gold** (Change, S–M). Where the game pays a fixed count of essence, diamonds or bars (event milestones and shop, the crate, the Titan),
   pay a share of what the hero's next forge or bench level costs, as gold is paid in kills. Why: at hour 300 the event shop's 10 runite bars are 0.15% of the weapon's next
   level and a milestone's two diamonds 0.1% of the amulet's, with 2M essence unspent. Essence could also stand in for some forge bars (M, with balance runs).
4. **P-018 with Antimatter Dimensions' switch as its second choice** (Change, S): letters as today, or letters to No (1e30) and then 1.23e33. Heroes past about stage 1,500
   already read compound names; the switch must reach `shortQty`, the raw token counts (P-026) and the log's `toLocaleString` lines.
5. **The welcome-back report names the hours the cap cut** (Change, S): "away 30h 12m, 24h counted", as Melvor and Cookie Clicker do; `summary.elapsed` already has it.

**Not carried over:** a market and its tax (no trade; 003 found markets need crowds and draw bots); a second currency for new content (gold resets and its prices follow the
best stage); Evolve's 12 hours away banked as 8 of double speed ([code](https://github.com/pmotschmann/Evolve/blob/master/src/functions.js)) and IdleOn's uncapped low rate
(players prefer the honest full-rate replay, 004); selling offline hours (P-057); a camp buyer while away (the Quartermaster: parked, and nothing here answers the owner's
reason).

**For the queue:** Melvor Idle 2's currencies, bank and shop after 17 November; a check-in bot that leaves a skill running on some exits; essence, bars and diamonds to stage
2,300 (015's heroes); the welcome-back after weeks away, against returning players in the Discord; live gaps between uploads.

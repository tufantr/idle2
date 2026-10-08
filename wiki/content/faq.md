---
path: /faq
title: FAQ
section: Guides
sectionPath: /guides
icon: perk/scholar
order: 90
summary: Short answers to the questions players ask most: offline progress, saves, coal and gems, bosses, prestige, gear, pets, mastery, dungeons and more.
keywords: faq, questions, help, answers, offline, save, cloud, coal, gems, boss timer, prestige, auto prestige, pets, mastery, fragments, titan, gear, phone, install, sound, motion
aliases: Frequently asked questions, Questions, Help
---
Short answers, each with a link to the page that tells the whole story. New to the game? Start with [[/guides/getting-started|Getting started]].

## Playing and saving

### Does the game play while I'm away, or with the tab closed?

Yes. Whatever your hero was doing when you left, the fight or a skill, carries on for up to {{BASE.baseOfflineHours}} hours, and a **Welcome back** report shows what happened. The Endurance [[/perks|perk]] adds {{PERKS.find(p => p.id === 'endurance').mods.offlineHours}} hours a level (up to {{BASE.baseOfflineHours + PERKS.find(p => p.id === 'endurance').max * PERKS.find(p => p.id === 'endurance').mods.offlineHours}} hours in all), and the Zipline on the [[/skills/agility|agility course]] adds more. A tab left in the background keeps playing too. See [[/offline|Offline progress and saves]].

### Where is my save? Is there a cloud save?

Your save lives in this browser, on this device. It is saved automatically as you play and whenever you leave the page, and Settings keeps a few automatic backups you can restore. Clearing the browser's site data deletes it, so keep a copy: Settings can **copy an export string**, a line of text you can store anywhere and import later. For a cloud save, sign in (on the title card, or in Settings under Cloud save). Your save is then uploaded as you play, and another device loads whichever save has more play time, asking you when it cannot tell. When your save comes from the cloud, the time you were away is measured by the server's clock, not your device's.

### Can I play on my phone, or install it like an app?

Yes. The game fits a phone's screen, with a bar of shortcuts along the bottom (the fight, your work, the Inventory and the daily crate). It can also be added to your home screen: in Safari use **Share**, then **Add to Home Screen**; in Chrome use the menu's **Install app** or **Add to Home screen**. It then opens in a window of its own, like an app. Some phones keep a home-screen app's storage apart from the browser's, so sign in for a cloud save (or move your save with an export string) to keep the same hero.

### How do I turn off motion or sound?

In **Settings**, under Options: **Sound and vibration** switches all sound off, with a volume slider beside it, and **Reduce motion** stills the floating numbers and effects. The game also follows your device's own reduce-motion setting.

### How do I change my hero's name or look?

In **Settings**, under Options. {{LOOKS.filter(l => !l.medal).length}} looks are open to everyone and {{LOOKS.filter(l => l.medal).length}} more are earned with [[/medals|medals]]; skill capes and festival cloaks you have earned can be worn there too. See [[/looks|Hero looks]] and [[/capes|Skill capes]].

### Why is a place missing from my sidebar?

Places open one at a time as you play. The sidebar's **Next** card shows the next goal and how far along it is. Places you reach by fighting wait for a breather between them, which only counts while you play with the game in view; one that is ready but waiting shows as **On its way**. Places you earn by working, such as Smithing after some mining, open within {{WORK_GAP_MS / 60000}} minutes. The full list is on [[/places|Places and unlocks]].

### Can my hero fight and train at the same time?

No: your hero does one thing at a time, and starting one stops the other. Some things run on the clock whatever your hero is doing: [[/skills/farming|Farming]] plots grow, the bonfire burns, daily crates ripen and the Titan's attempts wait for you.

## Fighting

### Is tapping the monster worth it?

It helps, but you never have to. A strike hits for {{pct(BALANCE.combat.manualHitMult, 0)}} of an attack and builds a combo, and each stack adds {{pct(BALANCE.combat.comboDmgPerStack, 0)}} to every hit, up to {{BALANCE.combat.comboMax}} stacks. That matters most against a boss's timer and in the Titan's race. Leave the game alone instead and **Focus** gives your hero +{{pct(BASE.focusAttackSpeed, 0)}} attack speed. See [[/combat|Combat]].

### What is the boss timer?

Every {{STAGES_PER_ZONE}}th stage is a boss, and it must fall within {{BALANCE.combat.bossTimeMs / 1000}} seconds of fighting. The clock only runs while your hero fights it, so it works the same while you are away. A dungeon's boss gives {{DUNGEON_BOSS_TIME_MS / 1000}} seconds, and losing there ends the run; the Titan's race lasts {{TITAN_TIME_MS / 1000}} seconds.

### Why did my hero go back a stage?

There are three reasons.

- **A boss held out.** Your hero steps back one stage and fights there for {{BALANCE.combat.regroupMs / 1000}} seconds, then tries the boss again. To try at once, tap the boss's skull on the stage path.
- **Your hero fell.** Your hero goes back to the first stage of the place (or, when already there, to the stage before the previous boss), rests at the campfire until healed, then fights on.
- **You prestiged.** A new run starts at {{pct(BALANCE.prestige.startStageFraction, 0)}} of your best stage.

### What are gilded monsters?

About one ordinary monster in {{Math.round(1 / BALANCE.rewards.gildedChance)}} on the stage ladder arrives gilded, with a banner and a chime. It is the same fight for {{BALANCE.rewards.gildedGoldMult}}× the gold and {{BALANCE.rewards.gildedXpMult}}× the XP, plus a gem and some essence for certain. Your first one comes early, in the meadow.

### What is Focus?

Leave the game alone for {{BASE.focusAfterMs / 1000}} seconds (no click, no key) and your hero settles in: +{{pct(BASE.focusSkillSpeed, 0)}} speed in every skill but Farming and +{{pct(BASE.focusAttackSpeed, 0)}} attack speed, until your next input. It counts while you are away, too. See [[/mini-games|Mini-games and Focus]].

### What is the Titan?

From stage {{TITAN_UNLOCK_STAGE}}, a Titan waits on the Dungeons tab, with a new attempt every {{TITAN_COOLDOWN_MS / 60000}} minutes: a {{TITAN_TIME_MS / 1000}}-second race to deal as much damage as you can, at full health. Attempts you do not use wait for you, up to {{TITAN_BANK}}. Each Titan you bring down is gone for good and leaves +{{pct(TITAN_BONUS.atkMult, 0)}} attack and health forever (+{{pct(TITAN_BONUS.atkMult * (titanBonusUnits(TITAN_LATE_FROM + 1) - titanBonusUnits(TITAN_LATE_FROM)), 0)}} after the first {{TITAN_LATE_FROM}}), and the next is stronger. A loss still pays essence for the damage dealt. See [[/titan|The Titan]].

### How do dungeon fragments work?

Each [[/dungeons|dungeon]] clear opens a chest with a fragment, now and then a few. Collect {{FRAGMENTS_PER_UNIQUE}} and **Assemble** the dungeon's [[/uniques|unique item]]: the best piece of its tier, with fixed bonuses. Very rarely ({{pct(DIRECT_UNIQUE_CHANCE, 1)}} of chests) the chest holds the unique itself. Fragments and clears are kept through prestige. Each unique you hold is a record, so it makes your tokens stronger too.

## Prestige

### What does prestige keep, and what starts over?

Your stage, your gold and the camp start over (and a Trial run ends). Everything else stays: skills, levels and mastery, gear and its reinforcing, tools, materials, essence, food and potions, tokens, skill points and perks, medals, pets, dungeon clears and fragments, Titans defeated, the agility course, the farm, and your best stage with its records. See [[/prestige|Prestige]].

### When should I prestige?

When a run stops climbing and the quick fixes (better gear, the camp, food) do not help. Before you have Auto, the Prestige button glows once a run has gone {{BALANCE.prestige.readyStallMs / 60000}} minutes without a new best stage. Deeper runs pay more tokens, so it can be worth pushing a little first: stage 50 pays {{tokensForStage(50)}} tokens, stage 100 pays {{tokensForStage(100)}}. Your first prestige needs no wait; after that a run must last {{BALANCE.prestige.minRunMs / 60000}} minutes. See [[/guides/combat-progress|Getting past a wall]].

### What are tokens, skill points and records?

- **Tokens** come from prestige, more for a deeper run. They are never spent: each gives +{{pct(BASE.tokenAtk, 1)}} attack and defence and +{{pct(BASE.tokenHp, 1)}} health, for good.
- **Skill points** buy [[/perks|perks]] that last forever. You get one for each prestige of a run that reached at least {{pct(BALANCE.prestige.fullRunFraction, 0)}} of your best stage, and one for every {{BALANCE.prestige.spStageStep}} stages of your best ever.
- **Records** make every token stronger: each one multiplies what tokens give by {{BASE.recordMult}}. Every {{BASE.recordStages}} stages of your best ever is a record, and so is every dungeon unique you hold and, later, each Trial tier you clear.

### How does Auto prestige unlock?

After {{BALANCE.prestige.autoAfter}} prestiges, or {{time(BALANCE.prestige.autoAfterMs)}} after your first, whichever comes first, an **Auto** switch appears beside Prestige in the fight's dock. It starts off. Turned on, it prestiges a run that has spent {{BALANCE.prestige.autoStallMs / 60000}} minutes climbing without a new best stage, and your hero walks straight into the next run, even while you are away. It waits while your hero stays on a stage, runs a dungeon, fights the Titan or works a skill.

### What do the colours of my hero's cloak mean?

They show your rank, earned by prestiging: {{RANKS.slice(0, 5).map(r => `${r.name} (${r.cloak}${r.prestiges ? `, ${r.prestiges} prestige${r.prestiges === 1 ? '' : 's'}` : ''})`).join(', ')}}, and more beyond. A rank gives no bonus: it is a mark of how far your hero has come. A skill cape, once earned, can be worn instead. See [[/ranks|Ranks]].

### What are Trials and Ascension?

Late-game choices in the prestige dialog. From best stage {{TRIALS_FROM}}, [[/trials|Trials]] let you play the next run under one hard rule; each of their tiers you clear is a record. From best stage {{ASCEND_FROM}}, [[/ascension|Ascension]] gives up all your tokens for Stars, and each Star makes every later prestige pay {{pct(STAR_TOKEN_GAIN, 0)}} more tokens.

## Gear

### Why can't I wear a piece of gear?

Each gear tier needs a combat level: {{GEAR_TIERS.map(t => `${t.name} ${TIER_WEAR_LEVEL[t.tier]}`).join(', ')}}. Keep fighting to level up, or [[/guides/combat-progress|stay on a stage]] you can beat for a while. Inside a dungeon you cannot change gear at all. See [[/equipment|Equipment]].

### Why can I only forge copper gear?

Forging makes a first set of copper weapons and armour. Everything stronger drops in the fight: from bosses on their first fall in a run, now and then from ordinary monsters, and from dungeon chests. A boss that leaves no upgrade fills a mark on a ring round its stone on the stage path, and the {{PITY_MARKS}}th mark brings a sure piece for your weakest slot. Past copper, Smithing's job is the anvil.

### How do I upgrade gear?

- **Weapons and armour** are reinforced at the anvil in [[/skills/smithing|Smithing]] (from Smithing {{ANVIL_LEVEL_PER_UPGRADE}}) with bars of the piece's own metal and essence: +{{pct(UPGRADE_STEP, 0)}} base stats a level, up to +{{MAX_UPGRADE}}. The anvil also rerolls a piece's bonuses.
- **Jewellery** is upgraded in the Inventory with essence and gold, and reforged there to reroll its bonuses. See [[/equipment/jewellery|Jewellery]].
- A better piece of the same kind takes over the old one's reinforcing, less one level, when you put it on.

### Why did a drop disappear?

It was most likely salvaged. To start with, common drops are salvaged as they land unless they would be an upgrade; once a few pieces have dropped, the Inventory shows this auto-salvage setting ({{AUTO_SALVAGE_OPTIONS.join(', ')}}). A full bag ({{BAG_SIZE}} pieces) salvages its weakest unlocked piece, never one that would be an upgrade. Salvaging gives essence, and weapons and armour give bars of their metal too. Locked pieces are never sold or salvaged.

### What is essence for, and where do I get it?

Essence pays for the anvil's work, jewellery upgrades and rerolling bonuses. Monsters drop it ({{pct(BALANCE.rewards.essenceDropChance, 0)}} of kills, more from bosses and gilded monsters), and it comes from salvaging gear, dungeon chests, the Titan, the [[/daily-crate|daily crate]], [[/events|weekend events]] and the [[/shop|Shop]]'s Essence Cache. See {{res('essence')}}.

## Skills and materials

### How do I get coal?

Mine it at the **Coal Seam**, from Mining {{SKILLS.mining.nodes.find(n => n.id === 'coal').levelReq}}. It also drops in the {{ZONES.filter(z => z.loot.some(l => l.id === 'coal')).map(z => link(path.zone(z.id), z.name)).join(', ').replace(/, ([^,]*)$/, ' and $1')}}, and the Shop's Coal Wagon sells {{GOLD_SHOP.find(e => e.id === 'buy_coal').gives.coal}} at a time. Bars that need it: {{SMELTING_RECIPES.filter(r => r.consumes.coal).map(r => `${r.name} (${r.consumes.coal})`).join(', ')}}. See {{res('coal')}}.

### Where do gems come from?

- **Mining**: each ore has a {{pct(GEM_FIND_CHANCE, 0)}} chance of a gem, of about the rock's tier.
- **Monsters**: {{pct(BALANCE.rewards.gemDropChance, 0)}} of kills, far more often a boss's first fall. A gilded monster always leaves one. Diamonds also drop in the [[Skyreach Spire]] and [[/zones/abyss|the Abyss]].
- **Dungeon chests** ({{pct(CHEST_GEM_CHANCE, 0)}} of clears), the **Titan** (gems with each win) and the **daily crate** (a gem, and a better one besides in a great crate).
- **The Shop**: once Crafting is open, a pouch of {{GOLD_SHOP.filter(e => e.craft).map(e => RESOURCES[Object.keys(e.gives)[0]].name).join(', ').replace(/, ([^,]*)$/, ' or $1')}}, whichever fits your Crafting level.
- The **Voidstone**, the deepest gem, only comes from the Abyss's bosses from stage {{AUTHORED_STAGES + VOIDSTONE_DEPTH * STAGES_PER_ZONE}} on, at {{pct(VOIDSTONE_CHANCE, 0)}} of their first falls.

See [[/skills/crafting|Crafting]] for what gems make.

### Why did my hero stop working?

An action needs its inputs, and it stops when one runs out: the card's chips turn red where you are short. Cooking also needs a log for every dish, and most bars need coal. A tool is made once, so that order ends by itself. Gather what is missing, or pick another action.

### How do I find pets?

Train. Each skill has one [[/pets|pet]] ({{PETS.length}} in all), and every action has a small chance of finding it, larger at higher levels and for longer actions; the combat pet comes from kills. A pet is yours for good and gives its skill a small bonus. The Lucky Paws weekend makes pets {{EVENTS.find(e => e.id === 'lucky_paws').mods.petChance + 1}}× as likely.

### What is mastery?

Every action, such as mining one vein or cooking one dish, has its own [[/mastery|mastery]] level from 1 to {{MASTERY_MAX_LEVEL}}, earned by doing it. Each level makes that action faster, and depending on the action, a little likelier to give a double or to keep its ingredients. At {{MASTERY_CHECKPOINTS.map(c => pct(c.at, 0)).join(', ')}} of a skill's whole mastery, all of its actions get faster for good. Mastery is never lost.

### What is the bonfire?

Burning logs in [[/skills/firemaking|Firemaking]] feeds the bonfire: each log adds {{BASE.bonfireSecondsPerLogTier}} seconds times its tier, up to {{BASE.bonfireMaxMs / 60000}} minutes. While it burns, every skill earns +{{pct(BASE.bonfireXp, 0)}} XP, combat included, rising to +{{pct(BASE.bonfireXpAt99, 0)}} at Firemaking {{MAX_LEVEL}}.

## The world

### What are the weekend events?

Every weekend, from {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][EVENT_START_DAY]}} to {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(EVENT_START_DAY + EVENT_LENGTH_HOURS / 24) % 7]}} (UTC), one of {{EVENTS.length}} festivals runs with bonuses of its own. Every {{EVENT_ACTIONS_PER_TOKEN}} actions or kills earn a Festival Token, up to {{EVENT_DAILY_CAP}} a day, for the event's shop and milestones, and each festival sells a cloak for {{FESTIVAL_CLOAK_COST}} tokens. The Events place opens after your first prestige. See [[/events|Weekend events]].

### How do clans and leaderboards work?

They need an account, so sign in first. The Clan place opens after your first prestige. Join a clan or start one: each week the clan fights a boss together, every member attacking a few times a day with the hero from their cloud save, and everyone who fought shares the rewards. The leaderboards are opt-in. See [[/clans|Clans and leaderboards]].

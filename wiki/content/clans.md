---
path: /clans
keywords: clans, clan, clan boss, weekly boss, clan banner, banner, leaderboards, leaderboard, account, cloud save, sign in, log in, register, attack, rewards, opt in, ranking, clan hall, hall, gifts, give, donate, rooms, forge, library, citadel, clan cloak
---
Clans are the game's online side. Join one, and every week the whole clan fights one shared boss together: each level of it the clan fells raises the **clan banner**, which makes every member stronger until the week ends. Beside the clans are the leaderboards, where you can see how far other heroes have come.

## What you need

Clans and leaderboards work through your account and [[Offline progress and saves|your game on the server]]: it goes up every minute while the game is open and when you leave the page. Everything other players see of you, your clan attacks and your place on a board, is worked out on the server from that saved hero, never from numbers your game sends.

The Clan tab itself opens once you have [[Prestige|prestiged]] and reached stage {{[...Array(1000).keys()].find(s => UNLOCKS.find(u => u.id === 'clan').requires({ prestige: { count: 1 }, combat: { bestStage: s } }))}} (see [[Places and unlocks]]). Until you sign in, it only shows what a clan is.

## Joining or starting a clan

Without a clan, the Clan tab lets you search the clans by name or tag and join one that has room, or start your own: a name, a short tag, a description and a "looking for" line that says who you would like to join. A clan holds up to 20 members, and you can be in one clan at a time.
- You can leave whenever you like. If the clan's owner leaves, the member who has been in it longest takes over; when the last member leaves, the clan closes.
- The owner can remove a member. That member's damage stays on the week's board.
- The tab refreshes itself while it is open, and has a Refresh button.

## The weekly clan boss

Each week, from Monday 00:00 UTC to the next Monday, the clan has one boss to bring down together: the ten lands' rulers take turns, one a week ({{clanBossFor('2026-W41').name}}, then {{clanBossFor('2026-W42').name}}, and so on), each fought on its own land's painting. The Clan tab shows its health and level, each member's share of the week's damage and how many attacks they made, and each member's best stage and total level.

- **Its health is the clan's, counted in its attacks.** Its first level takes about {{CLAN_BOSS.first}} attacks of an average member: a whole fight without strikes or a potion. Members joining or leaving don't change how many attacks it takes, so the more members fight, the sooner it falls.
- **Every member's attack counts.** An attack counts how the fight went (your strikes and your potion raise it, giving up early lowers it) times your **clan power**: how deep your best stage is against the rest of your clan's. Four times as deep counts twice as much, and no one counts more than {{CLAN_POWER.max / CLAN_POWER.min}} times another, however far apart their heroes are. The members average one, so a clan whose members all fight fells the boss just as fast whoever is strong; a clan that leaves it to one strong member goes slower. Members who haven't played this past week, and accounts whose saves showed impossible numbers, are left out of the clan's measure.
- **The boss in your own hits.** Its health is shown in your own damage, so your hits take as much of its bar as they count; the strongest member sees bigger numbers, for the same boss.
- **An attack is a fight.** "Fight the boss" saves your hero to the cloud and takes you into a {{CLAN_ATTACK_SECONDS}}-second fight against it, on the whole screen like the [[The Titan|Titan's]]. Your hero attacks by himself, and the boss never hits back. Give up ends it early, with what you did so far. When it is over, the Clan tab shows the clan again, ready for your next attack, and your hero goes back to what he was doing: his work, his rest, or his fight at the stages (under Combat).
- **Its guard:** the boss drops its guard for {{CLAN_GUARD.open / 1000}} seconds every {{CLAN_GUARD.every / 1000}} seconds, from the {{CLAN_GUARD.first / 1000}}th second on. It glows and the game says "Strike now!". Only then do your [[Combat|strikes]] land, each {{CLAN_GUARD.mult}} times as hard as a strike in a fight, and build your combo; at other times they glance off. Clicking fast in the openings is the most anyone can do, an auto-clicker too: about 1.3 to 1.6 times what your hero deals by himself, more for a slow-hitting hero.
- **The damage is the server's:** the game sends only when you struck, and the server works the damage out from your saved hero and those moments: your attack, crits and attack speed, with no dice rolled.
- **Your hero at his best:** an attack is as strong as your hero's best plain attack of the past seven days, on the day he was strongest, so it doesn't matter where in a run you attack: the [[Camp|camp]] is packed up at every prestige and grows through a run, and the same hero used to hit several times harder at a run's end. Your strikes and your potion then add to it, and the fight on screen hits as hard. A card then shows what you dealt and where it puts you in the clan this week.
- **Levels:** when the boss falls, it is down until midnight UTC, then comes back as the next level with a fifth more health (×{{CLAN_BOSS.growth}}), up to {{CLAN_BOSS.levels}} levels a week if it falls every day (the table below). A boss that isn't brought down stays as it is, with the damage dealt, and Monday brings a new boss at level 1. The Clan tab shows the level, and after a kill which level comes back and when.
- **Saves with impossible numbers:** an account whose save showed numbers no play could reach deals at most 1% of the boss's health an attack, and its card says "Capped".
- **Your attacks:** {{CLAN_ATTACKS_PER_DAY}} a day, at midnight UTC, and those you don't use wait for you, up to {{CLAN_ATTACK_BANK}}.
- **Your combat potion counts:** the one you have picked is drunk as the fight starts, so a good potion makes every attack worth several plain ones (with strikes, Combat Potion I about 2.4, IV about 4.8 and VI about 6.4).
- **What doesn't count:** [[Mini-games and Focus|Focus]], the [[/skills/firemaking|bonfire]], mini-game boosts and the clan banner itself are left out, and a [[Trials|Trial's]] rule doesn't hold your attacks back either.

{{table(['Level #', 'Attacks of an average member to fell it #'], Array.from({ length: CLAN_BOSS.levels }, (_, i) => [i + 1, Math.round(clanBossHealth(i + 1) / 1000)]), { sort: false })}}

With everyone using all {{CLAN_ATTACKS_PER_DAY}} attacks a day and striking in the openings, a player alone fells about one level a week, a clan of 2 two, 5 four, and 10 or more all seven. Good potions take smaller clans further: with Combat Potion IV, 2 members fell about five and 3 or more all seven.

## The clan banner

The clan's reward for its boss is its banner. Each level the clan fells raises it, and it multiplies the attack, defence and health of **every member, whether they fought or not**, until the week ends (Monday 00:00 UTC). A new week starts it again from nothing.

{{table(['Levels felled this week #', 'Clan banner'], CLAN_BANNER.slice(1).map((m, i) => [i + 1, `×${m}`]), { sort: false })}}

- The first kill is the big step, so every clan wants at least one a week.
- It counts everywhere you fight (the stages, dungeons, the Titan), and while you are away, but not in the clan boss's own fight, and the leaderboards leave it out.
- It shows beside your food and potion under your hero, and on the boss's panel on the Clan tab, with what the next level would bring. A card says when it rises.
- There are no other clan rewards: no essence or diamonds (rewards from before, still waiting, can be claimed on the Clan tab).

## The week's ranking

Every week the clans are ranked, and the top three of each division wear a crown through the next week, on the clan list and beside the clan's name.

- **Divisions.** The levels of the week's boss a clan fells put it in its division: {{CLAN_DIVISIONS.map(d => `${d.name} ${d.min ? `from ${d.min}` : 'below that'}`).join(', ')}}. So clans of a like size and activity meet.
- **The Endless Hydra** decides inside each division. It wakes for every clan on Saturday at 00:00 UTC and stays until the Monday reset. Its heads grow back, so it never falls.
- **{{ENDLESS.attacks}} fights each, the deepest counts.** Every member who was in the clan when the week began gets {{ENDLESS.attacks}} fights at it, besides the {{CLAN_ATTACKS_PER_DAY}} a day at the week's boss. A fight is the same {{CLAN_ATTACK_SECONDS}}-second fight as any clan attack, strikes and potion included.
- **Depth.** A fight counts by how many of the Hydra's levels it breaks through. Each level is a fifth tougher than the last, and the first is about a new hero's whole fight, so a hero a thousand times stronger goes about 38 levels deeper, not a thousand times as far.
- **The clan's depth** is its best {{ENDLESS.counted}} members' together. Accounts whose saves showed impossible numbers are left out.
- The Clan tab shows the Hydra under the week's boss, your division, place and depth, the week's table by division, last week's crowns and your clan's best week.

## The clan hall

Members build their clan a hall from what they make. The Clan tab shows it under the week's boss: its painting, which grows with it, the clan's banner, and six rooms.

- **Six rooms**, each taking one kind of goods from your bank: {{HALL_ROOMS.map(r => `the ${r.name} ${r.takesText}`).join('; ')}}. Tap a room's Give, then pick what to give and how much; Give glows when your bank has something for it.
- **Gifts count in work:** the time the thing takes to make, with what went into it: a copper bar {{giftWorth('copper_bar')}} seconds (its ore mined, then smelted), a runite bar {{Math.round(giftWorth('runite_bar'))}}, a crop its plot's growing time over its harvest, a gem {{giftWorth('amethyst')}} seconds a tier, essence a second each. So an hour of a new member's work counts as much as an hour of a veteran's.
- **{{HALL.weeklyHours}} hours of work a week each**, whatever your clan, from Monday 00:00 UTC. A gift is cut to what's left of your week (your last gift may run a little over), to what your saved bank holds and to what the room still takes. The game saves your hero to the cloud first: gifts come out of the bank of your saved game.
- **Levels:** each room has {{HALL_LEVELS}} levels, taking {{HALL.levelHours.slice(0, -1).join(', ')}} and {{HALL.levelHours.at(-1)}} hours of work in turn ({{LEVEL_AT.at(-1) / 3600}} hours a room). Every level gives **every member** a bonus while they stay in the clan, whoever gave the work (the table below).
- None of it adds attack, defence or health: the boss, the ranking and the leaderboards stay as they were. Nothing decays, and a member who leaves leaves their gifts behind.
- The members table shows the work each member has given the hall (this week's on hover), and each room who built it most. The latest gifts are listed under the rooms.

{{table(['Room', 'Takes', 'A level gives', 'At level 5'], HALL_ROOMS.map(r => [r.name, r.takesText, r.text(1), r.text(5)]), { sort: false })}}

As its rooms are built, the hall grows, and its painting with it: {{HALL_STAGES.map(st => `the ${st.name}${st.levels ? ` at ${st.levels} room levels` : ''}`).join(', ')}}. Each stage brings more colours and emblems for the clan's **banner**, which the clan's owner picks by tapping it; the clan list shows every clan's stage.

**The clan's cloak:** from the {{HALL_STAGES[CLOAK_STAGE].name}}, a member who has given {{HALL.cloakHours}} hours of work to the clan's hall wears its cloak, in the banner's colour, and can change it in Settings like a [[/capes|cape]]. It is a look only, and it goes if you leave the clan.

## Leaderboards

The leaderboards are opt-in: you are only listed if you join them (on the Clan tab), and you can leave at any time. They show your username beside numbers the server works out from your cloud save:
- your best stage, total level, [[The Titan|Titans]] defeated and [[Dungeons|dungeon]] clears, all time or just this week (counted from where you stood when the week began);
- the week's [[Trials|Trial]]: the best stage reached in it this week, ranked as a share of each player's own best stage.

Each board shows the top fifty, and your own place if you are further down. Saves whose numbers no honest play could reach are left off the boards, and out of their clan's measure for the clan boss.

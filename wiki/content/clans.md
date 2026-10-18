---
path: /clans
keywords: clans, clan, clan boss, weekly boss, clan banner, banner, leaderboards, leaderboard, account, cloud save, sign in, log in, register, attack, rewards, opt in, ranking
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

Each week, from Monday 00:00 UTC to the next Monday, the clan has one boss to bring down together: the ten lands' rulers take turns, one a week ({{clanBossFor('2026-W41').name}}, then {{clanBossFor('2026-W42').name}}, and so on), each fought on its own land's painting. The Clan tab shows its health and level, the week's damage member by member, and each member's best stage, total level and damage per attack.

- **Its health is the clan's, counted in its attacks.** Its first level takes about {{CLAN_BOSS.first}} attacks at your members' average strength: each member's plain attack (what their hero deals by himself in the fight, without strikes or a potion), at its best of the past week, for the members who played that week. A stronger member's attack counts for more and a weaker one's for less. Members joining or leaving change the average, not how many attacks it takes. So the more members fight, the sooner it falls, and a player alone gets little further than the first level.
- **An attack is a fight.** "Fight the boss" saves your hero to the cloud and takes you into a {{CLAN_ATTACK_SECONDS}}-second fight against it, on the whole screen like the [[The Titan|Titan's]]. Your hero attacks by himself, and the boss never hits back. Give up ends it early, with what you did so far. When it is over, the Clan tab shows the clan again, ready for your next attack, and your hero goes back to what he was doing: his work, his rest, or his fight at the stages (under Combat).
- **Its guard:** the boss drops its guard for {{CLAN_GUARD.open / 1000}} seconds every {{CLAN_GUARD.every / 1000}} seconds, from the {{CLAN_GUARD.first / 1000}}th second on. It glows and the game says "Strike now!". Only then do your [[Combat|strikes]] land, each {{CLAN_GUARD.mult}} times as hard as a strike in a fight, and build your combo; at other times they glance off. Clicking fast in the openings is the most anyone can do, an auto-clicker too: about 1.3 to 1.6 times what your hero deals by himself, more for a slow-hitting hero.
- **The damage is the server's:** the game sends only when you struck, and the server works the damage out from your saved hero and those moments: your attack, crits and attack speed, with no dice rolled. A card then shows what you dealt and where it puts you in the clan this week.
- **Levels:** when the boss falls, it is down until midnight UTC, then comes back as the next level with a fifth more health (×{{CLAN_BOSS.growth}}), up to {{CLAN_BOSS.levels}} levels a week if it falls every day (the table below). A boss that isn't brought down stays as it is, with the damage dealt, and Monday brings a new boss at level 1. The Clan tab shows the level, and after a kill which level comes back and when.
- **Saves with impossible numbers:** an account whose save showed numbers no play could reach deals at most 1% of the boss's health an attack, and its card says "Capped".
- **Your attacks:** {{CLAN_ATTACKS_PER_DAY}} a day, at midnight UTC, and those you don't use wait for you, up to {{CLAN_ATTACK_BANK}}.
- **Your combat potion counts:** the one you have picked is drunk as the fight starts, so a good potion makes every attack worth several plain ones (with strikes, Combat Potion I about 2.4 and IV about 4.8).
- **What doesn't count:** [[Mini-games and Focus|Focus]], the [[/skills/firemaking|bonfire]], mini-game boosts and the clan banner itself are left out, and a [[Trials|Trial's]] rule doesn't hold your attacks back either.

{{table(['Level #', 'Plain attacks of the clan to fell it #'], Array.from({ length: CLAN_BOSS.levels }, (_, i) => [i + 1, Math.round(clanBossHealth(i + 1) / 1000)]), { sort: false })}}

With everyone using all {{CLAN_ATTACKS_PER_DAY}} attacks a day and striking in the openings, a clan of 2 fells about one level a week, 5 about three, 10 about five, and 15 or 20 all seven; good potions take smaller clans further.

## The clan banner

The clan's reward for its boss is its banner. Each level the clan fells raises it, and it multiplies the attack, defence and health of **every member, whether they fought or not**, until the week ends (Monday 00:00 UTC). A new week starts it again from nothing.

{{table(['Levels felled this week #', 'Clan banner'], CLAN_BANNER.slice(1).map((m, i) => [i + 1, `×${m}`]), { sort: false })}}

- The first kill is the big step, so every clan wants at least one a week.
- It counts everywhere you fight (the stages, dungeons, the Titan), and while you are away, but not in the clan boss's own fight, and the leaderboards leave it out.
- It shows beside your food and potion under your hero, and on the boss's panel on the Clan tab, with what the next level would bring. A card says when it rises.
- There are no other clan rewards: no essence or diamonds (rewards from before, still waiting, can be claimed on the Clan tab).

## Leaderboards

The leaderboards are opt-in: you are only listed if you join them (on the Clan tab), and you can leave at any time. They show your username beside numbers the server works out from your cloud save:
- your best stage, total level, [[The Titan|Titans]] defeated and [[Dungeons|dungeon]] clears, all time or just this week (counted from where you stood when the week began);
- the week's [[Trials|Trial]]: the best stage reached in it this week.

Each board shows the top fifty, and your own place if you are further down. Saves whose numbers no honest play could reach are left off the boards, and they don't count when a clan boss's health is set.

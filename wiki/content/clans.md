---
path: /clans
keywords: clans, clan, clan boss, weekly boss, leaderboards, leaderboard, account, cloud save, sign in, log in, register, attack, rewards, opt in, ranking
---
Clans are the game's online side. Join one, and every week the whole clan fights one shared boss together, for [[Monster Essence|essence]] and [[Diamond|diamonds]]. Beside the clans are the leaderboards, where you can see how far other heroes have come.

## What you need

Clans and leaderboards work through an account and the cloud:
- **An account.** Sign in, or register a new one, from the Clan tab or from "Log in / register" in Settings. You can play without one; your save on this device is kept either way.
- **A [[Offline progress and saves|cloud save]].** Once you are signed in, your save goes up to the cloud every ten minutes while you play and when you leave the page, and another device loads whichever save has more play time, asking you first when the two don't agree. Everything other players see of you, your clan attacks and your place on a board, is worked out on the server from that saved hero, never from numbers your game sends.

The Clan tab itself opens once you have [[Prestige|prestiged]] and reached stage {{[...Array(1000).keys()].find(s => UNLOCKS.find(u => u.id === 'clan').requires({ prestige: { count: 1 }, combat: { bestStage: s } }))}} (see [[Places and unlocks]]). Until you sign in, it only shows what a clan is.

## Joining or starting a clan

Without a clan, the Clan tab lets you search the clans by name or tag and join one that has room, or start your own: a name, a short tag, a description and a "looking for" line that says who you would like to join. A clan holds up to 20 members, and you can be in one clan at a time.
- You can leave whenever you like. If the clan's owner leaves, the member who has been in it longest takes over; when the last member leaves, the clan closes.
- The owner can remove a member. That member's damage stays on the week's board.
- The tab refreshes itself while it is open, and has a Refresh button.

## The weekly clan boss

Each week, from Monday 00:00 UTC to the next Monday, the clan has one boss to bring down together: the ten lands' rulers take turns, one a week ({{clanBossFor('2026-W41').name}}, then {{clanBossFor('2026-W42').name}}, and so on), each fought on its own land's painting. The Clan tab shows its health, the week's damage member by member, and each member's best stage, total level and damage per attack.

- **Its health** is set when the week's boss first appears, from each member's best attack of the past week: about twelve attacks from each of them, so it holds out for about four days of everyone attacking. A member who leaves (or is removed) takes their share of its health away, all but the damage they dealt, and brings it back if they rejoin that week; someone who joins after it appeared adds nothing to it.
- **An attack is a fight.** "Fight the boss" saves your hero to the cloud and takes you into a {{CLAN_ATTACK_SECONDS}}-second fight against it, on the whole screen like the [[The Titan|Titan's]]. Your hero attacks by himself, and the boss never hits back. Give up ends it early, with what you did so far; when it is over your hero goes back to what he was doing, and the screen to the Clan tab.
- **Its guard:** the boss drops its guard for {{CLAN_GUARD.open / 1000}} seconds every {{CLAN_GUARD.every / 1000}} seconds, from the {{CLAN_GUARD.first / 1000}}th second on. It glows and the game says "Strike now!". Only then do your [[Combat|strikes]] land, each {{CLAN_GUARD.mult}} times as hard as a strike in a fight, and build your combo; at other times they glance off. Clicking fast in the openings is the most anyone can do, an auto-clicker too: about 1.3 to 1.6 times what your hero deals by himself, more for a slow-hitting hero.
- **The damage is the server's:** the game sends only when you struck, and the server works the damage out from your saved hero and those moments: your attack, crits and attack speed, with no dice rolled. A card then shows what you dealt and where it puts you in the clan this week.
- **Your attacks:** {{CLAN_ATTACKS_PER_DAY}} a day, at midnight UTC, and those you don't use wait for you, up to {{CLAN_ATTACK_BANK}}.
- **What doesn't count:** anything timed or temporary. [[Mini-games and Focus|Focus]], [[Potions|potions]], the [[/skills/firemaking|bonfire]] and mini-game boosts are left out, and a [[Trials|Trial's]] rule doesn't hold your attacks back either.

## Rewards

Rewards wait on the Clan tab until you claim them:
- **When the boss falls:** 100 essence and 2 diamonds for everyone who fought it that week, and 50 essence and a diamond more for the member who landed the last hit.
- **When the week ends:** 50 essence for everyone who fought, and 100, 60 and 30 essence, each with a diamond, for the top three by damage.

Each kind of reward is paid once per player per week, even to someone who fought for more than one clan that week.

## Leaderboards

The leaderboards are opt-in: you are only listed if you join them (on the Clan tab), and you can leave at any time. They show your username beside numbers the server works out from your cloud save:
- your best stage, total level, [[The Titan|Titans]] defeated and [[Dungeons|dungeon]] clears, all time or just this week (counted from where you stood when the week began);
- the week's [[Trials|Trial]]: the best stage reached in it this week.

Each board shows the top fifty, and your own place if you are further down. Saves whose numbers no honest play could reach are left off the boards, and they don't count when a clan boss's health is set.

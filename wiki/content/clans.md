---
path: /clans
keywords: clans, clan, clan boss, weekly boss, leaderboards, leaderboard, account, cloud save, sign in, log in, register, attack, rewards, opt in, ranking
---
Clans are the game's online side. Join one, and every week the whole clan fights one shared boss together, for [[Monster Essence|essence]] and [[Diamond|diamonds]]. Beside the clans are the leaderboards, where you can see how far other heroes have come.

## What you need

Clans and leaderboards work through an account and the cloud:
- **An account.** Sign in, or register a new one, from the Clan tab or from "Log in / register" in Settings. You can play without one; your save on this device is kept either way.
- **A cloud save.** Once you are signed in, your save goes up to the cloud every minute and at important moments, and another device loads whichever save has more play time. Everything other players see of you, your clan attacks and your place on a board, is worked out on the server from that saved hero, never from numbers your game sends.

The Clan tab itself opens once you have [[Prestige|prestiged]] and reached stage {{[...Array(1000).keys()].find(s => UNLOCKS.find(u => u.id === 'clan').requires({ prestige: { count: 1 }, combat: { bestStage: s } }))}} (see [[Places and unlocks]]). Until you sign in, it only shows what a clan is.

## Joining or starting a clan

Without a clan, the Clan tab lets you search the clans by name or tag and join one that has room, or start your own: a name, a short tag, a description and a "looking for" line that says who you would like to join. A clan holds up to 20 members, and you can be in one clan at a time.
- You can leave whenever you like. If the clan's owner leaves, the member who has been in it longest takes over; when the last member leaves, the clan closes.
- The owner can remove a member. That member's damage stays on the week's board.
- The tab refreshes itself while it is open, and has a Refresh button.

## The weekly clan boss

Each week, from Monday 00:00 UTC to the next Monday, the clan has one boss to bring down together. The Clan tab shows its health, the week's damage member by member, and each member's best stage, total level and damage per attack.

- **Its health** is set when the week's boss first appears, from the strength of the members: about twelve attacks from each of them, so it holds out for about four days of everyone attacking. A member who leaves (or is removed) before fighting it takes their share of its health away again.
- **Your attacks:** three a day, back at midnight UTC. Each attack deals what your saved hero would deal in 60 seconds of fighting: your attack, crits and attack speed, with no dice rolled. The game saves your hero to the cloud just before each attack, so the attack uses your hero as it stands now.
- **What doesn't count:** anything timed or temporary. Focus, potions, the bonfire and mini-game boosts are left out, and a [[Trials|Trial's]] rule doesn't hold your attacks back either.

## Rewards

Rewards wait on the Clan tab until you claim them:
- **When the boss falls:** 100 essence and 2 diamonds for everyone who fought it that week, and 50 essence and a diamond more for the member who landed the last hit.
- **When the week ends:** 50 essence for everyone who fought, and 100, 60 and 30 essence, each with a diamond, for the top three by damage.

Each kind of reward is paid once per player per week, even to someone who fought for more than one clan that week.

## Leaderboards

The leaderboards are opt-in: you are only listed if you join them (on the Clan tab), and you can leave at any time. They show your username beside numbers the server works out from your cloud save:
- your best stage, total level, [[The Titan|Titans]] defeated and [[Dungeons|dungeon]] clears, all time or just this week (counted from your first save of the week);
- the week's [[Trials|Trial]]: the best stage reached in it this week.

Each board shows the top fifty, and your own place if you are further down. Saves whose numbers no honest play could reach are left off the boards, and they don't count when a clan boss's health is set.

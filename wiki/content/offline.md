---
path: /offline
keywords: offline, offline progress, away, idle, afk, welcome back, cap, endurance, zipline, background, background tab, phone, save, saving, autosave, backup, backups, restore, export, import, save string, cloud, cloud save, account, sign in, log in, register, local storage, hard reset, wipe, saves
aliases: Offline progress, Saves, Cloud save, Backups, Export, Import, Welcome back
---
Fantasy Idle keeps playing while you are away. When you come back, the game works through the time you were gone with the same rules as play, and a welcome-back report tells you what happened. This page also explains how your game is saved, and how to keep it safe.

## What runs while you are away

Your hero goes on with whatever he was doing when you left:

- **Work in a skill:** he keeps at it, one action after another, until the time runs out or the materials do (a tool stops once it is made). The action he was halfway through is finished first.
- **The fight:** he goes on climbing with food, potions, the boss timer, falls and rests just as in play, so a fall early on costs a rest, not your whole absence. A [[Dungeons|dungeon]] keeps going clear after clear, and a lost run sends him back to the stage ladder. A fight with [[The Titan]] does not survive closing the game: your hero goes back to what he was doing before it.
- **Nothing:** if he was idle, he rests at camp the whole time.

He only ever does one of these: a fight and a skill never run together.

The world keeps its own clock all the while. [[Farming|Farm]] plots grow, [[Daily crate|daily crates]] ripen, Titan attempts bank up, the bonfire burns down, mini-game boosts run out, and [[Weekend events|weekend events]] begin and end when they really did. Levels, medals, pets and capes earned on the way count from the moment they came. [[/mini-games|Focus]] works while you are away, since nobody is clicking, and so does the Auto prestige if you have earned it and switched it on ([[Prestige]]). Mini-game chances only come while you are there.

## The cap

Time away counts up to a cap of {{BASE.baseOfflineHours}} hours to begin with; any time past it is lost.

- The Endurance [[Perks|perk]] adds {{perkById('endurance').mods.offlineHours}} hours a level, up to {{perkById('endurance').max}} levels.
- The Zipline obstacle of [[/skills/agility|Agility]] adds {{obstacleById('zipline').mods.offlineHours}} h for each of its levels, up to {{MAX_OBSTACLE_LEVEL}}.

That makes {{BASE.baseOfflineHours + perkById('endurance').max * perkById('endurance').mods.offlineHours + MAX_OBSTACLE_LEVEL * obstacleById('zipline').mods.offlineHours}} hours at most. The Inventory shows your cap with your hero's numbers.

## Welcome back

Back after a while, a report greets you. It says how long you were away (and whether the cap cut it short), what your hero did and where his run stands (the stage it climbed to, and how long it then held there), with what came of it: monsters defeated and stages gained, falls, dungeon clears and fragments, gilded monsters and bestiary stars, materials gained and used, gold, gear found or made, XP and levels, mastery, pets, uniques and plots ready to harvest.

Below it is a row of what is ready, each a tap away: a prestige and what it pays, crates to open, the Titan awake, skill points to spend and better gear to wear. A place that was waiting for its turn opens as you come back, and the report names it (see [[Places and unlocks]]).

## Background tabs and phones

A tab left in the background keeps playing. Browsers slow such a tab down, and the game makes up the time it missed as ordinary play. After a gap of more than a few minutes (a laptop asleep, a phone that set the page aside) the game replays the time as offline progress, with its report.

Time with the page out of sight does not count toward the breaks between new places ([[Places and unlocks]]). On a phone you can add the game to your home screen to play it like an app.

## Saving

The game saves by itself, on this device, several times a minute, whenever the page is hidden or closed, and at once after a prestige. There is nothing to press.

**Backups.** Settings keeps backups you can restore at any time: three automatic ones, taken in turn as you play, one taken as the game loads (before the time away is added), one before each prestige, and one before a hard reset, an import or a restore.

**Export and import.** In Settings, **Copy export string** puts your whole game into a line of text, copied for you and shown in the box. To load one, paste it into the box and press **Import string**; your current game is backed up first. A string from a newer version of the game cannot be loaded.

**Hard reset** wipes your save and starts the game over. One backup is kept in Settings in case you change your mind.

## Cloud saves

Sign in with a username and a password (**Log in / register** in Settings) to keep your save on the game's server as well. While you are signed in it is uploaded regularly as you play (Settings shows when it last was), and **Save to cloud now** does it at once. On another device, the save with more play time is the one loaded; if the two saves disagree in a way that could lose progress, the game asks which to keep. Time away from a cloud save is measured by the server's clock. Your save on the device is kept either way, and playing without an account is fine.

[[Clans and leaderboards]] need an account.

## Keep your save safe

Without an account your save lives only in this browser's storage on this device, and its backups with it. Clearing the browser's site data (cookies and site data, or history with them), a private window, or a browser that clears storage by itself will delete them all. On some phones a game added to the home screen keeps a save of its own, apart from the browser's.

> Warning: if you play without an account, copy an export string now and then and keep it somewhere safe, or sign in for cloud saves.

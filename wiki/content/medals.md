---
path: /medals
keywords: medals, medal, achievements, hall, hall of trophies, secret medals, medal bonus, trophies, rewards
---
Medals are the game's achievements: one for each deed, from your first {{ACHIEVEMENTS.find(a => a.id === 'first_blood').req.value}} kills to a skill at level {{MAX_LEVEL}}. There are {{ACHIEVEMENTS.length}} of them, and every one brings a reward that lasts forever. They live in the Hall (the Achievements tab), which opens once you {{UNLOCKS.find(u => u.id === 'achievements').task.toLowerCase()}}.

## What a medal gives

Each medal gives you two things, for good:
- **its own reward**, in the table below: more attack or health, faster skilling, more gold or drops, potions that last longer and so on;
- **a small bonus that every medal adds**: +{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} attack, +{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} defence and +{{pct(ACHIEVEMENT_GLOBAL_BONUS, 0)}} speed in every skill you train.

The small bonuses add up: all {{ACHIEVEMENTS.length}} medals together give +{{pct(ACHIEVEMENT_GLOBAL_BONUS * ACHIEVEMENTS.length, 0)}} attack, defence and skill speed on top of their own rewards. Medals are never lost: every [[Prestige|prestige]] and [[Ascension]] keeps them. A medal earned while you are away counts from the moment you earned it, and its card shows when you come back.

## Kinds of medals

The Hall shows each medal with a bar of your progress toward it. Roughly, they are for:
- **Fighting:** monsters defeated, bosses and stages reached, [[Monsters|gilded monsters]], [[Dungeons|dungeon]] clears and [[The Titan|Titans]].
- **The bestiary:** stars for defeating each kind of monster many times (see [[Monsters]]).
- **Skills:** level {{[...new Set(ACHIEVEMENTS.filter(a => a.req.type === 'skillLevel').map(a => a.req.level))].sort((x, y) => x - y).join(', ').replace(/, (?=[^,]*$)/, ' or ')}} in a [[Skills|skill]], a first level {{MAX_LEVEL}}, and [[Mastery|mastery]] levels.
- **Collecting:** a [[Pets|pet]], a [[Unique items|unique item]], a legendary piece worn, and pages of the gear codex.
- **The long game:** deep stages, prestiges, an Ascension and [[Trials|Trial]] tiers.

Medals for parts of the game you meet late, such as {{ACHIEVEMENTS.find(a => a.id === 'ascendant').name}} and {{ACHIEVEMENTS.find(a => a.id === 'trial_master').name}}, only appear in the Hall once you have met that part.

## Secret medals

{{ACHIEVEMENTS.filter(a => a.secret).length}} medals are secret: the Hall neither shows nor counts them until you earn one. They are for little things you find by playing, and earning one brings a card that says "A secret medal". The table below lists them anyway, marked as secret, so skip those rows if you would rather find them yourself.

## Looks earned with medals

{{LOOKS.filter(l => l.medal).length}} medals also earn your hero a new look, named in the table. The medal's card shows your hero in it, and you can wear it from Settings at any time. Settings shows the next look you could earn as a silhouette, with its medal named (never a secret one's). See [[Hero looks]].

---
path: /capes
keywords: capes, skill capes, skillcape, skill cape, cape, level 99, 99, cloak, festival cloaks, wear
---
Reaching level {{MAX_LEVEL}} in a skill earns its **cape**, for good. There are {{CAPES.length}}, one for each skill and one for [[Combat]]. Each brings a small bonus, most of them to their own skill, and your hero puts the new cape on the moment it is earned: a cloak in the skill's own colours, with a gold hem.

## What a cape gives

A cape's bonus counts whether you wear it or not: every cape you have earned gives its bonus all the time. Most of them give their skill +{{pct(CAPES.find(c => c.skill === 'mining').mods.doubleChance.mining, 0)}} chance of a double: a second ore, log, fish, catch, dish, bar, herb or potion, or a log that burns twice. The Farming cape adds crops to every harvest, the Crafting cape raises the quality of everything you make, the Agility cape speeds up every skill, and the Combat cape adds attack and defence. The table below has each one.

A cape comes from your level, and levels are never lost, so no [[Prestige|prestige]] or [[Ascension]] can take one away. Your first level {{MAX_LEVEL}} also earns the medal {{ACHIEVEMENTS.find(a => a.id === 'completionist').name}} ({{ACHIEVEMENTS.find(a => a.id === 'completionist').reward.replace(/^./, c => c.toLowerCase())}}).

## Choosing what to wear

Once you have a cape, Settings shows your choices: the cloak of your [[Ranks|rank]] and every cape you have earned, with the one you wear lit. Tap one to wear it. The cape you are closest to, in the skill nearest level {{MAX_LEVEL}}, shows as a silhouette with its bonus named. What you wear is only a look: it changes nothing else.

## Cloaks from the festivals

Each [[Weekend events|weekend event]] has a cloak of its own, sold in the event's shop for {{FESTIVAL_CLOAK_COST}} Festival Tokens while the event runs. It is dyed in the event's colour, with a silver hem where a skill cape's is gold. A festival cloak gives no bonus, but it is yours for good: wear it from Settings like a cape. If you miss one, it comes back with its event.

---
path: /pets
keywords: pets, pet, companion, pet chance, Lucky Paws, pat, collection, Pebble, Twig, Scout, Crumb, Bubbles, Ember, Glimmer, Fang, Finn, Cinder, Sprout, Hopper
---
Pets are rare finds while you train: one for each skill, combat included, {{PETS.length}} in all. A pet finds you at random as you work, brings a small bonus to its skill, and stays with you forever: no [[Prestige|prestige]] or [[Ascension]] takes it away.

## The chance

Every action you complete is a chance to find that skill's pet, until you have it:

chance = action seconds × skill level ÷ {{fmt(PET_BASE)}}

The seconds are the action's base time, before any speed bonus, so a slow action is a better chance than a quick one, and over an hour of training at base speed it comes out the same whatever you do. On average a pet takes about {{fmt(PET_BASE)}} ÷ your level seconds of training: about {{Math.round(PET_BASE / 50 / 3600)}} hours at level 50, or {{Math.round(PET_BASE / MAX_LEVEL / 3600)}} at level {{MAX_LEVEL}}. Two things bring it sooner: a higher level, and anything that makes you faster, since more actions in an hour are more chances.

- **Combat:** each kill is one chance, as if it were a {{COMBAT_PET_SECONDS}}-second action at your Combat level: about {{fmt(Math.round(PET_BASE / (COMBAT_PET_SECONDS * MAX_LEVEL)))}} kills on average at level {{MAX_LEVEL}}.
- **Farming:** each harvest is one chance, as if the action had taken the crop's whole growing time. A {{CROPS.at(-1).name.toLowerCase()}} harvest at level {{MAX_LEVEL}}, for example, has a {{pct(CROPS.at(-1).growMs / 1000 * MAX_LEVEL / PET_BASE, 1)}} chance.

During the {{EVENTS.find(e => e.id === 'lucky_paws').name}} [[Weekend events|weekend event]], pets are {{1 + EVENTS.find(e => e.id === 'lucky_paws').mods.petChance}} times as likely to find you.

## What a pet gives

A pet's bonus counts for good from the moment it finds you (the table below has each one). Most add +{{pct(PETS.find(p => p.skill === 'mining').mods.skillSpeed.mining, 0)}} speed to their own skill; {{PETS.find(p => p.skill === 'combat').name}}, the combat pet, adds attack and defence, and {{PETS.find(p => p.skill === 'farming').name}}, the farming pet, makes crops grow faster. Your first pet also earns the medal {{ACHIEVEMENTS.find(a => a.id === 'pet_friend').name}} ({{ACHIEVEMENTS.find(a => a.id === 'pet_friend').reward.replace(/^./, c => c.toLowerCase())}}).

## Your companion

A pet keeps your hero company too. In the fight, one pet stands at your hero's feet: the one you pick in the Hall's Collection (tap a found pet there to take it along), or else {{PETS.find(p => p.skill === 'combat').name}}, or else the first pet you found. On a skill's tab, that skill's own pet stands beside your hero while you work, once you have found it (until then, your companion does). You can pat your pet by tapping it.

The Collection shows every pet: the ones you have found by name, and the rest as silhouettes, with how long one might take at your level.

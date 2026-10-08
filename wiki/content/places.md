---
path: /places
keywords: places, unlocks, unlock, new place, new tab, tabs, sidebar, breather, attended time, next card, on its way, return, new places
aliases: Unlocks, Places, New places
---
Fantasy Idle opens a little at a time. You start with the fight, [[Mining]] and the Inventory, and every other place (each skill, the Shop, Prestige, the Dungeons and the rest) opens once you have met what it needs. Nothing is shown before then, not even as a locked tab. The table below lists every place and what opens it.

## One place at a time

Most places are reached by playing on: a stage, a boss, a prestige, a few medals. When such a goal is met the place does not open at once. It waits its turn, a breather of play after the last place to open, and the breather grows as the game opens up, from {{time(PLACE_GAPS_MS[0])}} for the first to {{time(PLACE_GAPS_MS.at(-1))}} (the Breathers table below).

When several are waiting they come in this order: {{(() => { const page = { prestige: ['/prestige', 'Prestige'], dungeons: ['/dungeons', 'the Dungeons'], shop: ['/shop', 'the Shop'], achievements: ['/medals', 'the Hall of medals'], clan: ['/clans', 'the Clan'], events: ['/events', 'the weekend Events'] }; return UNLOCKS.filter(u => u.pace).map(u => (SKILLS[u.id] ? link(path.skill(u.id), SKILLS[u.id].name) : page[u.id] ? link(page[u.id][0], page[u.id][1]) : u.id)).join(', '); })()}}.

## Places earned by work

Other places answer work in a skill: [[Smithing]] once you have mined some ore, [[Woodcutting]] after your first bar, [[Crafting]] once you hold a silver or gold bar and have found a gem, and so on. They don't wait for a breather: one opens as soon as its goal is met, as long as {{time(WORK_GAP_MS)}} of play have passed since the last place opened, and it starts a new breather of its own.

## Only while you are there

The breathers count only the time you are there: the page in view, or a click or key press in the last few minutes. Time away and a tab left in the background do not count.

Nothing opens while your hero is fighting a boss, either: the boss is the moment, and a place that is due waits until the fight with it is over.

## Coming back

Back after a while away, the first place that was waiting opens at once, and the welcome-back report names it ([[/offline|offline progress]]). One opens for each return; the rest keep their turn.

## The Next card

The sidebar's Next card shows the next goal and how far along it is. A place whose goal is met but which is waiting its turn shows as **On its way**, its bar filling with the breather.

## Inside a place

The pieces inside a place open the same way, the first time they mean something to you, and then stay: the [[Camp]] once you have gold for a first level, the world map once you have reached a second land, the anvil at Smithing {{ANVIL_LEVEL_PER_UPGRADE}}, the Food and Potion rows with Cooking and Alchemy.

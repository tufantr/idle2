---
path: /food
keywords: food, eat, eating, auto-eat, auto eat, healing, heal, cooking, fish, meat, dishes, gourmet, chef, fasting
aliases: Auto-eat, Healing, Eating
---
Food keeps your hero alive in a long fight. It is cooked in [[Cooking]], every dish burning a log (the better the dish, the better the log), from raw meat and fish ([[Hunting]]) and crops ([[Farming]]), and raw meat and some fish also drop in the fight ([[Zones]]). Food is kept when you prestige. Every food heals a share of your hero's max health, so a dish stays as good however strong he grows; each dish's card in Cooking shows its share and what it heals him now. The table below lists every food, what it heals and what it is cooked from.

Lifesteal heals at most {{pct(BASE.lifestealPerSecond, 0)}} of his health a second (see [[Combat]]), so where monsters hit hard, food is what keeps him standing.

## Auto-eat

Your hero eats by himself when his health falls below the auto-eat line, {{pct(BASE.baseAutoEatThreshold, 0)}} of his health to begin with, and eats until he is above the line again. A monster hits as hard every time, so he also eats just before a blow that would fell him, however far above the line he stands. That is what carries him past monsters that hit too hard to stand: about a land further than he gets without food.

He keeps his food where it would be wasted:
- **No dish can stop a blow bigger than his whole health,** so he eats nothing for one.
- **A boss that can't fall in time:** against a boss he can't bring down before its time runs out, he eats only below the line.
- **Held at a wall:** on the stage ladder he eats for a coming blow only while the run climbs, within {{time(BALANCE.combat.foodPushMs)}} of its last new best stage. Once held at a wall, he keeps the food for the next push (below the line he still eats). In [[Dungeons|dungeon runs]] and against [[The Titan]] he always does.

A green number over your hero shows each time he eats.

What he eats is set by the Food row on the Combat tab and in the fight's dock:

- **Auto**, the setting you start with: the smallest food that fills the missing health, or the biggest one he has when none does. Small foods go on small wounds and the big ones wait for big ones.
- **One food:** pick a food to eat only that one.
- **None:** he never eats.

Each food you carry shows in the row with the share it heals, your bonuses counted; hover over it to see how much health that is now. Food works the same in [[Dungeons|dungeon runs]], against [[The Titan]] and while you are away.

## Healing and regeneration

A food heals its share of your hero's max health, as in the table below, raised by your food bonuses, and never past full health: a {{res('cooked_shark')}} that heals {{pct(RESOURCES.cooked_shark.heal, 0)}} gives a hero of 10,000 health {{fmt(Math.round(10000 * RESOURCES.cooked_shark.heal))}}. The bonuses add up: the Gourmet perk and the Chef medal. At the wall a push eats hundreds of dishes, so keep a good stock cooked.

Food is for the fight itself. While fighting your hero regains only {{pct(BALANCE.combat.regenInCombat)}} of his health a second; out of the fight he regains {{pct(BALANCE.combat.regenResting, 0)}} a second, so resting refills him in under a minute. Lifesteal and a combat level-up heal him too (see [[Combat]]).

## The Gourmet perk

Each level of the Gourmet [[Perks|perk]] raises the auto-eat line by {{pct(perkById('gourmet').mods.autoEatThreshold, 0)}} and food healing by {{pct(perkById('gourmet').mods.foodMult, 0)}}. At its {{perkById('gourmet').max}} levels your hero eats below {{pct(BASE.baseAutoEatThreshold + perkById('gourmet').max * perkById('gourmet').mods.autoEatThreshold, 0)}} health and every food heals {{pct(perkById('gourmet').max * perkById('gourmet').mods.foodMult, 0)}} more. A higher line keeps him further from danger against monsters that hit hard.

## The Chef medal

Reaching Cooking {{achievementById('chef').req.level}} earns the {{achievementById('chef').name}} medal: +{{pct(achievementById('chef').mods.foodMult, 0)}} food healing, for good (see [[Medals]]).

## The Fasting Trial

In the {{trialById('fasting').name}} [[Trials|Trial]] your hero eats nothing, and no health comes back while he fights: no regeneration, no lifesteal and no level-up's refill. He still heals while he rests out of the fight.

## The best food for your level

Fish heal a little more than the meat of the same level: {{res('cooked_shrimp')}} heals {{pct(RESOURCES.cooked_shrimp.heal, 0)}} where {{res('cooked_rabbit')}} heals {{pct(RESOURCES.cooked_rabbit.heal, 0)}}, and {{res('cooked_leviathan')}} {{pct(RESOURCES.cooked_leviathan.heal, 0)}} where {{res('cooked_dragon')}} heals {{pct(RESOURCES.cooked_dragon.heal, 0)}}. The farm's dishes, most of them from two crops, heal well for their level too. The best food each new Cooking level brings:

{{(() => {
    const heals = n => RESOURCES[n.produces].heal;
    const best = SKILLS.cooking.nodes.filter(n => heals(n)).sort((a, b) => a.levelReq - b.levelReq || heals(b) - heals(a)).reduce((list, n) => (list.length && heals(n) <= heals(list.at(-1)) ? list : [...list, n]), []);
    const source = id => {
        for (const s of ['hunting']) {
            const node = SKILLS[s].nodes.find(x => x.produces === id);
            if (node) return `${link(path.skill(s), SKILLS[s].name)} ${node.levelReq}`;
        }
        const crop = CROPS.find(c => c.produces === id);
        return crop ? `${link(path.skill('farming'), SKILLS.farming.name)} ${crop.levelReq}` : '';
    };
    return table(['Cooking level #', 'Food', 'Heals (of max health)', 'Cooked from', 'Raw food from'], best.map(n => [n.levelReq, res(n.produces), pct(heals(n), 0), resList(n.consumes), Object.keys(n.consumes).map(source).join(', ')]), { sort: false });
})()}}

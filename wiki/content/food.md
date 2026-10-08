---
path: /food
keywords: food, eat, eating, auto-eat, auto eat, healing, heal, cooking, fish, meat, dishes, gourmet, chef, fasting
aliases: Auto-eat, Healing, Eating
---
Food keeps your hero alive in a long fight. It is cooked in [[Cooking]], every dish burning one log, from raw meat ([[Hunting]]), fish ([[Fishing]]) and crops ([[Farming]]), and raw meat and some fish also drop in the fight ([[Zones]]). Food is kept when you prestige. The table below lists every food, what it heals and what it is cooked from.

## Auto-eat

Your hero eats by himself when his health falls below the auto-eat line, {{pct(BASE.baseAutoEatThreshold, 0)}} of his health to begin with. He checks before every attack, his own and the monster's, and eats until he is above the line again.

What he eats is set by the Food row on the Combat tab and in the fight's dock:

- **Auto**, the setting you start with: the smallest food that fills the missing health, or the biggest one he has when none does. Small foods go on small wounds and the big ones wait for big ones.
- **One food:** pick a food to eat only that one.
- **None:** he never eats.

Each food you carry shows in the row with what it heals, your bonuses counted. Food works the same in [[Dungeons|dungeon runs]], against [[The Titan]] and while you are away.

## Healing and regeneration

A food heals the amount in the table below, raised by your food bonuses, and never past full health. The bonuses add up: the Gourmet perk and the Chef medal.

Food is for the fight itself. While fighting your hero regains only {{pct(BALANCE.combat.regenInCombat)}} of his health a second; out of the fight he regains {{pct(BALANCE.combat.regenResting, 0)}} a second, so resting refills him in under a minute. Lifesteal and a combat level-up heal him too (see [[Combat]]).

## The Gourmet perk

Each level of the Gourmet [[Perks|perk]] raises the auto-eat line by {{pct(perkById('gourmet').mods.autoEatThreshold, 0)}} and food healing by {{pct(perkById('gourmet').mods.foodMult, 0)}}. At its {{perkById('gourmet').max}} levels your hero eats below {{pct(BASE.baseAutoEatThreshold + perkById('gourmet').max * perkById('gourmet').mods.autoEatThreshold, 0)}} health and every food heals {{pct(perkById('gourmet').max * perkById('gourmet').mods.foodMult, 0)}} more. A higher line keeps him further from danger against monsters that hit hard.

## The Chef medal

Reaching Cooking {{achievementById('chef').req.level}} earns the {{achievementById('chef').name}} medal: +{{pct(achievementById('chef').mods.foodMult, 0)}} food healing, for good (see [[Medals]]).

## The Fasting Trial

In the {{trialById('fasting').name}} [[Trials|Trial]] your hero eats nothing, and no health comes back while he fights: no regeneration and no lifesteal. He still heals while he rests out of the fight.

## The best food for your level

Fish heal a little more than the meat of the same level: {{res('cooked_shrimp')}} heals {{RESOURCES.cooked_shrimp.heals}} where {{res('cooked_rabbit')}} heals {{RESOURCES.cooked_rabbit.heals}}, and {{res('cooked_leviathan')}} {{fmt(RESOURCES.cooked_leviathan.heals)}} where {{res('cooked_dragon')}} heals {{fmt(RESOURCES.cooked_dragon.heals)}}. The farm's dishes, most of them from two crops, heal well for their level too. The best food each new Cooking level brings:

{{(() => {
    const heals = n => RESOURCES[n.produces].heals;
    const best = SKILLS.cooking.nodes.filter(n => heals(n)).sort((a, b) => a.levelReq - b.levelReq || heals(b) - heals(a)).reduce((list, n) => (list.length && heals(n) <= heals(list.at(-1)) ? list : [...list, n]), []);
    const source = id => {
        for (const s of ['fishing', 'hunting']) {
            const node = SKILLS[s].nodes.find(x => x.produces === id);
            if (node) return `${link(path.skill(s), SKILLS[s].name)} ${node.levelReq}`;
        }
        const crop = CROPS.find(c => c.produces === id);
        return crop ? `${link(path.skill('farming'), SKILLS.farming.name)} ${crop.levelReq}` : '';
    };
    return table(['Cooking level #', 'Food', 'Heals #', 'Cooked from', 'Raw food from'], best.map(n => [n.levelReq, res(n.produces), fmt(heals(n)), resList(n.consumes), Object.keys(n.consumes).map(source).join(', ')]), { sort: false });
})()}}

---
path: /perks
keywords: skill points, SP, perk, perks, Knight, Warlord, Rogue, Forager, Scholar, Endurance, Gourmet, Fortune, Paragon, respec
---
Perks are bonuses bought with **skill points**, and they last forever: a [[Prestige|prestige]], even an [[Ascension]], keeps every level. Open them from the Perks button in the fight's dock, which lights up when you have points to spend, or in the [[Shop]].

## Where skill points come from

Skill points come only from prestiging:
- {{BALANCE.prestige.spPerPrestige}} for each full run you prestige: a run that reached at least {{pct(BALANCE.prestige.fullRunFraction, 0)}} of your best stage ever;
- one more for every {{BALANCE.prestige.spStageStep}} stages of your best stage ever, each paid once, at your next prestige.

Your first prestige brings your first point, or {{BALANCE.prestige.spPerPrestige + skillPointsForStages(BALANCE.prestige.spStageStep, 0)}} if your run got to stage {{BALANCE.prestige.spStageStep}}. The [[Prestige]] page has a table of the points each best stage earns.

## How perks work

- A level costs more as a perk climbs: levels 1 to {{PERK_COST_STEP}} cost 1 skill point each, the next {{PERK_COST_STEP}} cost 2, and so on, never more than {{PERK_COST_MAX}} (a 25-level perk costs {{Array.from({ length: 25 }, (_, i) => perkLevelCost(i + 1)).reduce((a, b) => a + b, 0)}} in all). You buy one level at a time, up to the perk's limit (the table below), and the button says what the next one costs.
- A level can't be taken back, but it is never wasted either: what you buy is yours for good.
- A perk's bonus adds to the same kind of bonus from everywhere else. Knight's attack, for example, joins the attack bonuses from your [[Combat|Combat level]], [[Medals|medals]], [[Pets|pets]] and potions, and the total multiplies the attack of your fists and [[Equipment|gear]].
- Filling every perk except Paragon takes {{PERKS.filter(p => p.id !== 'paragon').reduce((n, p) => n + Array.from({ length: p.max }, (_, i) => perkLevelCost(i + 1)).reduce((a, b) => a + b, 0), 0)}} skill points, for {{PERKS.filter(p => p.id !== 'paragon').reduce((n, p) => n + p.max, 0)}} levels.

## Good first picks

No choice is wrong, since every level lasts, but some pay off sooner than others:
- **To climb further:** Knight (attack) and Warlord (health) are what break walls, and the guiding hand points at Knight for your very first point. Rogue is a good partner for them: faster attacks multiply your damage on their own, so Rogue keeps its worth as your other attack bonuses pile up. Attack speed stops at +{{pct(BASE.caps.attackSpeed, 0)}} from all sources together.
- **If you are often away for long:** Endurance adds {{PERKS.find(p => p.id === 'endurance').mods.offlineHours}} hours a level to the {{BASE.baseOfflineHours}} hours of [[Offline progress and saves|offline progress]] your hero can make while you are gone.
- **If you train skills a lot:** Forager speeds up gathering and production, and Scholar adds XP in every skill, combat included.
- **Later on:** Gourmet makes your hero eat sooner and heal more from [[Food|food]]. Fortune adds gold and drop chance in combat, which helps once gold buys the [[Camp|camp]] and the [[/skills/agility|agility course]].

## Paragon, for the long run

Paragon gives +{{pct(PERKS.find(p => p.id === 'paragon').mods.atkMult, 0)}} attack, +{{pct(PERKS.find(p => p.id === 'paragon').mods.defMult, 0)}} defence and +{{pct(PERKS.find(p => p.id === 'paragon').mods.hpMult, 0)}} health a level, for up to {{PERKS.find(p => p.id === 'paragon').max}} levels. A level of it is smaller than a level of Knight or Warlord, so Paragon is where your points go once the other perks are full. Its price rises like every perk's: from level {{PERK_COST_STEP * (PERK_COST_MAX - 1) + 1}} on, each costs {{PERK_COST_MAX}} points. It is also deep enough never to run out: late in the game, every skill point you earn still makes your hero stronger.

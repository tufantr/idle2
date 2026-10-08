---
path: /monsters
keywords: monsters, monster, bestiary, enemies, enemy, stars, gilded, gilded monster, boss, bosses, elite, monster stats, health, attack
---
Every kind of monster your hero can fight has a page of its own. Below they are listed by where you first meet them: the {{ZONES.length}} lands, the strata of [[The Abyss]], and the [[Dungeons|dungeons]]. Each land has {{ZONES[0].monsters.length}} kinds that take turns stage by stage, with its boss on every {{STAGES_PER_ZONE}}th stage; past stage {{AUTHORED_STAGES}}, the Abyss goes down in strata of {{STRATUM_STAGES}} stages, each with monsters and a boss of its own.

## The bestiary

The Bestiary in the Hall counts every kind of monster you defeat: its portrait, how many have fallen, and up to {{KILL_STARS.length}} stars, one at {{fmt(KILL_STARS[0])}} defeats, two at {{fmt(KILL_STARS[1])}} and three at {{fmt(KILL_STARS[2])}}. There are {{BESTIARY_SIZE}} kinds to meet, for {{BESTIARY_MAX_STARS}} stars in all.
- Each kind is listed once, where you first meet it. A monster that stands in a later place too counts under its first.
- Dungeon monsters count. The Titans don't, since each of them falls only once.
- The places you have reached are shown, and the next one as silhouettes. A kind you have not met yet is a dark shape with no name.
- Each new star brings a short note with the monster's picture.

Two [[Medals|medals]] ride on the stars: {{ACHIEVEMENTS.find(a => a.id === 'naturalist').name}} ({{ACHIEVEMENTS.find(a => a.id === 'naturalist').req.value}} stars: {{ACHIEVEMENTS.find(a => a.id === 'naturalist').reward.replace(/^./, c => c.toLowerCase())}}) and {{ACHIEVEMENTS.find(a => a.id === 'monster_lore').name}} ({{ACHIEVEMENTS.find(a => a.id === 'monster_lore').req.value}} stars: {{ACHIEVEMENTS.find(a => a.id === 'monster_lore').reward.replace(/^./, c => c.toLowerCase())}}), which also earns your hero the {{LOOKS.find(l => l.medal === 'monster_lore').name}} look.

## Gilded monsters

Now and then an ordinary monster on the stage ladder comes **gilded**, about one in {{Math.round(1 / BALANCE.rewards.gildedChance)}}. It is the same fight for a much better payout: ×{{BALANCE.rewards.gildedGoldMult}} gold, ×{{BALANCE.rewards.gildedXpMult}} XP, and always a gem and some [[Monster Essence|essence]]. Bosses, dungeon monsters and the Titans are never gilded, and a new hero meets a first gilded monster early on.
- The medal {{ACHIEVEMENTS.find(a => a.id === 'gold_rush').name}} ({{ACHIEVEMENTS.find(a => a.id === 'gold_rush').desc.replace(/^./, c => c.toLowerCase())}}) makes them come {{pct(ACHIEVEMENTS.find(a => a.id === 'gold_rush').mods.gildedChance, 0)}} more often, and earns the {{LOOKS.find(l => l.medal === 'gold_rush').name.toLowerCase()}} look.
- During the {{EVENTS.find(e => e.id === 'gold_fever').name}} [[Weekend events|weekend event]] they come {{1 + EVENTS.find(e => e.id === 'gold_fever').mods.gildedChance}} times as often.

## How strong a monster is

A monster's numbers come from the stage it stands on, not from its kind: the kind is only who stands there.
- **Health** is {{BALANCE.enemy.baseHp}} on stage 1 and grows ×{{BALANCE.enemy.hpGrowth}} every stage, about ×{{(BALANCE.enemy.hpGrowth ** STAGES_PER_ZONE).toFixed(2)}} a land. Past stage {{AUTHORED_STAGES}}, in the Abyss, it grows ×{{BALANCE.enemy.abyssHpGrowth}} a stage, and from stage {{BALANCE.enemy.deepFrom}} a little more slowly again, ×{{BALANCE.enemy.deepHpGrowth}}.
- **Attack** is {{BALANCE.enemy.baseAtk}} on stage 1 and grows ×{{BALANCE.enemy.atkGrowth}} a stage, then ×{{BALANCE.enemy.abyssAtkGrowth}} in the Abyss and ×{{BALANCE.enemy.deepAtkGrowth}} from stage {{BALANCE.enemy.deepFrom}}.
- **Speed:** a monster attacks every {{time(BALANCE.enemy.baseInterval)}} on stage 1, a little more often on each stage after, but never more often than every {{time(BALANCE.enemy.minInterval)}}.
- **Bosses** have ×{{BALANCE.enemy.bossHpMult}} health and ×{{BALANCE.enemy.bossAtkMult}} attack, and must fall within {{BALANCE.combat.bossTimeMs / 1000}} seconds of fighting.
- **A gentle start:** over the first {{BALANCE.enemy.ease.to}} stages monsters are weaker than these figures. On stage 1 they have {{pct(BALANCE.enemy.ease.hp, 0)}} of the health and {{pct(BALANCE.enemy.ease.atk, 0)}} of the attack, rising evenly to the full figures, though they pay gold for their full health.
- **Dungeon elites** stand for a stage of the ladder with +{{pct(ELITE_HP_MULT - 1, 0)}} health and +{{pct(ELITE_ATK_MULT - 1, 0)}} attack, and a dungeon's boss has +{{pct(DUNGEON_BOSS_HP_MULT - 1, 0)}} more health than a stage boss.

On your first trip through stages {{BALANCE.combat.firstPack.from}} to {{BALANCE.combat.firstPack.to}}, a stage you have never cleared holds a pack of {{BALANCE.combat.firstPack.size}} monsters instead of one; a boss always stands alone.

Your defence blunts every hit: a monster deals its attack² ÷ (its attack + your defence), so defence equal to its attack halves the blow, and no defence takes off more than {{pct(MAX_MITIGATION, 0)}}. A kill pays {{BALANCE.rewards.goldPerHp}} gold for every point of the monster's health (a boss falling for the first time in a run, ×{{BALANCE.rewards.bossGoldMult}}). The [[Formulas]] page has the figures stage by stage, and each monster's page has its own.

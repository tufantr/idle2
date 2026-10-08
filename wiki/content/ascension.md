---
path: /ascension
keywords: ascension, ascend, stars, outer reset, token gain, rest, second prestige
---
Ascension is the reset above prestige. It is a [[Prestige|prestige]] that also gives up every token you hold, and pays **Stars** for them. Stars are kept forever, and each one makes every later prestige pay more tokens, so the tokens soon come back and then grow past where they were.

## When it opens

From best stage {{ASCEND_FROM}}, the prestige dialog has an "Or ascend" row: the Stars an Ascension would pay you, what every prestige would pay after it, and an Ascend button. The button asks once more, in a dialog of its own, before anything happens, and a backup of your save is kept in Settings. Once you have ascended, the row stays open for good.

An Ascension needs everything a prestige needs (a run of {{BALANCE.prestige.minRunMs / 60000}} minutes that reached stage {{BALANCE.prestige.minStage}}, and no [[The Titan|Titan]] fight or [[Dungeons|dungeon]] run under way), and enough tokens to be worth at least one Star: {{fmt(Math.ceil(STAR_BASE * 10 ** (1 / STARS_PER_DECADE)))}}.

## What it gives up, and what it pays

An Ascension is a prestige first: the run pays its tokens and skill points, the next run starts over at {{pct(BALANCE.prestige.startStageFraction, 0)}} of your best stage, and it counts toward your [[Ranks|rank]]. Then every token, the run's own included, goes back to nothing, and you get Stars for them:

Stars = ⌊{{STARS_PER_DECADE}} × log₁₀(tokens ÷ {{fmt(STAR_BASE)}})⌋

That is {{STARS_PER_DECADE}} Stars for every tenfold of tokens past {{fmt(STAR_BASE)}}: {{fmt(10 * STAR_BASE)}} tokens make {{ascensionStarsFor(10 * STAR_BASE)}} Stars, and {{fmt(100 * STAR_BASE)}} make {{ascensionStarsFor(100 * STAR_BASE)}}. The table below has more.

## What Stars do

Each Star makes every prestige pay +{{pct(STAR_TOKEN_GAIN, 0)}} more tokens, for good, and Stars add up over all your Ascensions: with {{ascensionStarsFor(100 * STAR_BASE)}} Stars, every prestige pays ×{{starGain(ascensionStarsFor(100 * STAR_BASE))}} tokens. Your Stars show in the purse once you have some, and your first Ascension also earns the medal {{ACHIEVEMENTS.find(a => a.id === 'ascendant').name}} ({{ACHIEVEMENTS.find(a => a.id === 'ascendant').reward}}).

Stars are a measure of tenfolds, so a small stock of tokens pays few of them and every tenfold pays the same. What they give, though, multiplies every prestige you make afterwards.

## After an Ascension

Ascension then rests for {{time(ASCEND_REST_MS)}}; the button shows how long is left. Everything else stays as a prestige leaves it: your best stage and its records, skills, gear, perks and skill points, [[Mastery|mastery]], the [[Trials]] you have cleared and your laurels, and your collections (medals, pets, the bestiary and the gear codex). Only the tokens go, while the run, its gold and the [[Camp|camp]] start over as in any prestige. An Ascension also ends a Trial run.

## When to ascend

The dialog shows what every prestige pays now and what it would pay after an Ascension. Your first Ascension is worth making soon after it opens, because Stars are what make tokens come in fast. After that, ascend again when the new Stars would raise that number by a good share: once your Stars are many, giving up a big stock of tokens for a few more can cost you more than it pays.

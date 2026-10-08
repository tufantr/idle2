---
path: /events
keywords: weekend events, weekend event, events, festival, festivals, festival tokens, event shop, milestones, festival cloak, rotation, UTC
---
Every weekend a festival comes to the realm. One event runs each weekend, a different one each time, and while it runs it brings bonuses of its own, Festival Tokens for your work and your fights, and a shop to spend them in.

## When they run

An event runs from {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][EVENT_START_DAY]}} 00:00 to {{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(EVENT_START_DAY + EVENT_LENGTH_HOURS / 24) % 7]}} 00:00 UTC, {{EVENT_LENGTH_HOURS}} hours every weekend. The {{EVENTS.length}} events take turns, so each comes back every few weeks. They follow the calendar, so an event runs whether you are playing or away.

The Events tab opens after your first [[Prestige|prestige]], once a festival is on or about to start. It names the event that is running and when it ends, or the next one and when it starts, and shows the whole rotation.

## The bonuses

While an event runs, its bonuses (the table below) count like any other bonus, for everything you do, online and while you are away: faster skills, bigger harvests, more gold or XP, more [[Monsters|gilded monsters]], or [[Pets|pets]] that find you more often, depending on the festival.

## Festival Tokens

- While an event runs, every {{EVENT_ACTIONS_PER_TOKEN}} skill actions or kills earn a Festival Token; a farming harvest counts for several actions. They come while you are away too.
- You can earn up to {{EVENT_DAILY_CAP}} tokens a day (by the UTC day), so a whole weekend pays at most {{EVENT_DAILY_CAP * EVENT_LENGTH_HOURS / 24}}.
- Tokens keep between events: whatever you don't spend this weekend waits for the next.

Each event also pays out at {{EVENT_MILESTONES.map(m => fmt(m.tokens)).join(', ').replace(/, (?=[^,]*$)/, ' and ')}} tokens earned during that event, automatically (the table below). The milestones start again with the next event.

## Spending tokens

The event shop is open only while an event runs. It sells useful supplies for tokens (the table below), and above them the event's own **festival cloak** for {{FESTIVAL_CLOAK_COST}} tokens: a look for your hero, dyed the event's colour, kept for good and worn from Settings like a [[/capes|skill cape]]. Each festival has its own cloak, which can only be bought while that festival is on; one you miss comes back with its event.

> Tip: The daily limit starts again at midnight UTC, so a little play on each of the {{EVENT_LENGTH_HOURS / 24}} days earns more tokens than one long session.

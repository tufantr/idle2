// Weekend events: which one is running, Festival Tokens from play, milestones and the event shop.
// Everything is derived from the UTC calendar, so events work offline and need no server.

import { EVENTS, EVENT_START_DAY, EVENT_LENGTH_HOURS, EVENT_ACTIONS_PER_TOKEN, EVENT_DAILY_CAP, EVENT_MILESTONES, EVENT_SHOP, eventById } from '../data/events.js';
import { RESOURCES } from '../data/resources.js';
import { log } from './progress.js';

const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;
// The rotation counts weekends (from a Friday) through the first `count` events, starting at `offset`.
// When an event joins, a new era begins at a future weekend, so the weekends already run (and the one
// running) keep their events.
export const ROTATION_ERAS = [
    { from: Date.UTC(2024, 0, 5), count: 5, offset: 0 },
    { from: Date.UTC(2026, 9, 16), count: 6, offset: 5 }    // Lucky Paws joins, after Gold Fever
];

/** 00:00 UTC of the most recent event start day at or before `now`. */
function windowStart(now) {
    const d = new Date(now);
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return midnight - ((d.getUTCDay() - EVENT_START_DAY + 7) % 7) * DAY;
}

function eventForWindow(start) {
    let era = ROTATION_ERAS[0];
    for (const e of ROTATION_ERAS) if (start >= e.from) era = e;
    const n = Math.floor((start - era.from) / WEEK) + era.offset;
    return EVENTS[((n % era.count) + era.count) % era.count];
}

/**
 * The current or next event: { event, active, instance, startsAt, endsAt }. `instance` identifies
 * one run of an event (its milestones reset with it). settings.forceEvent (developer) runs one now.
 */
export function eventStatus(state, now) {
    const forced = state.settings?.forceEvent && eventById(state.settings.forceEvent);
    if (forced) return { event: forced, active: true, instance: `${forced.id}:forced`, startsAt: now - DAY, endsAt: now + DAY };
    const start = windowStart(now);
    const end = start + EVENT_LENGTH_HOURS * 3600 * 1000;
    if (now < end) {
        const event = eventForWindow(start);
        return { event, active: true, instance: `${event.id}:${start}`, startsAt: start, endsAt: end };
    }
    const next = start + WEEK;
    return { event: eventForWindow(next), active: false, instance: null, startsAt: next, endsAt: next + EVENT_LENGTH_HOURS * 3600 * 1000 };
}

function grant(state, reward) {
    for (const [id, qty] of Object.entries(reward)) if (RESOURCES[id]) state.resources[id] += qty;
}

/**
 * Count `amount` actions (a skill action, a kill; a harvest counts 5) toward Festival Tokens.
 * Returns the number of tokens earned.
 */
export function eventProgress(game, amount = 1) {
    const state = game.state;
    const status = eventStatus(state, game.now);
    if (!status.active) return 0;
    const ev = state.events;
    const day = new Date(game.now).toISOString().slice(0, 10);
    if (ev.day !== day) { ev.day = day; ev.earnedToday = 0; }
    if (ev.instance !== status.instance) { ev.instance = status.instance; ev.instanceEarned = 0; ev.milestones = []; }
    if (ev.earnedToday >= EVENT_DAILY_CAP) return 0;
    ev.progress += amount;
    let earned = 0;
    while (ev.progress >= EVENT_ACTIONS_PER_TOKEN && ev.earnedToday < EVENT_DAILY_CAP) {
        ev.progress -= EVENT_ACTIONS_PER_TOKEN;
        ev.tokens++;
        ev.earnedToday++;
        ev.instanceEarned++;
        earned++;
        for (const m of EVENT_MILESTONES) {
            if (ev.instanceEarned >= m.tokens && !ev.milestones.includes(m.tokens)) {
                ev.milestones.push(m.tokens);
                grant(state, m.reward);
                log(game, `${status.event.icon} ${status.event.name}: ${m.tokens} tokens earned — ${m.desc}!`, 'achievement');
                game.emit({ type: 'eventMilestone', event: status.event, milestone: m });
            }
        }
    }
    if (ev.earnedToday >= EVENT_DAILY_CAP) ev.progress = 0;
    if (earned) game.markDirty();
    return earned;
}

export function buyEventItem(game, itemId) {
    const state = game.state;
    const item = EVENT_SHOP.find(i => i.id === itemId);
    const status = eventStatus(state, game.now);
    if (!item) return false;
    if (!status.active) { game.emit({ type: 'error', text: 'The event shop opens when the next event starts.' }); return false; }
    if (state.events.tokens < item.cost) { game.emit({ type: 'error', text: `${item.name} costs ${item.cost} Festival Tokens.` }); return false; }
    state.events.tokens -= item.cost;
    grant(state, item.gives);
    log(game, `🎉 Bought ${item.name} (${item.desc}).`, 'loot');
    game.markDirty();
    return true;
}

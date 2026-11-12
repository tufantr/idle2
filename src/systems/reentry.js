// The welcome-back report's re-entry strip (DESIGN §3.16): after a day or more away, what the world did meanwhile, a line
// each and only for what the player has met: what the new version changed (filled by the caller: no changelog yet), the
// clan's week, the weekend event that ran or runs, and the week's Trial with its laurel. The report covers the hero; this
// covers the world. A month away reads as short as a day: each line is the latest of its kind. Pure: facts the UI writes.

import { seen } from './disclosure.js';
import { isUnlocked } from '../data/unlocks.js';
import { eventStatus } from './events.js';
import { weeklyGoal, trialsOpen, pactSize } from './trials.js';
import { CLAN_BANNER, CLAN_BOSS, isoWeek } from '../data/social.js';

export const REENTRY_AFTER_MS = 24 * 3600 * 1000;
const WEEK = 7 * 24 * 3600 * 1000;
const CHANGES_SHOWN = 3;

/**
 * The strip's facts for a return (`summary`: systems/offline.js's report, `now`: the game's clock as the replay ends), or
 * null when the report has no strip: under REENTRY_AFTER_MS away, or none of the world met yet (disclosure 'reentry'). An
 * empty list: nothing waits out there. `changes`: what the new version changed, lines of plain text.
 *   { kind: 'changes', lines }
 *   { kind: 'clan', kills, levels, mult }              levels of the week's clan boss felled, the banner they raise
 *   { kind: 'event', id, name, running, endsAt, tokens }   running now, or the last one, ended while away; tokens won meanwhile
 *   { kind: 'trial', id, name, icon, target, laurels, of, won }   the week's Trial and its laurels (`of` a week)
 */
export function reentryFacts(state, now, summary, { changes = [] } = {}) {
    if (!summary || !(summary.elapsed >= REENTRY_AFTER_MS) || !seen(state, 'reentry')) return null;
    const facts = [];
    const lines = (changes || []).filter(line => typeof line === 'string' && line.trim()).slice(0, CHANGES_SHOWN);
    if (lines.length) facts.push({ kind: 'changes', lines });
    // the clan's week, as the server last said it this week (its banner: data/social.js CLAN_BANNER)
    const banner = state.clanBanner;
    if (isUnlocked(state, 'clan') && state.clanHall?.clan > 0 && banner?.week === isoWeek(now)) {
        facts.push({ kind: 'clan', kills: banner.kills, levels: CLAN_BOSS.levels, mult: CLAN_BANNER[banner.kills] || 1 });
    }
    // the weekend event running, or the last one if it ran while away (only the latest: a month away is one line)
    if (isUnlocked(state, 'events')) {
        const status = eventStatus(state, now);
        const last = status.active ? status : eventStatus(state, status.startsAt - WEEK + 1);
        const tokens = Math.max(0, Math.floor(summary.festival || 0));
        if (last.active && (status.active || last.endsAt > now - summary.elapsed)) {
            facts.push({ kind: 'event', id: last.event.id, name: last.event.name, running: status.active, endsAt: last.endsAt, tokens });
        }
    }
    // the week's Trial, and its laurel: still to win, or won
    if (seen(state, 'trials') && trialsOpen(state)) {
        const week = weeklyGoal(state, now);
        facts.push({ kind: 'trial', id: week.trial.id, name: week.trial.name, icon: week.trial.icon, target: week.target, laurels: week.laurels, of: pactSize(state), won: week.won });
    }
    return facts;
}

// A gap that a hidden tab replayed (the browser paused it while the player was in another tab or app: research-loop/040)
// shorter than this is told in a line, not the welcome-back: the player never left the game.
export const BACKGROUND_REPORT_MS = 3600 * 1000;

/**
 * How a gap in play is told once the page is in view (main.js gapReport): 'report', the welcome-back (with its strip after
 * a day or more, as a closed tab's), 'toast' for a tab that was hidden as the gap began and under BACKGROUND_REPORT_MS, or
 * null when nothing was under way.
 */
export function gapTelling(summary, { background = false } = {}) {
    if (!summary || summary.mode === 'rest') return null;
    return background && summary.elapsed < BACKGROUND_REPORT_MS ? 'toast' : 'report';
}

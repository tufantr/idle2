// The playtest log (Settings, off unless the player turns it on): a timeline of what happened in play,
// so a real session can be set beside the simulator's (docs/research_notes/robust-and-fun/D §3, the
// only way to check its proxies for fun). Kept in the save, at most PLAYTEST_MAX entries, and exported
// as a file from Settings; `node tools/playtest.mjs <file>` reads it. Nothing leaves the player's
// machine unless he sends the file.
//
// Each entry is { t, kind, what, cls }: the time, a kind, a few words, and how big a moment it is
// (major, medium or minor, the classes of tools/simulate.mjs's log of big moments). Noted from the
// game's own events as they happen, also during the offline replay; the UI adds 'show' and 'hide'
// when the page comes into view and leaves it, and a 'return' comes with each welcome-back.

import { rankFor } from '../data/ranks.js';

export const PLAYTEST_MAX = 5000;
export const PLAYTEST_KINDS = new Set(['start', 'place', 'zone', 'record', 'unique', 'pet', 'medal', 'obstacle', 'level', 'rank', 'prestige',
    'firstClear', 'tier', 'titan', 'death', 'bossHeldOut', 'mastery', 'trial', 'return', 'show', 'hide']);

/** The log entry an event makes ({ kind, what, cls }), or null. Reads the state as it is after the event. */
export function playtestEntry(state, ev) {
    switch (ev.type) {
        case 'unlock': return { kind: 'place', what: ev.id, cls: 'major' };
        case 'zoneReached': return { kind: 'zone', what: ev.zone, cls: 'major' };
        case 'record': return { kind: 'record', what: String(ev.stage), cls: 'major' };
        case 'unique': return ev.item?.locked ? { kind: 'unique', what: ev.item.uniqueId || ev.item.name, cls: 'major' } : null;
        case 'pet': return { kind: 'pet', what: ev.pet?.id || '', cls: 'major' };
        case 'achievement': return { kind: 'medal', what: ev.id || ev.name || '', cls: 'major' };
        case 'obstacleBuilt': return { kind: 'obstacle', what: ev.obstacle?.id || '', cls: 'major' };
        case 'levelUp':
            if (ev.level >= 99) return { kind: 'level', what: `${ev.skill} 99`, cls: 'major' };
            return { kind: 'level', what: `${ev.skill} ${ev.level}`, cls: ev.level % 10 === 0 ? 'medium' : 'minor' };
        case 'prestige': {
            const n = state.prestige?.count || 0;
            if (rankFor(n) !== rankFor(n - 1)) return { kind: 'rank', what: rankFor(n).name, cls: 'major' };
            return { kind: 'prestige', what: `${n}${ev.auto ? ' auto' : ''} +${ev.tokens}`, cls: 'minor' };
        }
        case 'dungeonClear': return ev.clears === 1 ? { kind: 'firstClear', what: ev.dungeon, cls: 'major' } : null;
        case 'itemDropped': return ev.first || ev.pity ? { kind: 'tier', what: `${ev.item?.type} ${ev.item?.tier}${ev.pity ? ' (pity)' : ''}`, cls: 'medium' } : null;
        case 'titan': return ev.won ? { kind: 'titan', what: String(ev.level || ''), cls: 'medium' } : null;
        case 'death': return { kind: 'death', what: `${ev.mode || 'stages'} ${ev.stage ?? ''}`, cls: 'minor' };
        case 'bossTimeout': return { kind: 'bossHeldOut', what: String(ev.stage ?? ''), cls: 'minor' };
        case 'trialTier': return { kind: 'trial', what: `${ev.id} ${ev.tier}`, cls: ev.last ? 'major' : 'medium' };
        case 'masteryCheckpoint': return { kind: 'mastery', what: `${ev.skill} ${Math.round(ev.at * 100)}%`, cls: 'medium' };
        case 'masteryLevel': return ev.from < 99 && ev.level >= 99 ? { kind: 'mastery', what: ev.key, cls: 'medium' } : null;
        default: return null;
    }
}

/** Add an entry (when the log is on). */
export function notePlaytest(state, entry, now) {
    if (!state?.settings?.playtestLog || !entry) return;
    if (!Array.isArray(state.playtest)) state.playtest = [];
    state.playtest.push({ t: now, kind: entry.kind, what: String(entry.what ?? '').slice(0, 60), cls: entry.cls || 'minor' });
    if (state.playtest.length > PLAYTEST_MAX) state.playtest.splice(0, state.playtest.length - PLAYTEST_MAX);
}

/** Note what event `ev` means for the log, at time `now`. */
export function playtestEvent(state, ev, now) {
    if (!state?.settings?.playtestLog) return;
    notePlaytest(state, playtestEntry(state, ev), now);
}

/** The log as a file's contents: the entries and a few facts to read them by. */
export function playtestExport(state, now) {
    return JSON.stringify({
        kind: 'fantasy-idle-playtest', version: 1, exportedAt: now, createdAt: state.meta?.createdAt,
        playtimeMs: state.meta?.playtimeMs, attendedMs: state.meta?.attendedMs, bestStage: state.combat?.bestStage, prestiges: state.prestige?.count,
        events: state.playtest || []
    });
}

// The game for screen readers (docs/DESIGN.md §3.36). What a sighted player is told in passing (a toast, a card, the fight's banners)
// reaches a screen reader through one polite line at the foot of the page, written here one at a time and never in a flood: at
// most one every few seconds, routine ones rarer than the rest, the same words not twice within a while, and when more come than
// can be said the oldest go. The fight's numbers are not read out as they change: fightSummary is a hidden paragraph in the battle
// scene, to be read when the player goes to it.

import { zoneForStage } from '../data/zones.js';
import { dungeonAt } from '../data/dungeons.js';
import { titanLevel } from '../systems/dungeon.js';
import { fmt } from './format.js';

export const SAY_GAP_MS = 2500;        // a line that matters, at most this often
export const SAY_ROUTINE_MS = 8000;    // a routine one only this long after the last line
export const SAY_SAME_MS = 20000;      // the same words again stay unsaid for this long
export const SAY_QUEUE = 3;            // lines waiting; the oldest make way
export const SAY_MAX_CHARS = 180;

/** Words out of a line of markup: tags gone, the entities it was escaped with undone, spaces tidied. */
export function plainWords(html) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[e]))
        .replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();
}

/** `write(line)` puts a line where a screen reader hears it; `pump(now)` is called as the game ticks. */
export function createAnnouncer(write) {
    let queue = [];
    let lastAt = -Infinity;
    const said = new Map();   // words -> when they were last taken up
    return {
        /** `important`: a boss, a fall, a level, a card; anything else is routine and yields to them. */
        say(text, { important = false, now = Date.now() } = {}) {
            const line = plainWords(text).slice(0, SAY_MAX_CHARS);
            if (!line || now - (said.get(line) ?? -Infinity) < SAY_SAME_MS) return;
            said.set(line, now);
            if (said.size > 40) for (const [words, at] of said) if (now - at >= SAY_SAME_MS) said.delete(words);
            queue.push({ line, important });
            if (queue.length > SAY_QUEUE) queue.splice(Math.max(0, queue.findIndex(q => !q.important)), 1);
        },
        /** The next line, if its time has come. Returns it (or null). */
        pump(now = Date.now()) {
            const i = queue.findIndex(q => q.important);
            const next = queue[i >= 0 ? i : 0];
            if (!next || now - lastAt < (next.important ? SAY_GAP_MS : SAY_ROUTINE_MS)) return null;
            queue.splice(queue.indexOf(next), 1);
            lastAt = now;
            write(next.line);
            return next.line;
        },
        /** The page went out of sight: what was waiting is old news when it comes back. */
        clear() { queue = []; }
    };
}

/** The fight in words: where, the hero's health, the monster's, and what is going on. Read when the player goes to it. */
export function fightSummary(game) {
    const state = game.state;
    const c = state.combat;
    const d = game.derived;
    const seconds = ms => `${Math.max(1, Math.ceil(ms / 1000))} seconds`;
    const dungeon = c.mode === 'dungeon' ? dungeonAt(c.dungeon?.id, c.dungeon?.tier) : null;
    const place = c.mode === 'titan' ? `The Titan, level ${fmt(titanLevel(state))}`
        : c.mode === 'clan' ? 'The clan boss'
        : dungeon ? `${dungeon.name}, room ${Math.min((c.dungeon?.index || 0) + 1, dungeon.monsters.length + 1)} of ${dungeon.monsters.length + 1}`
        : `Stage ${fmt(c.stage)}, ${zoneForStage(c.stage).name}${c.maxStage > c.stage ? `, best ${fmt(c.maxStage)}` : ''}`;
    const foe = c.enemy ? `${c.enemy.name}: ${fmt(Math.max(0, c.enemy.hp))} of ${fmt(c.enemy.maxHp)} health` : '';
    const now = !c.active ? (c.recovering ? 'Resting at the campfire' : 'Not fighting')
        : c.mode === 'stages' && c.regroupLeft > 0 ? `Regrouping: the boss in ${seconds(c.regroupLeft)}`
        : c.enemy?.boss ? `${seconds(c.bossTimeLeft)} on its clock` : '';
    return `${[place, `You: ${fmt(Math.max(0, c.hp))} of ${fmt(d.maxHp)} health`, foe, now].filter(Boolean).join('. ')}.`;
}

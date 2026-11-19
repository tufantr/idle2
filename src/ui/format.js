// Number and time formatting for the UI.

// Past No (10^30) the short scale's names go on the same way, so the deep Abyss's numbers stay words to the end of
// what a number holds: Dc (10^33), UDc, DDc, TDc, QaDc … NoDc, Vg (10^63) … NoNog (10^300), Ce, UCe.
const UNITS = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const TENS = ['Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Nog'];
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
    ...Array.from({ length: 90 }, (_, i) => UNITS[i % 10] + TENS[Math.floor(i / 10)]), 'Ce', 'UCe'];

// How big numbers are written: settings.numberFormat (data/settings.js), set here by main.js at each draw, because every figure on
// screen comes through fmt. Letters are the default, and all a test or a tool ever sees.
let notation = 'short';
export function setNotation(mode) { notation = mode === 'mixed' || mode === 'scientific' ? mode : 'short'; }

/** 1.23e33: three figures and an exponent, for the notations that use one. */
const scientific = n => n.toExponential(2).replace('e+', 'e');
/** The name's place in SUFFIXES a number is shown under, after rounding (999.7M counts as a billion). */
function tierOf(n) {
    const abs = Math.abs(n);
    const tier = Math.floor(Math.log10(abs) / 3);
    return Math.abs(Number((n / Math.pow(10, tier * 3)).toPrecision(3))) >= 1000 ? tier + 1 : tier;
}
const FIRST_E_TIER = SUFFIXES.indexOf('Dc');   // mixed: letters up to No, and from where they would turn to Dc (10^33) an exponent

/** In letters whatever the setting: 1234 -> "1,234"; 1234567 -> "1.23M" (full digits with separators below one million). For what is stored (the log). */
export function letters(n, { short = true } = {}) {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (!short || abs < 1e6) return Math.round(n).toLocaleString('en-US');
    const tier = tierOf(n);
    if (tier >= SUFFIXES.length) return n.toExponential(2);
    const scaled = n / Math.pow(10, tier * 3);
    const shown = Math.abs(Number(scaled.toPrecision(3)));   // the digits after the point follow the rounded value: 99.97M reads 100M
    return `${scaled.toFixed(shown >= 100 ? 0 : shown >= 10 ? 1 : 2)}${SUFFIXES[tier]}`;
}

/** The one way a figure reaches the screen: letters as above, or the notation chosen in Settings from a million up. */
export function fmt(n, options) {
    if (notation === 'short' || !Number.isFinite(n) || Math.abs(n) < 1e6) return letters(n, options);
    return notation === 'scientific' || tierOf(n) >= FIRST_E_TIER ? scientific(n) : letters(n, options);
}

/** A multiplier with its decimals; past a million it is a big number like any other. */
export const fixed = (x, digits = 2) => (notation !== 'short' && Math.abs(x) >= 1e6 ? fmt(x) : x.toFixed(digits));

// Words the game has already written (the log, a message from the rules: their figures are in letters or full digits, and the log is
// saved as it is), with their big figures read and written again in the notation chosen.
const NAMED = new Map(SUFFIXES.map((name, tier) => [name, tier]).slice(2));   // from M up
const WRITTEN = new RegExp(`(?<![\\w.,])(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)(${[...NAMED.keys()].sort((a, b) => b.length - a.length).join('|')})?(?!\\w)`, 'g');
export function numbersIn(text) {
    if (notation === 'short') return text;
    return String(text).replace(WRITTEN, (all, digits, name) => {
        const n = Number(digits.replace(/,/g, ''));
        if (name) return fmt(n * Math.pow(10, 3 * NAMED.get(name)));
        return n >= 1e6 ? fmt(n) : all;
    });
}

export function pct(x, digits = 0) {
    return `${(x * 100).toFixed(digits)}%`;
}

/** What a piece of gear does to the hero (systems/inventory.js equipGain), part by part: [{ text: '+38% attack', up: true }]. */
export function gainParts(gain) {
    const part = (v, word) => {
        if (!Number.isFinite(v)) return v > 0 ? { text: `+${word}`, up: true } : null;   // (none before: a first piece of armour)
        if (Math.abs(v) < 0.005) return null;
        const abs = Math.abs(v);
        return { text: `${v > 0 ? '+' : '−'}${abs >= 10 ? `×${(1 + v).toFixed(0)}` : pct(abs, abs < 0.1 ? 1 : 0)} ${word}`, up: v > 0 };
    };
    return gain ? [part(gain.atk, 'attack'), part(gain.def, 'defence'), part(gain.hp, 'health')].filter(Boolean) : [];
}
/** The same in words: "+38% attack, −2.5% health". */
export const gainWords = gain => gainParts(gain).map(p => p.text).join(', ');
/** The same as markup, each part green or red. */
export const gainMarkup = gain => gainParts(gain).map(p => `<span class="${p.up ? 'up' : 'down'}">${escapeHtml(p.text)}</span>`).join(', ');
/** Stages a gain is worth (systems/inventory.js gainStages), in words: "+12 stages"; '' under one. */
export function stagesWords(n) {
    if (n == null || !Number.isFinite(n) || Math.abs(n) < 1) return '';
    const k = Math.round(Math.abs(n));
    return `${n > 0 ? '+' : '−'}${k} stage${k === 1 ? '' : 's'}`;
}

export function seconds(ms) {
    return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

export function duration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
}

export function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** A share of a whole in words: 0.5 -> "half", 0.1 -> "a tenth" (else a percentage). For a strike's share of an attack. */
export function shareInWords(x) {
    return { 0.5: 'half', 0.25: 'a quarter', 0.2: 'a fifth', 0.1: 'a tenth', 0.05: 'a twentieth' }[x] || `${Math.round(x * 100)}%`;
}

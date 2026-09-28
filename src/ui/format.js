// Number and time formatting for the UI.

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];

/** 1234 -> "1,234"; 1234567 -> "1.23M" (full digits with separators below one million). */
export function fmt(n, { short = true } = {}) {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (!short || abs < 1e6) return Math.round(n).toLocaleString('en-US');
    let tier = Math.floor(Math.log10(abs) / 3);
    if (tier >= SUFFIXES.length) return n.toExponential(2);
    const scaled = n / Math.pow(10, tier * 3);
    return `${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)}${SUFFIXES[tier]}`;
}

export function pct(x, digits = 0) {
    return `${(x * 100).toFixed(digits)}%`;
}

export function seconds(ms) {
    return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

export function duration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
}

export function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

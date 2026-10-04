// Small helpers for the words the game writes.

/**
 * "a Copper Sword", "an Iron Axe", and plain "Copper Boots": the article that fits the name. Names
 * ending in s are pairs here (boots, greaves, gauntlets) and take none.
 */
export function withArticle(name) {
    const text = String(name);
    if (/s$/i.test(text)) return text;
    return `${/^[aeiou]/i.test(text) ? 'an' : 'a'} ${text}`;
}

/** The hero's name as the player typed it, made safe to keep: one line of plain text, at most 20
 * characters ('' leaves him "You"). */
export const HERO_NAME_MAX = 20;
export function heroName(raw) {
    if (typeof raw !== 'string') return '';
    return raw.replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, HERO_NAME_MAX).trim();
}

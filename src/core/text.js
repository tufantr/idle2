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

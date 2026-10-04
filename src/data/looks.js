// The hero's looks: a body and a hairstyle from DCSS's player tiles (tools/atlas.py packs each as
// hero/look/<id>/base and hero/look/<id>/hair). Picked on the title card or in Settings; gear goes on
// top whatever the look, and a helmet hides the hair. The ids are saved.
//
// The first ten are open to everyone. The rest are earned, each with a medal (`medal`, an achievement
// id): cosmetic only, a mark of the deed.

export const LOOKS = [
    { id: 'brown',  base: 'human_m',  hair: 'short_brown' },
    { id: 'red',    base: 'human_f',  hair: 'fem_red' },
    { id: 'gold',   base: 'human_f',  hair: 'long_yellow' },
    { id: 'dusk',   base: 'human2_m', hair: 'short_black' },
    { id: 'raven',  base: 'human2_f', hair: 'long_black' },
    { id: 'umber',  base: 'human3_m', hair: 'short_black' },
    { id: 'braids', base: 'human3_f', hair: 'pigtails_brown' },
    { id: 'elf',    base: 'elf_m',    hair: 'elf_yellow' },
    { id: 'snow',   base: 'elf_f',    hair: 'elf_white' },
    { id: 'dwarf',  base: 'dwarf_m',  hair: null },              // the beard is the hair
    // earned
    { id: 'orc',      base: 'orc_m',            hair: null, name: 'Orc',        medal: 'delver' },
    { id: 'djinni',   base: 'djinni_gold_m',    hair: null, name: 'Gold djinni', medal: 'gold_rush' },
    { id: 'gargoyle', base: 'gargoyle_m',       hair: null, name: 'Gargoyle',   medal: 'titan_slayer' },
    { id: 'mummy',    base: 'mummy_m',          hair: null, name: 'Mummy',      medal: 'monster_lore' },
    { id: 'demon',    base: 'demonspawn_red_m', hair: null, name: 'Demonspawn', medal: 'boss_10' },
    { id: 'ghoul',    base: 'ghoul_m',          hair: null, name: 'Ghoul',      medal: 'unbroken' }
];

export const DEFAULT_LOOK = LOOKS[0].id;

export const lookById = id => LOOKS.find(l => l.id === id) || LOOKS[0];

/** Can this hero wear look `look`? Every open look, and an earned one once its medal is won. */
export const lookOpen = (state, look) => !look.medal || !!state?.achievements?.[look.medal];

/** The look earned with medal `medalId`, if any. */
export const lookForMedal = medalId => LOOKS.find(l => l.medal === medalId) || null;

/** The look `step` places from `id` among those this hero can wear (wrapping round): the title card's arrows. */
export function nextLook(id, step = 1, state = null) {
    const open = LOOKS.filter(l => lookOpen(state, l));
    const i = Math.max(0, open.findIndex(l => l.id === id));
    return open[(i + step + open.length) % open.length].id;
}

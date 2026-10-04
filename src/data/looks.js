// The hero's looks: a body and a hairstyle from DCSS's player tiles (tools/atlas.py packs each as
// hero/look/<id>/base and hero/look/<id>/hair). Picked on the title card or in Settings; gear goes on
// top whatever the look, and a helmet hides the hair. The ids are saved.

export const LOOKS = [
    { id: 'brown',  base: 'human_m',  hair: 'short_brown' },     // the hero as he first was
    { id: 'red',    base: 'human_f',  hair: 'fem_red' },
    { id: 'gold',   base: 'human_f',  hair: 'long_yellow' },
    { id: 'dusk',   base: 'human2_m', hair: 'short_black' },
    { id: 'raven',  base: 'human2_f', hair: 'long_black' },
    { id: 'umber',  base: 'human3_m', hair: 'short_black' },
    { id: 'braids', base: 'human3_f', hair: 'pigtails_brown' },
    { id: 'elf',    base: 'elf_m',    hair: 'elf_yellow' },
    { id: 'snow',   base: 'elf_f',    hair: 'elf_white' },
    { id: 'dwarf',  base: 'dwarf_m',  hair: null }               // his beard is his hair
];

export const DEFAULT_LOOK = LOOKS[0].id;

export const lookById = id => LOOKS.find(l => l.id === id) || LOOKS[0];

/** The look `step` places along the list from `id` (wrapping round), for the title card's arrows. */
export function nextLook(id, step = 1) {
    const i = Math.max(0, LOOKS.findIndex(l => l.id === id));
    return LOOKS[(i + step + LOOKS.length) % LOOKS.length].id;
}

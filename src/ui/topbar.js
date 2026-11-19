// The top bar keeps its height while the game is played (a player's report, November 2026: the page moved under the hand;
// docs/DESIGN.md §3.23). The pills have a slot of their own (style.css `.pills`), so what comes and goes there moves nothing.
// What is left is the row around them, which wraps by what it holds: the purse's figures grow, and the daily crate comes and
// goes. So the bar is laid out once for each window width and each way it is shown, as it will be at its fullest (the gold at
// its widest, another figure longer, the crate in its place), in the layout with the fewest lines (LAYOUTS), and it stands at
// least that high until the window's width changes.

const WIDEST_GOLD = '9,999,999';   // a little wider than the gold ever reads for long (999,999, then "1.00M": ui/format.js)
// The ways the bar can be laid out, in the order they are tried. `fold` 0: every word; 1: the buttons' words go; 2: the purse's
// names too. `flat`: the purse across the row and the pills beside the buttons, for a bar too narrow for both beside the buttons.
const LAYOUTS = [0, 1].flatMap(flat => [0, 1, 2].map(fold => ({ flat, fold })));

/**
 * Run `measure` with the bar at its fullest: the gold at its widest, room for a digit more on the longest other figure, the
 * crate in its place. Nothing is painted in between: all is back before the frame.
 */
function atFullest(bar, measure) {
    const gold = bar.querySelector('#hdr-gold');
    const others = [...bar.querySelectorAll('.chip b, .chip i:not(.spr)')].filter(f => f !== gold);
    const longest = others.reduce((a, f) => (a && a.textContent.length >= f.textContent.length ? a : f), null);
    const shown = [gold, longest].map(f => f?.textContent);
    if (gold && shown[0].length < WIDEST_GOLD.length) gold.textContent = WIDEST_GOLD;
    if (longest) longest.textContent = `${shown[1]}00`;   // (a digit, and the comma it may bring)
    const crate = bar.querySelector('.daily-btn[hidden]');
    crate?.removeAttribute('hidden');
    bar.classList.add('measuring');
    const result = measure();
    bar.classList.remove('measuring');
    crate?.setAttribute('hidden', '');
    [gold, longest].forEach((f, i) => { if (f) f.textContent = shown[i]; });
    return result;
}

export function createBarHold(bar) {
    let shape = '';   // what the bar was laid out for
    let held = 0;     // the height it keeps (0: not measured yet)
    const shapeNow = () => `${window.innerWidth}|${document.body.classList.contains('battle-full')}|${bar.querySelectorAll('.chip').length}`;
    const hold = height => {
        held = Math.max(held, height);
        const css = `${held}px`;
        if (bar.style.minHeight !== css) bar.style.minHeight = css;
    };

    const apply = ({ flat, fold }) => { bar.dataset.flat = flat; bar.dataset.fold = fold; };

    /** Lay the bar out for this shape: the first layout that gives it the fewest lines. */
    function layOut() {
        const best = atFullest(bar, () => {
            let least = null;
            for (const layout of LAYOUTS) {
                apply(layout);
                const height = bar.getBoundingClientRect().height;
                if (!least || height < least.height - 0.5) least = { layout, height };
            }
            return least;
        });
        apply(best.layout);
        hold(best.height);
        bar.dataset.heldFor = shape;   // (tools/topbar.mjs waits for it)
    }

    /** When the page has stopped moving (the same size two frames running: a resize or a change of view can take a few). */
    function settle(forShape, size = '') {
        requestAnimationFrame(() => {
            if (shape !== forShape) return;
            const { width, height } = bar.getBoundingClientRect();
            const now = `${width}x${height}`;
            if (now === size) layOut();
            else settle(forShape, now);
        });
    }

    return {
        /** After the bar is drawn (`drawn`: its markup changed), and when the window changes size. */
        sync({ drawn = true } = {}) {
            const now = shapeNow();
            if (now !== shape) {
                shape = now;
                held = 0;
                bar.style.minHeight = '';
                settle(now);
            } else if (drawn && held) hold(bar.getBoundingClientRect().height);   // what the bar has needed since: it doesn't come back down
        },
        /** Lay it out again (the fonts have come). */
        forget() { shape = ''; }
    };
}

// Sound and touch: every action answers with a short synthesized sound (Web Audio, no files) and,
// on a phone, a tap of the motor. Nothing plays until the player has interacted once (browsers
// insist), and one setting mutes it all. Sounds are built from oscillators and filtered noise, so
// they are tiny, instant and never out of tune with each other.

const MAX_PER_WINDOW = 5;     // a background tab catching up can fire hundreds of events at once
const WINDOW_MS = 120;
const MASTER_VOLUME = 0.42;

export function createSound(isOn, volume = () => 1) {
    let ctx = null;
    let master = null;
    let noiseBuffer = null;
    let recent = [];
    let unlocked = false;

    function ensure() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = MASTER_VOLUME * volume();
        // A gentle high shelf keeps the synth sounds from being shrill on phone speakers.
        const shelf = ctx.createBiquadFilter();
        shelf.type = 'highshelf';
        shelf.frequency.value = 5000;
        shelf.gain.value = -6;
        master.connect(shelf).connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return ctx;
    }

    /** Called on the first user gesture: creates (and resumes) the audio context. */
    function unlock() {
        unlocked = true;
        const c = ensure();
        if (c && c.state === 'suspended') c.resume().catch(() => {});
    }

    function allowed() {
        if (!unlocked || !isOn() || document.hidden) return false;
        const c = ensure();
        if (!c || c.state !== 'running') return false;
        const now = performance.now();
        recent = recent.filter(t => now - t < WINDOW_MS);
        if (recent.length >= MAX_PER_WINDOW) return false;
        recent.push(now);
        return true;
    }

    // ----- building blocks -----

    /** A tone: `type` wave from `f0` to `f1` Hz over `ms`, with an attack and an exponential release. */
    function tone({ type = 'sine', f0 = 440, f1 = f0, ms = 120, gain = 0.3, at = 0, attack = 0.004, curve = 'exp' }) {
        const t = ctx.currentTime + at;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) {
            if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + ms / 1000);
            else osc.frequency.linearRampToValueAtTime(f1, t + ms / 1000);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + ms / 1000 + 0.02);
    }

    /** A burst of noise through a filter: thuds, whooshes, crackles. */
    function noise({ ms = 80, gain = 0.25, at = 0, filter = 'lowpass', f0 = 800, f1 = f0, q = 0.8 }) {
        const t = ctx.currentTime + at;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        const flt = ctx.createBiquadFilter();
        flt.type = filter;
        flt.Q.value = q;
        flt.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + ms / 1000);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
        src.connect(flt).connect(g).connect(master);
        src.start(t);
        src.stop(t + ms / 1000 + 0.02);
    }

    const vary = (f, cents = 60) => f * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
    const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note number to Hz

    // ----- the sounds -----

    const SOUNDS = {
        click() { tone({ type: 'triangle', f0: vary(1800, 40), f1: 1200, ms: 45, gain: 0.12 }); noise({ ms: 25, gain: 0.08, filter: 'highpass', f0: 3000 }); },
        tick() { tone({ type: 'sine', f0: vary(900, 80), ms: 40, gain: 0.08 }); },
        action() { noise({ ms: 60, gain: 0.14, filter: 'bandpass', f0: vary(1400, 120), q: 2 }); tone({ type: 'triangle', f0: vary(520, 90), f1: 380, ms: 70, gain: 0.1 }); },
        double() { SOUNDS.action(); tone({ type: 'sine', f0: 1320, f1: 1760, ms: 120, gain: 0.14, at: 0.05 }); },
        hit() { tone({ type: 'sine', f0: vary(190), f1: 55, ms: 110, gain: 0.5 }); noise({ ms: 50, gain: 0.22, filter: 'lowpass', f0: 1800, f1: 300 }); },
        crit() { tone({ type: 'sine', f0: vary(240), f1: 50, ms: 160, gain: 0.6 }); tone({ type: 'sawtooth', f0: 900, f1: 180, ms: 90, gain: 0.12 }); noise({ ms: 110, gain: 0.3, filter: 'bandpass', f0: 2600, f1: 500, q: 1.2 }); },
        hurt() { tone({ type: 'sine', f0: vary(140), f1: 45, ms: 150, gain: 0.45 }); noise({ ms: 90, gain: 0.18, filter: 'lowpass', f0: 900, f1: 200 }); },
        dodge() { noise({ ms: 160, gain: 0.2, filter: 'bandpass', f0: 600, f1: 2600, q: 1.5 }); },
        kill() { tone({ type: 'square', f0: 420, f1: 140, ms: 120, gain: 0.1 }); noise({ ms: 180, gain: 0.22, filter: 'lowpass', f0: 2400, f1: 200 }); },
        coin() { const f = vary(NOTE(83), 15); tone({ type: 'sine', f0: f, ms: 70, gain: 0.16 }); tone({ type: 'sine', f0: f * 1.335, ms: 260, gain: 0.16, at: 0.07 }); },
        gold() { for (let i = 0; i < 3; i++) tone({ type: 'sine', f0: NOTE(84 + i * 4), ms: 160, gain: 0.12, at: i * 0.045 }); },
        combo(count = 1) { tone({ type: 'triangle', f0: 500 * Math.pow(2, Math.min(30, count) / 24), ms: 60, gain: 0.14 }); },
        drop() { tone({ type: 'triangle', f0: vary(660, 80), f1: 520, ms: 90, gain: 0.12 }); },
        rare() { [0, 4, 7, 12].forEach((n, i) => tone({ type: 'sine', f0: NOTE(79 + n), ms: 220, gain: 0.14, at: i * 0.07 })); noise({ ms: 300, gain: 0.05, filter: 'highpass', f0: 6000 }); },
        legendary() { [0, 4, 7, 12, 16, 19].forEach((n, i) => tone({ type: 'triangle', f0: NOTE(72 + n), ms: 420, gain: 0.14, at: i * 0.08 })); tone({ type: 'sine', f0: NOTE(96), ms: 900, gain: 0.08, at: 0.5 }); },
        gem() { [0, 7, 12].forEach((n, i) => tone({ type: 'sine', f0: NOTE(88 + n), ms: 200, gain: 0.12, at: i * 0.06 })); },
        levelUp() { [0, 4, 7, 12].forEach((n, i) => tone({ type: 'triangle', f0: NOTE(72 + n), ms: 380, gain: 0.18, at: i * 0.11 })); tone({ type: 'sine', f0: NOTE(84), ms: 700, gain: 0.1, at: 0.33 }); },
        unlock() { [0, 5, 9, 12, 16].forEach((n, i) => tone({ type: 'triangle', f0: NOTE(67 + n), ms: 420, gain: 0.16, at: i * 0.1 })); noise({ ms: 500, gain: 0.05, filter: 'highpass', f0: 5000, at: 0.3 }); },
        achievement() { [0, 7, 12, 19].forEach((n, i) => tone({ type: 'square', f0: NOTE(72 + n), ms: 200, gain: 0.06, at: i * 0.09 })); SOUNDS.gold(); },
        boss() { tone({ type: 'sine', f0: 72, f1: 38, ms: 1400, gain: 0.7, attack: 0.02 }); tone({ type: 'sawtooth', f0: 110, f1: 55, ms: 700, gain: 0.08 }); noise({ ms: 900, gain: 0.25, filter: 'lowpass', f0: 500, f1: 80 }); },
        victory() { [0, 4, 7, 12, 7, 12].forEach((n, i) => tone({ type: 'square', f0: NOTE(72 + n), ms: 220, gain: 0.07, at: i * 0.09 })); [0, 4, 7, 12].forEach((n, i) => tone({ type: 'triangle', f0: NOTE(60 + n), ms: 800, gain: 0.12, at: 0.5 + i * 0.02 })); },
        defeat() { tone({ type: 'triangle', f0: NOTE(64), f1: NOTE(57), ms: 500, gain: 0.2 }); tone({ type: 'triangle', f0: NOTE(60), f1: NOTE(52), ms: 900, gain: 0.2, at: 0.25 }); noise({ ms: 600, gain: 0.1, filter: 'lowpass', f0: 600, f1: 120 }); },
        chest() { noise({ ms: 260, gain: 0.2, filter: 'bandpass', f0: 300, f1: 1400, q: 3 }); [0, 4, 7, 12, 16].forEach((n, i) => tone({ type: 'sine', f0: NOTE(76 + n), ms: 260, gain: 0.13, at: 0.3 + i * 0.07 })); },
        prestige() { tone({ type: 'sawtooth', f0: 110, f1: 1760, ms: 900, gain: 0.08, curve: 'exp' }); [0, 4, 7, 11, 14].forEach((n, i) => tone({ type: 'triangle', f0: NOTE(60 + n), ms: 1400, gain: 0.12, at: 0.8 + i * 0.03 })); noise({ ms: 1200, gain: 0.08, filter: 'highpass', f0: 4000, at: 0.8 }); },
        pet() { [0, 3, 7, 10, 12].forEach((n, i) => tone({ type: 'sine', f0: NOTE(84 + n), ms: 160, gain: 0.12, at: i * 0.06 })); },
        error() { tone({ type: 'square', f0: 160, f1: 120, ms: 160, gain: 0.08 }); },
        equip() { noise({ ms: 90, gain: 0.2, filter: 'bandpass', f0: 1800, f1: 900, q: 1.5 }); tone({ type: 'triangle', f0: 700, f1: 420, ms: 110, gain: 0.12 }); },
        craft() { noise({ ms: 70, gain: 0.3, filter: 'highpass', f0: 2500 }); tone({ type: 'sine', f0: vary(2400, 100), f1: 1700, ms: 140, gain: 0.14 }); },
        buy() { SOUNDS.coin(); noise({ ms: 60, gain: 0.1, filter: 'bandpass', f0: 1200, q: 2, at: 0.08 }); }
    };

    /** Vibration patterns (ms) for phones; nothing on devices without a motor. */
    const HAPTICS = { hit: 8, crit: 22, hurt: 14, kill: [12, 30, 12], levelUp: [20, 40, 20, 40, 30], unlock: [20, 40, 30], boss: [40, 60, 40], legendary: [15, 30, 15, 30, 40], chest: [10, 40, 20], victory: [20, 40, 20], prestige: [30, 50, 30, 50, 60] };

    return {
        unlock,
        /** Play a named sound (and buzz, where there is a pattern for it). Unknown names are ignored. */
        play(name, arg) {
            const fn = SOUNDS[name];
            if (!fn || !allowed()) return;
            master.gain.value = MASTER_VOLUME * Math.max(0, Math.min(1, volume()));   // the Settings slider
            try { fn(arg); } catch { /* an odd browser state is not worth a crash */ }
            const pattern = HAPTICS[name];
            if (pattern && navigator.vibrate && window.matchMedia?.('(hover: none)').matches) { try { navigator.vibrate(pattern); } catch { /* not supported */ } }
        },
        names: Object.keys(SOUNDS)
    };
}

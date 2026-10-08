// The wiki's little script: the search box (over search.json, every page's title, section and other names),
// the side menu on a phone, and tables sorted by a click on a column's title.

(() => {
    // ---------- the menu on a phone ----------
    const menu = document.querySelector('.menu-btn');
    const setNav = open => {
        document.body.classList.toggle('nav-open', open);
        menu?.setAttribute('aria-expanded', String(open));
    };
    menu?.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    document.addEventListener('click', e => {
        if (document.body.classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('.menu-btn')) setNav(false);
    });
    // keep the current page in sight in the menu
    document.querySelector('.side a[aria-current="page"]')?.scrollIntoView({ block: 'center' });

    // ---------- search ----------
    const input = document.getElementById('q');
    const box = document.getElementById('results');
    let index = null;
    let loading = null;
    let picked = -1;
    const load = () => (loading ||= fetch('/search.json').then(r => r.json()).then(data => { index = data.map(p => ({ ...p, lt: p.t.toLowerCase() })); }).catch(() => { index = []; }));
    const escape = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function score(p, words, q) {
        if (p.lt === q) return 1000;
        let s = 0;
        if (p.lt.startsWith(q)) s += 400;
        else if (p.lt.includes(q)) s += 250;
        for (const w of words) {
            if (p.lt.split(/[\s'’-]+/).some(t => t.startsWith(w))) s += 60;
            else if (p.lt.includes(w)) s += 30;
            else if (p.k.includes(w)) s += 20;
            else if (p.s.toLowerCase().includes(w)) s += 5;
            else return 0;   // every word must be found somewhere
        }
        return s - p.t.length * 0.5;   // shorter titles first among equals
    }

    function show() {
        const q = input.value.trim().toLowerCase();
        if (!q || !index) { box.hidden = true; return; }
        const words = q.split(/\s+/).filter(Boolean);
        const found = index.map(p => [score(p, words, q), p]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, p]) => p);
        picked = found.length ? 0 : -1;
        box.innerHTML = found.length
            ? found.map((p, i) => `<a href="${p.u}" role="option"${i === 0 ? ' class="on"' : ''}><span class="r-pic">${p.p ? `<i class="spr" style="${p.p};--k:1"></i>` : ''}</span><span>${escape(p.t)}</span><span class="r-sec">${escape(p.s)}</span></a>`).join('')
            : '<div class="r-none">Nothing found. Try another word.</div>';
        box.hidden = false;
    }
    function move(step) {
        const links = [...box.querySelectorAll('a')];
        if (!links.length) return;
        picked = (picked + step + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle('on', i === picked));
        links[picked].scrollIntoView({ block: 'nearest' });
    }
    input?.addEventListener('focus', () => { load(); });
    input?.addEventListener('input', () => { load().then(show); });
    input?.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { const a = box.querySelectorAll('a')[Math.max(0, picked)]; if (a) location.href = a.getAttribute('href'); }
        else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) box.hidden = true; });
    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== input && !/input|textarea/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); input?.focus(); }
        if (e.key === 'Escape') setNav(false);
    });

    // ---------- sortable tables ----------
    const cellValue = td => {
        const text = td.textContent.replace(/[,\s]/g, '').replace(/^[+×x]/, '');
        const m = /^(-?\d+(?:\.\d+)?)(K|M|B|T|Q|%|s|min|h)?/.exec(text);
        if (!m) return null;
        const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Q: 1e15, min: 60, h: 3600 }[m[2]] || 1;
        return Number(m[1]) * mult;
    };
    for (const table of document.querySelectorAll('table.sortable')) {
        const heads = [...table.querySelectorAll('thead th')];
        heads.forEach((th, col) => th.addEventListener('click', () => {
            const body = table.tBodies[0];
            const rows = [...body.rows];
            const dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
            heads.forEach(h => h.removeAttribute('aria-sort'));
            th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
            const key = r => { const td = r.cells[col]; return td ? [cellValue(td), td.textContent.trim().toLowerCase()] : [null, '']; };
            rows.sort((a, b) => {
                const [na, ta] = key(a);
                const [nb, tb] = key(b);
                if (na !== null && nb !== null) return (na - nb) * dir;
                return ta.localeCompare(tb) * dir;
            });
            for (const r of rows) body.appendChild(r);
        }));
    }
})();

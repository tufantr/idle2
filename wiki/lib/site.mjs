// The wiki as a set of pages: each registered once (its path, title, section and picture), then given its
// body; the layout every page shares (the top bar with search, the side navigation, the footer); the
// search index; and the checks run on the finished site (every link lands on a page, no page shows
// "undefined" or "NaN").

import { esc, icon, spriteStyle, hero } from './ui.mjs';
import { slugify } from './md.mjs';

export function createSite({ name = 'Fantasy Idle Wiki', gameUrl, siteUrl = '', version = '', builtAt = '' }) {
    const pages = new Map();     // path -> page
    const titles = new Map();    // lowercased title or alias -> path
    const problems = [];

    /** Register a page: { path, title, section, icon, summary, keywords, aliases, art, focus }. */
    function add(page) {
        if (pages.has(page.path)) throw new Error(`Two pages at ${page.path}`);
        const p = { keywords: [], aliases: [], body: '', infobox: '', navbox: '', toc: true, ...page };
        pages.set(p.path, p);
        for (const t of [p.title, ...p.aliases]) {
            const key = t.toLowerCase();
            if (!titles.has(key)) titles.set(key, p.path);
        }
        return p;
    }

    /** The path a [[link]] target names: a path ("/items/coal", "/combat#bosses") or a page title or alias. */
    function resolve(target) {
        const [base, hash] = target.split('#');
        if (base.startsWith('/')) return pages.has(base) ? target : null;
        const found = titles.get(base.toLowerCase());
        return found ? `${found}${hash ? `#${hash}` : ''}` : null;
    }

    /** An anchor for a [[link]] (the page's own title when no text is given). */
    function link(target, text, where) {
        const href = resolve(target);
        if (!href) {
            problems.push(`${where}: no page for [[${target}]]`);
            return esc(text || target);
        }
        const page = pages.get(href.split('#')[0]);
        return `<a href="${href}">${text || esc(page.title)}</a>`;
    }

    /** The table of contents: the page's h2 headings, when there are enough to need one. */
    function contents(body) {
        const heads = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(m => [m[1], m[2].replace(/<[^>]+>/g, '').trim()]);
        if (heads.length < 4) return '';
        return `<nav class="toc" aria-label="Contents"><div class="toc-title">Contents</div><ol>${heads.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol></nav>`;
    }

    /** The contents box after the page's opening paragraph (or first, when it opens with something else). */
    function withContents(body, toc) {
        if (!toc) return body;
        const trimmed = body.trimStart();
        const end = trimmed.indexOf('</p>');
        return trimmed.startsWith('<p') && end > 0 ? `${trimmed.slice(0, end + 4)}\n${toc}${trimmed.slice(end + 4)}` : `${toc}${body}`;
    }

    /** The whole HTML of a page, in the shared layout. `nav` is the side navigation's groups. */
    function render(page, nav, assetsVersion) {
        const crumbs = page.path === '/' ? '' : `<div class="crumbs"><a href="/">Wiki</a>${page.section && page.sectionPath && page.sectionPath !== page.path ? ` <span>›</span> <a href="${page.sectionPath}">${esc(page.section)}</a>` : ''}</div>`;
        const banner = page.art ? `<div class="banner" style="--art:url(/assets/paint/${page.art}.webp);--art-at:${page.focus || 'center 60%'}" aria-hidden="true"></div>` : '';
        const titleIcon = page.icon ? `<span class="h1-icon">${icon(page.icon, 1.5)}</span>` : '';
        const toc = page.toc ? contents(page.body) : '';
        const side = nav.map(g => `<div class="nav-group"><div class="nav-title">${esc(g.title)}</div>${g.links.map(l => `<a href="${l.path}"${l.path === page.path ? ' aria-current="page"' : ''}>${l.icon ? icon(l.icon, 0.75, 'soft') : '<i class="nav-dot"></i>'}<span>${esc(l.title)}</span></a>`).join('')}</div>`).join('');
        const description = esc(page.summary || `${page.title}: the Fantasy Idle wiki.`);
        return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.path === '/' ? esc(name) : `${esc(page.title)} · ${esc(name)}`}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(name)}">
${siteUrl ? `<meta property="og:url" content="${siteUrl}${page.path === '/' ? '' : page.path}">
<meta property="og:image" content="${siteUrl}/assets/icons/icon-512.png">
<link rel="canonical" href="${siteUrl}${page.path === '/' ? '' : page.path}">` : ''}
<meta name="theme-color" content="#0d0a07">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/icon-32.png">
<link rel="apple-touch-icon" href="/assets/icons/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/wiki.css?v=${assetsVersion}">
<script defer src="/wiki.js?v=${assetsVersion}"></script>
</head>
<body>
<header class="top">
    <button class="menu-btn" type="button" aria-label="Open the menu" aria-expanded="false" aria-controls="side"><i></i><i></i><i></i></button>
    <a class="brand" href="/">${hero(1)}<span class="brand-text">Fantasy Idle <b>Wiki</b></span></a>
    <div class="search" role="search">
        <input id="q" type="search" placeholder="Search the wiki" autocomplete="off" spellcheck="false" aria-label="Search the wiki" aria-controls="results">
        <div id="results" class="results" role="listbox" hidden></div>
    </div>
    <a class="play" href="${gameUrl}" rel="noopener">Play</a>
</header>
<div class="shell">
    <nav id="side" class="side" aria-label="Wiki">${side}</nav>
    <main class="page" id="main">
        ${crumbs}
        ${banner}
        <h1>${titleIcon}<span>${esc(page.title)}</span></h1>
        ${page.lead ? `<p class="lead">${page.lead}</p>` : ''}
        ${page.infobox || ''}
        <div class="content">${withContents(page.body, toc)}</div>
        ${page.navbox || ''}
    </main>
</div>
<footer class="foot">
    <p>Everything here is read from the game's own data${version ? ` (version <code>${esc(version)}</code>` : ''}${builtAt ? `, ${esc(builtAt)})` : version ? ')' : ''}, so the numbers are the game's numbers.</p>
    <p><a href="${gameUrl}" rel="noopener">Play Fantasy Idle</a> · <a href="/credits">Credits</a></p>
</footer>
</body>
</html>
`;
    }

    /** One entry per page for the search box: title, path, section, keywords and the picture's atlas cell. */
    function searchIndex() {
        return [...pages.values()].filter(p => !p.hidden).map(p => ({
            t: p.title,
            u: p.path,
            s: p.section || '',
            k: [...p.aliases, ...p.keywords].join(' ').toLowerCase(),
            p: p.icon ? spriteStyle(p.icon) || '' : ''
        }));
    }

    /** Every internal link in the built pages must land on a page (and its #anchor on an id there). */
    function checkLinks(html) {
        const ids = new Map();
        for (const [p, h] of html) {
            const all = [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
            ids.set(p, new Set(all));
            const twice = all.filter((id, i) => all.indexOf(id) !== i);
            if (twice.length) problems.push(`${p}: two elements with the id ${[...new Set(twice)].join(', ')}`);
        }
        for (const [from, h] of html) {
            for (const m of h.matchAll(/href="(\/[^"]*)"/g)) {
                const url = m[1];
                if (/^\/(assets|wiki\.(css|js)|search\.json)/.test(url)) continue;
                const [p, hash] = url.split('#');
                const target = p || from;
                if (!html.has(target)) { problems.push(`${from}: link to missing page ${url}`); continue; }
                if (hash && !ids.get(target).has(hash)) problems.push(`${from}: link to missing anchor ${url}`);
            }
            if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(h.replace(/<script[\s\S]*?<\/script>/g, ''))) problems.push(`${from}: shows undefined, NaN or [object Object]`);
        }
    }

    return { add, resolve, link, render, searchIndex, checkLinks, problems, pages, slugify };
}

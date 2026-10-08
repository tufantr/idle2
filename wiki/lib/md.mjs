// A small Markdown for the wiki's written pages (wiki/content/*.md), with two additions:
//   [[Page title]] or [[/path|text]]  a link to another page of the wiki (checked when the site is built)
//   {{ expression }}                  JavaScript evaluated against the build's scope (wiki/lib/scope.mjs):
//                                     the game's numbers and the wiki's helpers, so a page never states a
//                                     number the game no longer has
// Front matter between --- lines at the top: title, path, section, icon, art, focus, summary, keywords.
// Supported: # to #### headings, paragraphs, - and 1. lists (one level, a two-space indent nests one
// more), | tables |, > callouts ("> Tip: ..."), `code`, **bold**, *em*, [text](url), and lines of raw
// HTML (a line starting with <).

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Split front matter from the body: { meta, body }. */
export function frontMatter(text) {
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (!m) return { meta: {}, body: text };
    const meta = {};
    for (const line of m[1].split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { meta, body: text.slice(m[0].length) };
}

/**
 * Render Markdown to HTML. `ctx.evaluate(expr, where)` runs a {{ }} expression; `ctx.link(target, text,
 * where)` turns a [[ ]] link into an anchor (and records it for the link check). `where` names the file.
 */
export function renderMarkdown(text, ctx, where = 'markdown') {
    // {{ }} first: an expression may return Markdown-free HTML (an icon, a table), kept as is.
    const holes = [];
    const hole = html => `\u0000${holes.push(html) - 1}\u0000`;
    text = text.replace(/\{\{([\s\S]+?)\}\}/g, (_, expr) => hole(String(ctx.evaluate(expr.trim(), where))));

    const inline = s => {
        const codes = [];
        s = s.replace(/`([^`]+)`/g, (_, c) => `\u0001${codes.push(`<code>${esc(c)}</code>`) - 1}\u0001`);
        s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => hole(ctx.link(target.trim(), label?.trim(), where)));
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => hole(`<a href="${esc(url)}"${/^https?:/.test(url) ? ' rel="noopener"' : ''}>${label}</a>`));
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
        s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
        return s.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[i]);
    };

    const lines = text.split('\n');
    const out = [];
    let i = 0;
    const isTableLine = l => /^\s*\|.*\|\s*$/.test(l);
    const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }
        const h = /^(#{1,4})\s+(.*)$/.exec(line);
        if (h) {
            const level = Math.max(2, h[1].length);   // the page title is the only h1
            const id = slugify(h[2].replace(/<[^>]+>|\u0000\d+\u0000/g, ''));
            out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
            i++;
            continue;
        }
        if (/^\s*</.test(line) || /^\u0000\d+\u0000\s*$/.test(line)) {   // raw HTML, or a {{ }} on a line of its own
            out.push(line);
            i++;
            continue;
        }
        if (isTableLine(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
            const head = cells(line);
            const align = cells(lines[i + 1]).map(c => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : ''));
            i += 2;
            const rows = [];
            while (i < lines.length && isTableLine(lines[i])) rows.push(cells(lines[i++]));
            const td = (tag, c, k) => `<${tag}${align[k] ? ` class="${align[k] === 'right' ? 'num' : 'mid'}"` : ''}>${inline(c)}</${tag}>`;
            out.push(`<div class="table-wrap"><table class="wt"><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => td('td', c, k)).join('')}</tr>`).join('')}</tbody></table></div>`);
            continue;
        }
        if (/^>\s?/.test(line)) {
            const quote = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
            const body = quote.join(' ');
            const kind = /^(tip|note|warning)\s*:/i.exec(body);
            out.push(`<aside class="callout ${kind ? kind[1].toLowerCase() : 'note'}">${inline(kind ? `**${kind[1][0].toUpperCase()}${kind[1].slice(1).toLowerCase()}:**${body.slice(kind[0].length)}` : body)}</aside>`);
            continue;
        }
        const listItem = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
        if (listItem.test(line)) {
            const ordered = /^\s*\d+\./.test(line);
            const items = [];
            while (i < lines.length && listItem.test(lines[i])) {
                const [, indent, , content] = listItem.exec(lines[i]);
                let item = content;
                i++;
                while (i < lines.length && lines[i].trim() && !listItem.test(lines[i]) && /^\s+/.test(lines[i])) item += ` ${lines[i++].trim()}`;
                if (indent.length >= 2 && items.length) items[items.length - 1].sub.push(item);
                else items.push({ text: item, sub: [] });
            }
            const tag = ordered ? 'ol' : 'ul';
            out.push(`<${tag}>${items.map(it => `<li>${inline(it.text)}${it.sub.length ? `<ul>${it.sub.map(s => `<li>${inline(s)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</${tag}>`);
            continue;
        }
        const para = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s/.test(lines[i]) && !listItem.test(lines[i]) && !/^>\s?/.test(lines[i]) && !(isTableLine(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) && !/^\s*</.test(lines[i])) para.push(lines[i++].trim());
        out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    return out.join('\n').replace(/\u0000(\d+)\u0000/g, (_, n) => holes[n]);
}

/** A URL-safe id from a title: "Dragon's Lair" -> "dragons-lair". */
export function slugify(text) {
    return String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

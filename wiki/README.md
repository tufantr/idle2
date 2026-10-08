# The Fantasy Idle wiki

A static site built from the game's own data, deployed as its own Vercel project (`fantasy-idle-wiki`,
https://fantasy-idle-wiki.vercel.app). Every table, number and picture comes from `src/`, so the wiki
changes when the game does: rebuild and redeploy.

```bash
node wiki/build.mjs                # builds into wiki/dist (git-ignored); fails on a broken link or a bad number
node wiki/build.mjs --serve        # builds, then serves it at http://localhost:8010 (clean URLs, as on Vercel)
```

Deploying is in the repository's README.md ("The wiki").

## How it is made

- `build.mjs` registers every page, renders the written pages, asks each page builder for its body, writes
  the site and copies the game's pictures (`assets/sprites.png`, `assets/paint/`, `assets/icons/`).
- `pages/*.mjs` are the page builders: each lists its pages (path, title, section, picture) and makes their
  tables, infoboxes and cross-links from the data. `pages/nav.mjs` is the side navigation.
- `content/**/*.md` are the written pages: the explanations. A file whose `path` matches a built page is
  that page's text (it comes first, the builder's tables after it); any other file is a page of its own
  (the guides, the FAQ).
- `lib/md.mjs` (Markdown), `lib/ui.mjs` (sprites, numbers, tables, infoboxes), `lib/site.mjs` (layout,
  search index, link check), `lib/scope.mjs` (what a `{{ }}` can use).
- `static/` is copied as is: `wiki.css`, `wiki.js` (search, the phone menu, sortable tables), `vercel.json`.

## Writing a page

```markdown
---
path: /guides/getting-started
title: Getting started
section: Guides
icon: item/Weapon/3
order: 10
summary: One line for search engines and link previews.
keywords: beginner, new player, first hour
---
Text. Headings start at ##.

## A heading
- Lists, **bold**, *italic*, `code`, [an outside link](https://example.com), and [[Coal]] or
  [[/skills/mining|Mining]] for a page of the wiki (checked: a link to no page stops the build).
- Numbers from the game: {{BALANCE.combat.bossTimeMs / 1000}} seconds, {{pct(BASE.focusSkillSpeed)}},
  {{res('coal')}} (an icon and a link), {{time(BASE.focusAfterMs)}}.

> Tip: a callout (Tip, Note or Warning).

| A table | Level # |
| --- | ---: |
| Copper Vein | 1 |
```

Front matter: `path` (required), `title`, `section` and `sectionPath` (the breadcrumb), `icon` (a sprite
key from `src/data/sprites.js`, e.g. `res/coal`, `mon/Slime`, `item/Weapon/3`), `art` (a painting in
`assets/paint/`, shown as the page's banner), `order` (guides: their place in the menu), `summary`,
`keywords`, `aliases` (other names search should find).

### House style

- Written for players: "you" and "your hero", plain words, short sentences. Say what something does and
  what to do about it; no development history, no file names, no "the owner".
- Every number the game has comes from the game with `{{ }}`, never typed in, so it cannot go stale.
- Check every claim against the code in `src/` (the code is the truth; `docs/DESIGN.md` explains why).
- Link the first mention of a thing that has a page. Don't repeat a table the page's builder already makes.

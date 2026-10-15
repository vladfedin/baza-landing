# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Ролебаза (Rolebaza)** — the public landing of a Russian-language virtual
tabletop. Served at `rolebaza.ru`; the app itself lives at `beta.rolebaza.ru`
(repository `../magicorp-vtt`, its `docs/landing-system-guide.md` §0 describes
how the two talk).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) on push:

- **`dev` is production** (`rolebaza.ru`, `/opt/rolebaza-landing`). `main`
  targets the host of a retired prod — nothing pushed there arrives anywhere.
- Steps: `tools/check-static-links.mjs` (every local link must hit a file in
  `www/`) → `tools/version-assets.mjs` (adds `?v=<md5>` to every local asset
  reference of the root pages and to `url()` in `www/css/`) → `rsync --delete
  www/` → permissions.
- `rsync --delete` erases anything not in `www/`: every static page of the main
  domain (contests, guides, legal pages) lives here, never only on the server.
- nginx answers a missing path with `index.html` and **200**, so a lost page
  looks like the landing instead of a 404 — that is what the link check is for.
- nginx caches css/js for 7 days and clips/images for 30 days as `immutable`:
  an asset path the versioning step cannot see is served stale after a deploy.

There is no build: what is in `www/` is what is served.

## Layout of `www/`

- `index.html` — the landing. Inline `<head>` script only for the no-flash theme.
- `css/styles.css` — all landing styles; theme tokens at the top
  (`:root` = Blackout/dark, `:root[data-theme="parchment"]` = light),
  `@font-face` for the self-hosted fonts in `fonts/`.
- `js/` — one IIFE / DOMContentLoaded module per behaviour: `hero-video`,
  `scroll-paging`, `dice` (+ `roll-card`), `arsenal-video`, `speech-bubble`,
  `reading-ruler`, `party`, `music-player`, `theme-toggle`, `live`, `marks`,
  `consent`. `marks.js` mirrors the app's account marks (order, look, shapes)
  to draw a person as the table does — change it when the app's marks change.
- `img/` (avif art, `icons.svg` sprite, `founders/`), `vid/` (AV1 + HEVC per
  clip), `sfx/` (Opus + AAC), `vendor/` (three.js, cannon.js — loaded after the
  page, see `js/dice.js`).
- Legal pages (`privacy.html`, `consent.html`, …) still use the previous
  landing's `styles.css`; `tutorials-contest/`, `tables-contest/`, `guides/` are
  self-contained archives.

## Conventions

- **Asset paths live in markup.** The checker and the versioner read the same
  attribute list (`tools/asset-refs.mjs`: `href`, `src`, `poster`, `data-av1`,
  `data-hevc`, `data-avatar`, `data-three`, `data-cannon`). A path built in JS
  is neither checked nor versioned — put it in an attribute and read it.
  New file attribute → add it to that list.
- Swapping a sprite icon changes only the part after `#` (the path carries `?v=`).
- **No third-party requests on page load.** Fonts and libraries are ours; the
  only outside call is Yandex.Metrika, and only after consent (`js/consent.js`).
- Data from the app (`js/live.js`): public GET endpoints only, user text via
  `textContent`, images only from the app's own origin.
- Links into the app carry `utm_source=rolebaza.ru&utm_medium=landing` and a
  `data-goal` (Metrika goal on click).
- All user-facing text is Russian; claims about the product must match what
  it ships (limits, levels, features) — check the app before writing numbers.
- Respect `prefers-reduced-motion`; transitions default to 160 ms.

## Local preview

```
node tools/preview.mjs        # http://127.0.0.1:8790/
node tools/check-static-links.mjs
```

The preview serves `www/` with Range responses (clips), falls back to
`index.html` like nginx, and forwards `GET /api/*` to the app — the app's CORS
admits only `*.rolebaza.ru`, so `js/live.js` asks same-origin on localhost.
Do not run `tools/version-assets.mjs` on the working tree: it rewrites files
in place and is meant for the CI checkout.

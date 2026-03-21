# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Ролебаза (Rolebaza)** — landing page for a Russian-language virtual tabletop RPG platform. Deployed at `land.rolebaza.ru` with a production mirror at `rolebaza.ru`.

## Tech Stack

Pure static site — no build system, no bundler, no package manager.

- **HTML5** (`www/index.html`) — single-page, Russian-language content
- **CSS3** (`www/styles.css`) — custom CSS with CSS variables for theming, no preprocessor
- **Vanilla JS** (`www/main.js`) — IIFE-module pattern, no frameworks
- **Tailwind CSS** — loaded via CDN bundle (`www/vendor/`), not built locally
- **Service Worker** (`www/sw.js`) — image fallback between `rolebaza.ru` ↔ `land.rolebaza.ru`

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) triggers on push to `main` (prod) or `dev` branches:
- Cache-busting via MD5 hashes appended to CSS/JS/SW filenames
- Deploys via `rsync` over SSH to `/opt/rolebaza-landing/`
- Nginx config lives in `devops/nginx.land.rolebaza.ru.conf`

There are no build or test commands — changes are deployed by pushing to the appropriate branch.

## Architecture

All site code lives in `www/`:

**styles.css** — Dark fantasy theme with gold accents. Design tokens defined as CSS custom properties at `:root`. Key component classes: `.btn-engraved`, `.guild-column`, `.parchment-card`, `.master-card`, `.founder-medallion`, `.side-vignette`. Custom keyframe animations for torch flicker, floating logo, scroll bounce, and founder page transitions.

**main.js** — Five IIFE modules:
1. Header scroll effect (class toggle at 60px)
2. Fade-in on scroll via Intersection Observer
3. Waitlist counter — fetches from `https://beta.rolebaza.ru/api/landing/waitlist/count`, animates count, exponential backoff retry
4. Founder section toggle — interactive portrait switching, persists selection in cookies + localStorage
5. Waitlist form — POST to `/api/landing/waitlist`, updates counter on success

**sw.js** — Intercepts image requests and falls back between mirror domains with a 3-second timeout. Returns a transparent 1x1 GIF if both fail.

## Conventions

- All user-facing text is in Russian
- IIFE pattern for JS module isolation (no global namespace pollution)
- Fonts: Cinzel (headings), Cormorant Garamond (body serif), Fira Sans (UI text)
- Responsive design via CSS media queries
- Storage: cookies with root domain fallback + localStorage for persistence

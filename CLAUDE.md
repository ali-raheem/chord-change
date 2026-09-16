# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

No dependencies, no install step, no build step. Requires Node.js 20+.

```sh
npm start                          # static dev server on http://localhost:5173 (PORT env var overrides)
npm test                           # node --test, runs *.test.js
node --test --test-name-pattern="timer advances" practice.test.js   # single test
```

There is no linter or formatter configured.

## Architecture

A vanilla-JS, zero-dependency progressive web app for practicing guitar chord changes. Everything ships as static files; `server.js` exists only for local development and is not used in production.

**Split between pure logic and DOM code is deliberate and is the only thing the tests rely on:**

- `practice.js` is pure, browser-free, and unit-tested. It exports the `CHORDS` table (each chord: `frets`/`fingers` arrays indexed low E to high e, `-1` = muted, optional `barre` fret), `makePairs()` (every unordered pair once, Fisher-Yates shuffled, injectable `random` for tests), `formatTime()`, and `sessionPosition()`.
- `app.js` owns all DOM and session state. It imports from `practice.js` and never re-implements pairing or timing math. Add new logic to `practice.js` if it can be tested without a DOM.

**Timer model:** the session is driven by wall-clock time, not by counting ticks. `app.js` keeps `elapsed` (ms accumulated before the last pause) plus `startedAt` (`Date.now()` at resume), and every 100ms `tick()` calls `sessionPosition(elapsed + Date.now() - startedAt, duration, pairs.length)` to derive the current pair index, remaining time, and progress. This is why a throttled background tab catches up to the right pair instead of drifting. Skip sets `elapsed = index * duration * 1000` so the derived position stays consistent. Preserve this model when touching timing.

**State machine:** `state` is one of `ready | running | paused | complete`. `renderState()` is the single place that maps state to button labels, copy, and disabled controls. `configure()` rebuilds pairs and resets the session and is a no-op while running or paused, so settings are effectively locked during practice. Settings (`chords`, `duration`) persist in `localStorage` under `chordchange-settings`.

**PWA layer** (`pwa.js`, `sw.js`, `manifest.webmanifest`): `pwa.js` handles the install prompt and registers the worker with `updateViaCache: 'none'`. `sw.js` precaches the explicit `APP_FILES` list, only intercepts GETs for those exact paths, and intentionally does *not* call `skipWaiting`, so a new version activates only after all app windows close. All asset URLs are relative (`./`) so the app works at the domain root or in a subdirectory like `/cc/`.

## Adding or changing files

Three lists must stay in sync when a shipped file is added, removed, or renamed:

1. `allowed` set in `server.js`
2. `APP_FILES` in `sw.js`
3. The file list in `README.md` (Run section)

When any cached file changes, bump `CACHE_VERSION` in `sw.js`. When `styles.css` changes, also bump the `?v=` query on the stylesheet link in `index.html` (currently kept equal to the cache version).

## Deployment

Production is static files served by Nginx at https://shoryuken.me/cc/ behind Cloudflare. See the "Current production deployment" section of `README.md` for server details, backup location, and the checklist (back up, bump cache version, upload a complete release including `icons/`, `nginx -t`, verify in Chrome). Cloudflare returns 403 to plain scripted HTTP probes, so verify the public site with a real browser.

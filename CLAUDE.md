# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

No dependencies and no install step. Requires Node.js 20+. The only build is `npm run release`, which copies the shipped files into `dist/` and stamps `version.js`.

```sh
npm start                          # static dev server on http://localhost:5173 (PORT env var overrides)
npm test                           # node --test, runs *.test.js
npm run release                    # build dist/ with commit + UTC time stamped into version.js
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

**PWA layer** (`pwa.js`, `sw.js`, `manifest.webmanifest`): `pwa.js` handles the install prompt, registers the worker with `updateViaCache: 'none'`, requests persistent storage, and renders the footer version line from `version.js`. The committed `version.js` is a `dev` placeholder; only `dist/version.js` carries a real stamp. `sw.js` precaches the explicit `APP_FILES` list, only intercepts GETs for those exact paths, and intentionally does *not* call `skipWaiting`, so a new version activates only after all app windows close. All asset URLs are relative (`./`) so the app works at the domain root or in a subdirectory like `/cc/`. The manifest `id` is the exception: Chrome resolves it against the origin, not the manifest URL, so it is the fixed `/chordchange`. Never set it to `./` (that resolves to the site root and collides with other apps on the origin), and never change it casually, because a new ID orphans existing installs.

## Adding or changing files

Two lists must stay in sync when a shipped file is added, removed, or renamed:

1. `SHIPPED_FILES` in `shipped-files.js`, which drives both the dev server and `npm run release`
2. `APP_FILES` in `sw.js`

The service worker cannot import that module, so its list is maintained by hand. The bare `/cc` path (no trailing slash) is outside the worker's scope and cannot load offline.

When any cached file changes, bump `CACHE_VERSION` in `sw.js`. When `styles.css` changes, also bump the `?v=` query on the stylesheet link in `index.html` (currently kept equal to the cache version).

## Deployment

Production is static files served by Nginx at https://shoryuken.me/cc/ behind Cloudflare. Checklist: commit, bump `CACHE_VERSION`, `npm run release`, back up the live `cc/`, upload the contents of `dist/`, `nginx -t` if the config changed, then verify in Chrome that the footer shows the deployed commit. Cloudflare returns 403 to plain scripted HTTP probes, so verify the public site with a real browser.

Server details and history (kept here rather than in the public README):

- URL: https://shoryuken.me/cc/
- Server: `root@185.163.204.17` (`ursula`)
- Static app directory: `/var/www/shoryuken.me/cc`
- Nginx virtual host: `/etc/nginx/sites-enabled/shoryuken.me`
- HTTPS terminates at Nginx with an existing Certbot certificate; public traffic goes through Cloudflare.
- No Node service is used in production. Run `npm run release` from a clean, committed tree and upload the contents of `dist/`, including `icons/`.
- The `/cc/` location uses `Cache-Control: no-cache`, and `/cc/manifest.webmanifest` explicitly uses `application/manifest+json`. The service worker is limited to `/cc/`.

The installable release was deployed on 2026-09-15 (backup of the previous release at `/var/backups/chordchange/20260915T125052Z/`). The keep-awake and click-cue release (cache v4) was deployed on 2026-09-16; the v3 app and Nginx configuration are backed up at `/var/backups/chordchange/20260916T101533Z/` on the server (`cc/` and `shoryuken.me.nginx`). The footer install button release (commit `05be99e`, cache v8) was deployed on 2026-10-04; the previous release (`7333c4f`, cache v7) is backed up at `/var/backups/chordchange/20261004T083734Z/cc`. The server has no `curl`. Upload with `rsync -a --delete --chmod=D755,F644 dist/ root@185.163.204.17:/var/www/shoryuken.me/cc/` (earlier `tar` uploads kept the local uid and 664 modes) and verify from a client machine. The footer stamp on the live page should show the commit you deployed. Future deployments should preserve a backup, bump the service worker cache version, upload a complete release, validate any Nginx configuration changes with `nginx -t`, and verify the public site in Chrome. Cloudflare rejects plain Python HTTP probes with 403 here, so use Chromium for public checks or a TLS-verified origin connection for server-side health checks.

# Chord Change

A focused guitar chord change practice app. Select chords, set the time per pair, and practice every unique pair in a shuffled order. Alternate back and forth between the displayed diagrams until the timer advances.

## Run

Requires Node.js 20 or newer. No dependencies or install step.

```sh
npm start
```

Open http://localhost:5173. Set `PORT` to use another port. The app can also be hosted on any static web server using `index.html`, `styles.css`, `app.js`, `practice.js`, and `favicon.svg`.

## Features

- 17 common guitar chords with finger positions, open/muted strings, and barre diagrams
- Every unique unordered chord pair once per session (both directions practiced within a pair)
- 30, 60, or 90 seconds per pair, or a custom duration from 5 to 600 seconds
- Automatic advancement, pause/resume, skip, end session, and reshuffle
- Queue, session progress, optional sound cues, and completion summary
- Keyboard controls, accessible diagrams, responsive layout, and saved settings
- No network requests, accounts, or external assets

Timer position is calculated from elapsed wall-clock time so delayed browser callbacks catch up to the correct pair. Pausing freezes the session; a background tab continues to count elapsed time. Audible cues depend on browser background audio policies.

## Test

```sh
npm test
```

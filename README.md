# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jay8824188241-afk/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jay8824188241-afk/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Coast** is an offline cover art maker in the style of GTA 6 posters. Load up to three of your own photos, crop and position each one into one, two, three or four panels, pick a Vice City sunset, neon or noir colour grade, write a bold caption under a striped synthwave sun, and export a PNG ready to post at 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything on the poster — panels, sun, lettering — is drawn by the app itself; no game logos, artwork or fonts are used, and your photos never leave your machine.

New in this version: two extra colour grades — **Midnight neon** (deep indigo into electric violet with a cold cyan lift) and **Golden hour** (honey amber into soft rose and warm ember) — a **Hero + two stacked** layout where one tall panel leads and two smaller shots stack beside it, and a full caption toolkit: place the caption at the bottom, the top, or floating over the photo, pick a heavy, tall condensed or outlined caption font, scale the title from 0.7x to 1.4x, add a kicker line above the title, and toggle a drop shadow behind the letters.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Pick photos, tune the panels, and hit Export PNG.

## How it works

- `app/index.html` — the editor: three photo slots, layout and grade buttons, caption fields (kicker, position, font, size, drop shadow), export size.
- `app/src/cover.js` — the cover painter: panel geometry (including the Hero layout), cover-fit photo drawing with zoom and pan, the colour-grade wash (sunset, neon, noir, Midnight neon, Golden hour), the striped sun and the caption band with position, font, size, kicker and shade.
- `app/src/main.js` — wires the controls to the painter and handles PNG export.
- `app/src/shots.js` — fixed scenes behind `?shot=editor` and `?shot=cover`, used for the screenshots; reads caption position, font, size, kicker, shade and per-slot crop from the query.
- `app/samples/` — two AI-made sample photos (free to use) so the first paint already shows a poster.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory, checks every screenshot against the scorer's size caps, prints a run summary, and writes `dossier.json`.

No build step, no network request: every file the page loads lives under `app/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d1n6bjq8&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

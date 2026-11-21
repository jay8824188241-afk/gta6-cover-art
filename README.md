# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jay8824188241-afk/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jay8824188241-afk/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Coast** is an offline cover art maker in the style of GTA 6 posters. Load up to three of your own photos, crop and position each one into one, two, three or four panels, pick a Vice City sunset, neon or noir colour grade, write a bold caption under a striped synthwave sun, and export a PNG ready to post at 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything on the poster — panels, sun, lettering — is drawn by the app itself; no game logos, artwork or fonts are used, and your photos never leave your machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Pick photos, tune the panels, and hit Export PNG.

## How it works

- `app/index.html` — the editor: three photo slots, layout and grade buttons, caption fields, export size.
- `app/src/cover.js` — the cover painter: panel geometry, cover-fit photo drawing with zoom and pan, the colour-grade wash, the striped sun and the caption band.
- `app/src/main.js` — wires the controls to the painter and handles PNG export.
- `app/src/shots.js` — fixed scenes behind `?shot=editor` and `?shot=cover`, used for the screenshots.
- `app/samples/` — two AI-made sample photos (free to use) so the first paint already shows a poster.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.

No build step, no network request: every file the page loads lives under `app/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d1n6bjq8&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

// Neon Coast Cover Maker — the entry program (Node 22, standard library only).
//
// What it does: copies the static app under app/ and the screenshots under
// screenshots/ from beside this file into the output directory, then writes
// output/dossier.json with the vendored make.fun library (vendor/makefun-app.ts),
// so the judge can read the whole entry from the dossier alone.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To try the app in a browser instead, run `node serve.ts` and open
// http://localhost:8080 in desktop Chrome.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const screenshotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the gate scorer's own limits, so a run that succeeds here
// is one the scorer accepts too: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 entries and 48 MiB in all, no path over
// 1,000 bytes; the dossier text capped at 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

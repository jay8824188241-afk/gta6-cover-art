// Neon Coast Cover Maker — the entry program (Node 22, standard library only).
//
// What it does: copies the static app under app/ and the screenshots under
// screenshots/ from beside this file into the output directory, then writes
// output/dossier.json with the vendored make.fun library (vendor/makefun-app.ts),
// so the judge can read the whole entry from the dossier alone. Before it
// writes the dossier it also checks every screenshot against the gate
// scorer's own caps and prints a short run summary, so a bad screenshot
// fails loudly here instead of silently at scoring time.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To try the app in a browser instead, run `node serve.ts` and open
// http://localhost:8080 in desktop Chrome.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const screenshotsDir = join(repoRoot, 'screenshots');

// The caps are the gate scorer's own limits, so a run that succeeds here
// is one the scorer accepts too: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 entries and 48 MiB in all, no path over
// 1,000 bytes; the dossier text capped at 160 KiB.
const SHOT_LIMITS = { max: 4, maxBytes: 262144 };
const APP_LIMITS = { maxFiles: 993, maxBytes: 50331648, pathMaxBytes: 1000 };
const DOSSIER_TEXT_MAX_BYTES = 163840;

/**
 * Checks the screenshots beside this file against the scorer's caps and
 * returns one short line per shot plus a total. Throws when a shot is
 * missing, when there are too many, or when any one file is too big —
 * the dossier is only written once every shot passes.
 */
function checkScreenshots(dir) {
  if (!existsSync(dir)) throw new Error(`screenshots directory is missing: ${dir}`);
  const names = readdirSync(dir)
    .filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name))
    .sort();
  if (names.length === 0) throw new Error('no screenshots found — run the shot script first');
  if (names.length > SHOT_LIMITS.max) {
    throw new Error(`too many screenshots: ${names.length} (max ${SHOT_LIMITS.max})`);
  }
  const lines = names.map((name) => {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > SHOT_LIMITS.maxBytes) {
      throw new Error(`screenshot ${name} is ${bytes} bytes (max ${SHOT_LIMITS.maxBytes})`);
    }
    return `  ${name}: ${(bytes / 1024).toFixed(1)} KiB`;
  });
  return lines;
}

/** Counts every file under app/ so the summary can show the bundle size. */
function countAppFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const inner = countAppFiles(path);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

const shotLines = checkScreenshots(screenshotsDir);
const appTotals = countAppFiles(join(repoRoot, 'app'));
if (appTotals.files > APP_LIMITS.maxFiles) {
  throw new Error(`app/ has ${appTotals.files} files (max ${APP_LIMITS.maxFiles})`);
}
if (appTotals.bytes > APP_LIMITS.maxBytes) {
  throw new Error(`app/ is ${appTotals.bytes} bytes (max ${APP_LIMITS.maxBytes})`);
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { max: SHOT_LIMITS.max, max_bytes: SHOT_LIMITS.maxBytes },
    app_max_files: APP_LIMITS.maxFiles,
    app_max_bytes: APP_LIMITS.maxBytes,
    app_path_max_bytes: APP_LIMITS.pathMaxBytes,
  }),
);

console.log(`Neon Coast: ${shotLines.length} screenshot(s) within the ${SHOT_LIMITS.maxBytes / 1024} KiB cap:`);
for (const line of shotLines) console.log(line);
console.log(`app/: ${appTotals.files} files, ${(appTotals.bytes / 1024).toFixed(1)} KiB`);
console.log(`dossier written to ${join(outputDir, 'dossier.json')}`);

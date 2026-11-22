// NEON TIDE: Auralis Bay, hand-in program (make.fun gta6-01).
//
// The game: an original open-world crime story set in the sun-soaked megacity of Auralis Bay.
// You play courier Juno Vance, on foot or behind the wheel, taking on the tycoon Silas
// Vantongeren and Commissioner Harrow. It is three.js (vendored under game/vendor) served as
// plain static files, with no build step and no network access; art and sound are made at run time.
//
// This program packages the entry. It places game/ and screenshots/ (the folders next to this
// file) into the output directory and then writes dossier.json, the summary the judge reads,
// using the vendored make.fun helper.
//
// Output directory: $MAKEFUN_OUTPUT_DIR, or /output when unset. Local try-out:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Limits handed to the dossier builder (they mirror the scorer's own caps).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const SHOT_MAX_BYTES = 262144;

function resolveSourceDir(): string {
  return fileURLToPath(new URL('.', import.meta.url));
}

function resolveOutputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

function copyGame(src: string, out: string): void {
  cpSync(join(src, 'game'), join(out, 'game'), { recursive: true });
}

function copyScreenshots(src: string, out: string): void {
  cpSync(join(src, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

function writeDossier(out: string): void {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_OPTIONS));
}

// Every file below dir, as paths relative to dir, using '/' separators.
function listFiles(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...listFiles(dir, rel));
    else if (entry.isFile()) found.push(rel);
  }
  return found;
}

// Stops the run with a clear message before anything is written to the output directory.
function preflight(src: string): { files: number; bytes: number } {
  const problems: string[] = [];
  const gameDir = join(src, 'game');
  const shotDir = join(src, 'screenshots');

  if (!existsSync(join(gameDir, 'index.html'))) problems.push('game/index.html is missing');

  const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((f) => /\.(jpg|png)$/i.test(f)) : [];
  if (shots.length < 3 || shots.length > 4) {
    problems.push(`screenshots/ must hold 3-4 .jpg/.png files, found ${shots.length}`);
  }
  let bytes = 0;
  for (const f of shots) {
    const size = statSync(join(shotDir, f)).size;
    bytes += size;
    if (size > SHOT_MAX_BYTES) problems.push(`screenshots/${f} is ${size} bytes, over the ${SHOT_MAX_BYTES} limit`);
  }

  let files = shots.length;
  if (existsSync(gameDir)) {
    for (const rel of listFiles(gameDir)) {
      files++;
      bytes += statSync(join(gameDir, rel)).size;
      if (rel.startsWith('vendor/') || !/\.(js|html)$/.test(rel)) continue;
      if (/https?:\/\//.test(readFileSync(join(gameDir, rel), 'utf8'))) {
        problems.push(`game/${rel} contains an http:// or https:// URL`);
      }
    }
  }

  if (problems.length > 0) {
    console.error('Preflight failed:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  return { files, bytes };
}

function main(): void {
  const src = resolveSourceDir();
  const out = resolveOutputDir();
  const { files, bytes } = preflight(src);
  mkdirSync(out, { recursive: true });
  copyGame(src, out);
  copyScreenshots(src, out);
  writeDossier(out);
  console.log(`handed in ${files} files, ${bytes} bytes (game + screenshots) -> ${out}`);
}

main();

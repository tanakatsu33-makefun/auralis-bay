// Reproducible screenshots of the REAL game: serves game/, opens ?shot=<scene>&seed=1 in Chrome, saves JPEGs.
// usage: node tools/shoot.mjs [--out dir] [scene ...]     (default: the four contest scenes into screenshots/)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from '/workspace/makefun/gta6/tools/node_modules/playwright-core/index.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
let outDir = join(root, 'screenshots');
let evalExpr = null; // optional JS expression evaluated in the page after the scene is ready (debugging aid)
const scenes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outDir = args[++i];
  else if (args[i] === '--eval') evalExpr = args[++i];
  else scenes.push(args[i]);
}
const DEFAULT = { cover: '1-cover-chase', combat: '2-street-shootout', story: '3-story-mission', title: '4-title-screen' };
const list = scenes.length ? scenes : Object.keys(DEFAULT);
mkdirSync(outDir, { recursive: true });

const port = 8123 + Math.floor(Math.random() * 500);
const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
let failed = false;
try {
  for (const scene of list) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/index.html?shot=${scene}&seed=1`);
    await page.waitForFunction('window.__shotReady === true', null, { timeout: 150000 });
    await page.waitForTimeout(400);
    if (evalExpr) console.log('eval:', JSON.stringify(await page.evaluate(evalExpr)));
    const file = join(outDir, (DEFAULT[scene] ?? scene) + '.jpg');
    // JPEG quality 85, stepping down only if a frame would exceed the 256 KiB cap with margin
    for (const quality of [85, 80, 75, 70]) {
      const buf = await page.screenshot({ type: 'jpeg', quality });
      writeFileSync(file, buf);
      if (buf.length < 245000) break;
    }
    console.log('saved', file, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
    if (errors.length) failed = true;
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);

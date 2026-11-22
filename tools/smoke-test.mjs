// Headless gameplay smoke test: loads the real game, starts a new game, steals a car, drives, shoots, and saves.
// usage: node tools/smoke-test.mjs   (prints PASS/FAIL lines and any console errors)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/workspace/makefun/gta6/tools/node_modules/playwright-core/index.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 8700 + Math.floor(Math.random() * 200);
const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
let ok = true;
const check = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + ' ' + extra); if (!cond) ok = false; };

await page.goto(`http://localhost:${port}/index.html?seed=3`);
await page.waitForFunction('window.__game && window.__game.G.mode === "title"', null, { timeout: 90000 });
check('title screen shown', true);
await page.click('#btn-new');
await page.waitForFunction('window.__game.G.mode === "play"');
check('new game starts in play mode', true);
// walk and sprint
await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(2500);
await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
const moved = await page.evaluate('(()=>{const p=__game.G.player;return Math.hypot(p.x-(2*64+11),p.z-(4*64+11))})()');
check('player walked (software GL runs the sim in slow motion)', moved > 0.5, 'moved=' + moved.toFixed(1));
// shoot the pistol
await page.mouse.move(640, 400);
await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up();
check('ammo spent', await page.evaluate('__game.G.ammo.pistol < 90'));
// teleport next to a parked car, then carjack it with F
await page.evaluate(`(()=>{const G=__game.G;const v=G.vehicles.find(c=>c.parked)||G.vehicles[0];G.player.x=v.x+2.2;G.player.z=v.z;})()`);
await page.keyboard.press('KeyF');
await page.waitForTimeout(400);
check('entered a car', await page.evaluate('!!__game.G.player.inCar'));
await page.keyboard.down('KeyW');
await page.waitForTimeout(3500);
await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space');
const speed = await page.evaluate('Math.abs(__game.G.player.inCar?.speed||0)');
check('car accelerates', speed > 3, 'speed=' + speed.toFixed(1));
await page.keyboard.up('KeyW');
await page.keyboard.press('KeyQ');
await page.keyboard.press('F5');
await page.waitForTimeout(300);
check('quick-save wrote slot 1', await page.evaluate('!!localStorage.getItem("neontide.slot.1")'));
await page.keyboard.press('Escape');
await page.waitForFunction('__game.G.mode === "paused"', null, { timeout: 20000 });
check('pause opens', true);
await page.keyboard.press('Escape');
await page.waitForFunction('__game.G.mode === "play"', null, { timeout: 20000 });
check('resume works', true);
// story: drive onto the first mission marker, read the dialogue, expect the next objective
await page.evaluate('(()=>{const G=__game.G;const c=G.player.inCar;c.speed=0;c.vx=c.vz=0;c.x=2*64+9.5;c.z=5*64+9.5;G.player.x=c.x;G.player.z=c.z;for(let i=0;i<60;i++)__game.stepSimulation(1/60);})()');
check('mission 1 started at the marker', await page.evaluate('!!__game.G.mission.active && __game.G.mode === "dialogue"'));
for (let i = 0; i < 12; i++) {
  if (await page.evaluate('__game.G.mode !== "dialogue"')) break;
  await page.keyboard.press('Space'); await page.waitForTimeout(250); await page.keyboard.press('Space'); await page.waitForTimeout(250);
}
check('dialogue closes and first objective appears', await page.evaluate('__game.G.mode === "play" && __game.G.mission.step === 1'), await page.evaluate('JSON.stringify([__game.G.mode, __game.G.mission.step])'));
// raise the wanted level, then fast-forward the real simulation 12 s
await page.evaluate('(()=>{const G=__game.G;G.heat=6;G.wanted=3;for(let i=0;i<720;i++)__game.stepSimulation(1/60);})()');
const cops = await page.evaluate('__game.G.vehicles.filter(v=>v.ai==="police").length');
const heli = await page.evaluate('!!__game.G.heli');
check('helicopter arrives at 3 stars', heli);
check('police respond to wanted level', cops > 0, 'cops=' + cops);
check('no console errors', errors.length === 0, errors.join(' | '));
await page.screenshot({ path: '/tmp/probe/smoke.jpg', type: 'jpeg', quality: 70 });
await browser.close();
server.kill();
process.exit(ok ? 0 : 1);

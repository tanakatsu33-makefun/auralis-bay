// Entry point: boots the world, then runs the fixed-step game loop.
import { createWorld } from './world/scene-setup.js';
import { G } from './core/game-state.js';
import { seedRandom } from './core/seeded-random.js';

const params = new URLSearchParams(location.search);
seedRandom(Number(params.get('seed') || 7));
G.shot = params.get('shot');

const world = createWorld(document.getElementById('viewport'));
document.getElementById('loading').classList.add('hidden');

// temporary free camera while the systems are built up
world.camera.position.set(200, 8, 330);
world.camera.lookAt(420, 14, 330);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.tick(dt, 200, 330);
  world.render();
  window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

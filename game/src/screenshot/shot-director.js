// Screenshot mode (?shot=cover|combat|story|title&seed=N): stages a deterministic scene of the real game,
// advances the real simulation a few seconds, then renders one real frame. No compositing, no fake art.
import { G } from '../core/game-state.js';
import { setMode } from '../core/game-flow.js';
import { renderFrame } from '../core/simulation.js';
import { placePlayer } from '../player/player-character.js';
import { spawnVehicle } from '../vehicles/vehicle-factory.js';
import { spawnTrafficAt, populateInstantly } from '../traffic/traffic-spawner.js';
import { spawnPatrolCar } from '../police/dispatch.js';
import { setWanted } from '../police/wanted-level.js';
import { spawnHelicopter } from '../police/helicopter.js';
import { startMission } from '../missions/mission-runner.js';
import { camState } from '../feel/camera-rig.js';
import { PITCH } from '../world/city-grid.js';
import { removeAllNonEssential, advance, baseProgress, setShotCamera, DT } from './shot-helpers.js';
import { SCENES_EXTRA } from './shot-scenes.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

async function sceneCover() {
  baseProgress();
  const p = G.player;
  const road = 3 * PITCH; // an east-west avenue through Saffron Heights
  const x0 = 440; // heading west toward the Wharf; the look-back camera faces east with the sun at its back
  const lane = road - 4;
  G.mission.index = 4;
  G.mission.completed = ['m1', 'm2', 'm3', 'm4'];
  setMode('play');
  const car = spawnVehicle('kestrel', x0, lane, -Math.PI / 2, { color: 0xff3d8b });
  car.driver = 'player'; car.stolen = true;
  car.speed = 30; car.vx = -30; car.vz = 0;
  placePlayer(x0, lane, -Math.PI / 2); p.inCar = car;
  camState.yaw = Math.PI / 2; camState.pitch = 0.17; camState.lookBack = Math.PI; camState.forceBack = true;
  camState.bias = { dist: -3.5, height: -0.3, fov: -22, lookY: 3.2 };
  removeAllNonEssential(car);
  populateInstantly(p, 18, 10, 34);
  for (let i = 0; i < 3; i++) spawnTrafficAt('x', 3, x0 - 150 - i * 50, -1, ['halcyon', 'tamarin', 'okapi'][i]);
  for (let i = 0; i < 5; i++) spawnTrafficAt('x', 3, x0 + 12 + i * 36, 1, ['bulwark', 'brisa', 'halcyon', 'tamarin', 'okapi'][i]);
  startMission(4);
  setWanted(4);
  const cops = [];
  for (const dx of [8, 15, 25, 36]) cops.push(spawnPatrolCar('x', 3, x0 + dx, -1));
  cops.forEach((c, i) => { c.speed = 31; c.vx = -31; c.z = road + (i % 2 ? 6.2 : -6.2); });
  const heli = spawnHelicopter(x0 + 60, road - 10);
  G.autopilot = (inp) => { inp.throttle = 0.8; inp.steer = 0; };
  advance(2.6, () => {
    p.inCar = car;
    heli.angle = Math.PI / 2 + 0.1; heli.x = car.x + 30; heli.z = car.z + 4; heli.y = 15;
  });
  document.getElementById('toast').classList.remove('show');
}

const SCENES = { cover: sceneCover, ...SCENES_EXTRA };

export async function runShot(name, world) {
  setShotCamera(world.camera);
  await (SCENES[name] || sceneCover)(world);
  renderFrame(DT);
  await nextFrame();
  renderFrame(DT);
}

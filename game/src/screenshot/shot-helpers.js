// Helpers shared by the screenshot scenes: clear the ambient population, fast-forward the real simulation, set progress.
import { G, resetProgress } from '../core/game-state.js';
import { removeVehicle } from '../vehicles/vehicle-factory.js';
import { removePed } from '../traffic/pedestrians.js';
import { stepSimulation } from '../core/simulation.js';
import { updateCamera } from '../feel/camera-rig.js';
import { titleCamera } from '../ui/title-screen.js';
import { setStation } from '../audio/radio-stations.js';

export const DT = 1 / 60;
let camera = null;

export function setShotCamera(cam) {
  camera = cam;
}

export function removeAllNonEssential(keep) {
  for (const v of [...G.vehicles]) if (v !== keep) removeVehicle(v);
  for (const a of [...G.peds]) removePed(a);
}

export function advance(seconds, perStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    if (perStep) perStep(i);
    stepSimulation(DT);
    if (G.mode === 'title') titleCamera(G.time, camera); else updateCamera(DT, camera);
  }
}

export function baseProgress() {
  resetProgress();
  G.cash = 18450;
  G.weapons = { fists: true, pistol: true, smg: true, shotgun: true, rocket: false };
  G.ammo = { pistol: 120, smg: 214, shotgun: 36, rocket: 0 };
  G.weapon = 'smg';
  G.stats = { kills: 14, carjacks: 5, missions: 3, tokens: 9, wrecks: 4 };
  G.mission.index = 3;
  G.mission.completed = ['m1', 'm2', 'm3'];
  setStation(0, false);
}

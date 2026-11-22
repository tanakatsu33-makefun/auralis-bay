// Creates and destroys vehicle objects (simulation state + render mesh) and keeps the world list in sync.
import { G } from '../core/game-state.js';
import { CAR_MODELS } from './car-models.js';
import { buildCarMesh } from './vehicle-mesh.js';
import { pick, rand } from '../core/seeded-random.js';

let nextId = 1;

export function spawnVehicle(modelId, x, z, heading, opts = {}) {
  const spec = CAR_MODELS[modelId];
  const color = opts.color ?? pick(spec.colors);
  const police = !!opts.police;
  const mesh = buildCarMesh(modelId, color, { police });
  const v = {
    id: nextId++, kind: 'car', model: modelId, spec, mesh, color, police,
    x, z, heading, vx: 0, vz: 0, yaw: 0, speed: 0, lateral: 0, accelFilt: 0,
    health: spec.health, maxHealth: spec.health, dead: false, burning: 0, burnT: 0,
    input: { throttle: 0, steer: 0, brake: 0, handbrake: 0 },
    driver: null, ai: opts.ai ?? null, aiState: null, parked: !!opts.parked,
    radius: 1.1, half: spec.length * 0.3, steerVis: 0, pitch: 0, roll: 0, siren: false,
    owner: opts.owner ?? null, stolen: false, hornT: 0, honk: false, stuckT: 0, lightPhase: rand() * 6,
  };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.three.scene.add(mesh);
  G.vehicles.push(v);
  return v;
}

export function removeVehicle(v) {
  const i = G.vehicles.indexOf(v);
  if (i >= 0) G.vehicles.splice(i, 1);
  G.three.scene.remove(v.mesh);
  v.removed = true;
}

export function nearestVehicle(x, z, maxDist, filter) {
  let best = null, bd = maxDist;
  for (const v of G.vehicles) {
    if (v.removed || (filter && !filter(v))) continue;
    const d = Math.hypot(v.x - x, v.z - z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

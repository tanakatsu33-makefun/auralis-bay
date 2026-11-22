// Cars that missions own: a fleeing target that runs from the player along the street grid, and mission pickups.
import { G } from '../core/game-state.js';
import { spawnVehicle } from '../vehicles/vehicle-factory.js';
import { makeRoute, driveTraffic } from '../traffic/traffic-ai.js';
import { PITCH, BLOCKS } from '../world/city-grid.js';

export function spawnTargetCar(model, x, z, hp, speed, color) {
  const axis = 'x';
  const k = Math.max(0, Math.min(BLOCKS, Math.round(z / PITCH)));
  const v = spawnVehicle(model, x, z, Math.PI / 2, { ai: 'target', color });
  v.maxHealth = v.health = hp;
  v.mission = true;
  const st = makeRoute(axis, k, 1);
  st.chase = { x: x + 400, z };
  st.speedTarget = speed;
  st.chaseSpeed = speed;
  st.ignoreYield = 99;
  v.aiState = st;
  return v;
}

export function spawnMissionCar(model, x, z, heading, color) {
  const v = spawnVehicle(model, x, z, heading, { parked: true, color });
  v.mission = true;
  return v;
}

// Run away from the player: aim each turn decision at the point opposite the player.
export function driveTarget(v, dt) {
  const p = G.player;
  const st = v.aiState;
  if (!st) return;
  const dx = v.x - p.x, dz = v.z - p.z, d = Math.hypot(dx, dz) || 1;
  st.chase.x = v.x + dx / d * 300;
  st.chase.z = v.z + dz / d * 300;
  // panic when the player is close, relax a little when far so the chase stays fair
  st.speedTarget = st.chaseSpeed * (d < 40 ? 1.05 : d > 120 ? 0.7 : 0.9);
  driveTraffic(v, dt);
}

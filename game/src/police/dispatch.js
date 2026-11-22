// Police dispatch: how many patrol cars respond per star, where they appear, roadblocks ahead of the player, and arrests.
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { rand, randRange, chance } from '../core/seeded-random.js';
import { PITCH, BLOCKS, SIZE, laneOffset } from '../world/city-grid.js';
import { spawnVehicle, removeVehicle } from '../vehicles/vehicle-factory.js';
import { spawnPedestrian, removePed } from '../traffic/pedestrians.js';
import { makeRoute, laneCoord, routeHeading } from '../traffic/traffic-ai.js';
import { startPursuit } from './police-driver.js';

const UNITS_PER_STAR = [0, 2, 3, 4, 6, 7];
let spawnTimer = 0, blockTimer = 12, arrestT = 0;

export function spawnPatrolCar(axis, k, s, dir, chasing = true) {
  const st = makeRoute(axis, k, dir);
  const lane = laneCoord(st);
  const v = spawnVehicle('marlin', axis === 'x' ? s : lane, axis === 'x' ? lane : s, routeHeading(axis, dir), { police: true, ai: 'police' });
  v.speed = 14; v.vx = Math.sin(v.heading) * 14; v.vz = Math.cos(v.heading) * 14;
  if (chasing) startPursuit(v, 24 + G.wanted * 2);
  else v.aiState = st;
  return v;
}

function spawnOutOfSight(p) {
  const a = rand() * 6.283, d = randRange(95, 150);
  const px = p.x + Math.sin(a) * d, pz = p.z + Math.cos(a) * d;
  const axis = chance(0.5) ? 'x' : 'z';
  const k = Math.round((axis === 'x' ? pz : px) / PITCH);
  const s = axis === 'x' ? px : pz;
  if (k < 0 || k > BLOCKS || s < 10 || s > SIZE - 10 || Math.abs(s - Math.round(s / PITCH) * PITCH) < 14) return null;
  const dir = chance(0.5) ? 1 : -1;
  const lane = k * PITCH + (axis === 'x' ? laneOffset(dir) : -laneOffset(dir));
  const x = axis === 'x' ? s : lane, z = axis === 'x' ? lane : s;
  for (const v of G.vehicles) if (Math.hypot(v.x - x, v.z - z) < 12) return null;
  return spawnPatrolCar(axis, k, s, dir);
}

function spawnRoadblock(p) {
  const car = p.inCar;
  if (!car || Math.hypot(car.vx, car.vz) < 9) return;
  const axis = Math.abs(car.vx) > Math.abs(car.vz) ? 'x' : 'z';
  const dir = Math.sign(axis === 'x' ? car.vx : car.vz);
  const lat = axis === 'x' ? car.z : car.x;
  const k = Math.max(0, Math.min(BLOCKS, Math.round(lat / PITCH)));
  let s = (axis === 'x' ? car.x : car.z) + dir * 110;
  s = Math.round(s / PITCH) * PITCH + dir * -24 * 1; // a safe distance short of the junction
  if (s < 10 || s > SIZE - 10) return;
  const cx = axis === 'x' ? s : k * PITCH, cz = axis === 'x' ? k * PITCH : s;
  if (Math.hypot(cx - p.x, cz - p.z) < 60) return;
  const h = axis === 'x' ? 0 : Math.PI / 2; // parked across the road
  const group = [];
  for (const off of [-4.2, 4.2]) {
    const v = spawnVehicle('marlin', axis === 'x' ? cx + off * 0 : cx + off, axis === 'x' ? cz + off : cz + off * 0, h + 0.15, { police: true, parked: true });
    v.siren = true; v.roadblock = true; v.input.handbrake = 1;
    group.push(v);
  }
  for (const off of [-8, 8]) {
    const a = spawnPedestrian(axis === 'x' ? cx - dir * 3 : cx + off * 0.5, axis === 'x' ? cz + off * 0.5 : cz - dir * 3, { role: 'cop', state: 'fight', weapon: 'pistol' });
    a.threat = p; a.roadblock = true;
  }
  emit('toast', 'ROADBLOCK AHEAD!');
}

export function updateDispatch(dt) {
  const p = G.player;
  if (!p) return;
  const stars = G.wanted;
  let chasing = 0;
  for (const v of G.vehicles) if (v.ai === 'police' && !v.dead && v.aiState?.chase) chasing++;
  spawnTimer -= dt;
  if (stars > 0 && spawnTimer <= 0 && chasing < UNITS_PER_STAR[stars]) { spawnOutOfSight(p); spawnTimer = 2.2; }
  blockTimer -= dt;
  if (stars >= 3 && blockTimer <= 0) { spawnRoadblock(p); blockTimer = 26; }
  // clean up when the heat is gone
  if (stars === 0) {
    for (const v of [...G.vehicles]) if (v.roadblock && Math.hypot(v.x - p.x, v.z - p.z) > 40) removeVehicle(v);
    for (const a of [...G.peds]) if (a.role === 'cop' && Math.hypot(a.x - p.x, a.z - p.z) > 60) removePed(a);
    for (const a of G.peds) if (a.role === 'cop' && !a.dead) { a.state = 'walk'; a.threat = null; }
  } else {
    for (const a of G.peds) if (a.role === 'cop' && !a.dead && a.state !== 'fight') { a.state = 'fight'; a.threat = p; }
    for (const v of [...G.vehicles]) if (v.roadblock && Math.hypot(v.x - p.x, v.z - p.z) > 220) removeVehicle(v);
  }
  // arrest: officers close in on a player who has stopped
  if (stars > 0 && !p.dead) {
    let near = 0;
    for (const a of G.peds) if (a.role === 'cop' && !a.dead && Math.hypot(a.x - p.x, a.z - p.z) < 2.6) near++;
    const still = p.inCar ? Math.abs(p.inCar.speed) < 2 : p.speed < 2.5;
    if (near > 0 && still) arrestT += dt * (1 + near * 0.5); else arrestT = Math.max(0, arrestT - dt * 2);
    if (arrestT > 3.2) { arrestT = 0; emit('busted'); }
  } else arrestT = 0;
}

export function resetDispatch() { arrestT = 0; spawnTimer = 0; blockTimer = 12; }

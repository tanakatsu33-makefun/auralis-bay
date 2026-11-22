// Keeps the streets populated: spawns traffic, parked cars and pedestrians in a ring around the player and recycles far ones.
import { G } from '../core/game-state.js';
import { rand, randRange, pick, chance, randInt } from '../core/seeded-random.js';
import { PITCH, BLOCKS, SIZE, laneOffset } from '../world/city-grid.js';
import { TRAFFIC_MIX } from '../vehicles/car-models.js';
import { spawnVehicle, removeVehicle } from '../vehicles/vehicle-factory.js';
import { makeRoute, routeHeading, laneCoord } from './traffic-ai.js';
import { spawnPedestrian, removePed } from './pedestrians.js';

export const POP = { traffic: 34, parked: 18, peds: 46, ring: [70, 175], despawn: 240 };
let timer = 0;

export function spawnTrafficAt(axis, k, s, dir, model) {
  const st = makeRoute(axis, k, dir);
  const lane = laneCoord(st);
  const x = axis === 'x' ? s : lane, z = axis === 'x' ? lane : s;
  const v = spawnVehicle(model || pick(TRAFFIC_MIX), x, z, routeHeading(axis, dir), { ai: 'traffic' });
  v.aiState = st;
  v.speed = st.speedTarget * 0.8;
  v.vx = Math.sin(v.heading) * v.speed; v.vz = Math.cos(v.heading) * v.speed;
  return v;
}

function farFromEverything(x, z, minD) {
  const p = G.player;
  if (Math.hypot(p.x - x, p.z - z) < minD * 0.6) return false;
  for (const v of G.vehicles) if (Math.hypot(v.x - x, v.z - z) < 10) return false;
  return true;
}

function ringPoint(p) {
  const a = rand() * 6.283, d = randRange(POP.ring[0], POP.ring[1]);
  return [p.x + Math.sin(a) * d, p.z + Math.cos(a) * d];
}

function trySpawnTraffic(p) {
  const [px, pz] = ringPoint(p);
  const axis = chance(0.5) ? 'x' : 'z';
  const k = Math.round((axis === 'x' ? pz : px) / PITCH);
  if (k < 0 || k > BLOCKS) return;
  const s = axis === 'x' ? px : pz;
  if (s < 8 || s > SIZE - 8) return;
  const dir = chance(0.5) ? 1 : -1;
  const lane = k * PITCH + (axis === 'x' ? laneOffset(dir) : -laneOffset(dir));
  const x = axis === 'x' ? s : lane, z = axis === 'x' ? lane : s;
  const sn = Math.round(s / PITCH) * PITCH;
  if (Math.abs(s - sn) < 12) return; // not inside an intersection
  if (!farFromEverything(x, z, 70)) return;
  spawnTrafficAt(axis, k, s, dir);
}

function trySpawnParked(p) {
  const [px, pz] = ringPoint(p);
  const axis = chance(0.5) ? 'x' : 'z';
  const k = Math.round((axis === 'x' ? pz : px) / PITCH);
  if (k < 0 || k > BLOCKS) return;
  const s = axis === 'x' ? px : pz;
  if (s < 8 || s > SIZE - 8 || Math.abs(s - Math.round(s / PITCH) * PITCH) < 14) return;
  const side = chance(0.5) ? 1 : -1;
  const x = axis === 'x' ? s : k * PITCH + side * 6.9, z = axis === 'x' ? k * PITCH + side * 6.9 : s;
  if (!farFromEverything(x, z, 70)) return;
  const h = axis === 'x' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : (side > 0 ? Math.PI : 0);
  spawnVehicle(pick(TRAFFIC_MIX), x, z, h, { parked: true });
}

function trySpawnPed(p) {
  const [px, pz] = ringPoint(p);
  const axis = chance(0.5) ? 'x' : 'z';
  const k = Math.max(0, Math.min(BLOCKS, Math.round((axis === 'x' ? pz : px) / PITCH)));
  const lane = k * PITCH + (chance(0.5) ? 9.5 : -9.5);
  const s = axis === 'x' ? px : pz;
  if (s < 2 || s > SIZE - 2) return;
  const a = spawnPedestrian(axis === 'x' ? s : lane, axis === 'x' ? lane : s, { keepPos: true });
  a.axis = axis; a.lane = lane; a.dir = chance(0.5) ? 1 : -1;
}

export function populateInstantly(p, trafficN, parkedN, pedN) {
  for (let i = 0; i < trafficN * 6 && G.vehicles.filter((v) => v.ai === 'traffic').length < trafficN; i++) trySpawnTraffic(p);
  for (let i = 0; i < parkedN * 6 && G.vehicles.filter((v) => v.parked).length < parkedN; i++) trySpawnParked(p);
  for (let i = 0; i < pedN * 3 && G.peds.filter((a) => a.role === 'civilian').length < pedN; i++) trySpawnPed(p);
}

export function updatePopulation(dt, density = 1) {
  const p = G.player;
  timer -= dt;
  const cars = G.vehicles;
  for (let i = cars.length - 1; i >= 0; i--) {
    const v = cars[i];
    if (v === p.inCar || v.mission) continue;
    const d = Math.hypot(v.x - p.x, v.z - p.z);
    if (d > POP.despawn || (v.dead && d > 60 && (v.deadAge = (v.deadAge || 0) + dt) > 40)) removeVehicle(v);
  }
  for (let i = G.peds.length - 1; i >= 0; i--) {
    const a = G.peds[i];
    if (a.mission || a.role === 'cop') continue;
    if (Math.hypot(a.x - p.x, a.z - p.z) > POP.despawn) removePed(a);
  }
  if (timer > 0) return;
  timer = 0.25;
  let tr = 0, pk = 0, pd = 0;
  for (const v of cars) { if (v.ai === 'traffic') tr++; else if (v.parked) pk++; }
  for (const a of G.peds) if (a.role === 'civilian' && !a.dead) pd++;
  if (tr < POP.traffic * density) trySpawnTraffic(p);
  if (pk < POP.parked) trySpawnParked(p);
  if (pd < POP.peds * density) trySpawnPed(p);
  void randInt;
}

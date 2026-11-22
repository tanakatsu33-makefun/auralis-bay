// Weapon catalog and hitscan firing against people, cars and walls. Rockets spawn a projectile instead.
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { rand } from '../core/seeded-random.js';
import { buildingsNear } from '../world/city-generator.js';
import { hurtActor, hurtPlayer } from './damage.js';
import { damageVehicle } from '../vehicles/vehicle-damage.js';
import { spawnRocket } from './projectiles.js';

export const WEAPONS = {
  fists: { name: 'FISTS', damage: 14, rate: 0.38, melee: true, range: 1.7, ammoKey: null },
  pistol: { name: 'PISTOL', damage: 22, rate: 0.26, spread: 0.012, pellets: 1, range: 90, ammoKey: 'pistol', tracer: 0xffe9a0, sound: 'pistol', price: 0 },
  smg: { name: 'SMG', damage: 11, rate: 0.085, spread: 0.035, pellets: 1, range: 80, ammoKey: 'smg', auto: true, tracer: 0xffd070, sound: 'smg', price: 450 },
  shotgun: { name: 'SHOTGUN', damage: 11, rate: 0.85, spread: 0.09, pellets: 8, range: 38, ammoKey: 'shotgun', tracer: 0xffc080, sound: 'shotgun', price: 700 },
  rocket: { name: 'ROCKET', damage: 0, rate: 1.5, rocket: true, range: 200, ammoKey: 'rocket', sound: 'rocket', price: 1500 },
};
export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun', 'rocket'];

const ray = { t: 0, kind: null, target: null };

function wallDistance(ox, oz, dx, dz, oy, dy, range) {
  for (let t = 1; t < range; t += 1.5) {
    const x = ox + dx * t, z = oz + dz * t, y = oy + dy * t;
    if (y < 0) return t;
    for (const b of buildingsNear(x, z, 1)) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y < b.h) return t;
  }
  return range;
}

// Closest thing struck by a ray (ground-plane distance t along (dx,dz), vertical slope dy per metre).
export function castRay(ox, oy, oz, dx, dy, dz, range, ignore) {
  ray.t = Math.min(range, wallDistance(ox, oz, dx, dz, oy, dy, range));
  ray.kind = ray.t < range ? 'wall' : null;
  ray.target = null;
  const test = (cx, cz, r, h, kind, target) => {
    const px = cx - ox, pz = cz - oz;
    const along = px * dx + pz * dz;
    if (along < 0 || along > ray.t) return;
    const perp = Math.abs(px * dz - pz * dx);
    if (perp > r) return;
    const y = oy + dy * along;
    if (y < -0.1 || y > h) return;
    ray.t = along; ray.kind = kind; ray.target = target;
  };
  for (const a of G.peds) if (!a.dead && a !== ignore) test(a.x, a.z, 0.5, 1.9, 'actor', a);
  for (const v of G.vehicles) if (v !== ignore && v !== ignore?.inCar) test(v.x, v.z, 1.4, 1.7, 'vehicle', v);
  const p = G.player;
  if (p && !p.dead && p !== ignore && !p.inCar) test(p.x, p.z, 0.5, 1.9, 'player', p);
  else if (p && p.inCar && p !== ignore) test(p.inCar.x, p.inCar.z, 1.3, 1.7, 'playercar', p.inCar);
  return ray;
}

export function fireHitscan(shooter, weaponId, ox, oy, oz, dirX, dirY, dirZ) {
  const w = WEAPONS[weaponId];
  const byPlayer = shooter === G.player;
  const src = byPlayer ? 'player' : shooter;
  const horiz = Math.hypot(dirX, dirZ) || 1;
  for (let i = 0; i < (w.pellets || 1); i++) {
    const sp = w.spread || 0;
    const ax = dirX + (rand() - 0.5) * sp * 2 * horiz, az = dirZ + (rand() - 0.5) * sp * 2 * horiz, ay = dirY + (rand() - 0.5) * sp;
    const hn = Math.hypot(ax, az);
    const dx = ax / hn, dz = az / hn, dy = ay / hn;
    const r = castRay(ox, oy, oz, dx, dy, dz, w.range, shooter);
    const ex = ox + dx * r.t, ez = oz + dz * r.t, ey = oy + dy * r.t;
    emit('tracer', { x0: ox, y0: oy, z0: oz, x1: ex, y1: ey, z1: ez, color: w.tracer });
    if (r.kind === 'actor') hurtActor(r.target, w.damage, src, { x: dx, z: dz });
    else if (r.kind === 'vehicle' || r.kind === 'playercar') {
      damageVehicle(r.target, w.damage * 0.8, 'bullet', src);
      if (r.kind === 'playercar' && !byPlayer) hurtPlayer(w.damage * 0.25, shooter);
    } else if (r.kind === 'player') hurtPlayer(w.damage * (shooter?.role === 'cop' ? 0.8 : 0.6), shooter);
    emit('impact', { x: ex, y: Math.max(0.1, ey), z: ez, kind: r.kind || 'air' });
  }
  emit('shot', { x: ox, z: oz, weapon: weaponId, byPlayer, sound: w.sound });
}

export function fireWeapon(shooter, weaponId, ox, oy, oz, dirX, dirY, dirZ) {
  const w = WEAPONS[weaponId];
  if (w.rocket) {
    spawnRocket(shooter, ox, oy, oz, dirX, dirY, dirZ);
    emit('shot', { x: ox, z: oz, weapon: weaponId, byPlayer: shooter === G.player, sound: 'rocket' });
    return;
  }
  fireHitscan(shooter, weaponId, ox, oy, oz, dirX, dirY, dirZ);
}

// Short-range punch: hits the closest living person in a cone ahead.
export function punch(shooter, x, z, heading) {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  let best = null, bd = 1.9;
  for (const a of G.peds) {
    if (a.dead || a === shooter) continue;
    const dx = a.x - x, dz = a.z - z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.3) { bd = d; best = a; }
  }
  emit('shot', { x, z, weapon: 'fists', byPlayer: shooter === G.player, sound: 'punch' });
  if (best) hurtActor(best, WEAPONS.fists.damage, shooter === G.player ? 'player' : shooter, { x: fx, z: fz });
  return best;
}

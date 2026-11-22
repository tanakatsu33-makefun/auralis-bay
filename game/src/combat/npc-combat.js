// Behaviour for armed NPCs on foot: close in on the player, keep line of sight, and fire with a believable miss rate.
import { G } from '../core/game-state.js';
import { rand } from '../core/seeded-random.js';
import { dampAngle } from '../core/math-utils.js';
import { lineBlocked } from '../world/city-generator.js';
import { fireWeapon } from './weapons.js';
import { emit } from '../core/event-bus.js';

export function npcFight(a, dt) {
  const t = a.threat || G.player;
  if (!t || (t === G.player && G.player.dead)) { a.state = 'walk'; a.speed = 0; return; }
  const tx = t.inCar ? t.inCar.x : t.x, tz = t.inCar ? t.inCar.z : t.z;
  const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
  const want = a.role === 'cop' ? 11 : 13;
  const blocked = d < 60 && lineBlocked(a.x, a.z, tx, tz);
  a.heading = dampAngle(a.heading, Math.atan2(dx, dz), 10, dt);
  if (d > want || blocked) {
    a.speed = a.role === 'cop' ? 5.6 : 4.8;
    a.x += Math.sin(a.heading) * a.speed * dt;
    a.z += Math.cos(a.heading) * a.speed * dt;
    a.aimT = 0;
    return;
  }
  a.speed = d < 5 ? -1.5 : 0;
  if (d < 5) { a.x -= Math.sin(a.heading) * 1.5 * dt; a.z -= Math.cos(a.heading) * 1.5 * dt; }
  a.aimT += dt;
  a.fireT -= dt;
  if (a.fireT <= 0 && a.aimT > 0.35 && d < 55) {
    a.fireT = a.role === 'cop' ? 0.8 + rand() * 0.6 : 0.9 + rand() * 0.9;
    const ox = a.x + Math.sin(a.heading) * 0.5, oz = a.z + Math.cos(a.heading) * 0.5;
    const dist = d || 1;
    const err = 0.05 + d * 0.004;
    fireWeapon(a, a.weapon || 'pistol', ox, 1.3, oz, dx / dist + (rand() - 0.5) * err, (1.0 - (t.inCar ? 0.7 : 1.3)) / dist, dz / dist + (rand() - 0.5) * err);
    emit('muzzle', { x: ox, y: 1.3, z: oz });
  }
}

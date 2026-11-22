// Area damage for every explosion: people, cars (with a shockwave shove) and the player, with falloff.
import { G } from '../core/game-state.js';
import { on, emit } from '../core/event-bus.js';
import { hurtActor, hurtPlayer } from './damage.js';
import { damageVehicle } from '../vehicles/vehicle-damage.js';

export function installExplosions() {
  on('explosion', (e) => {
    const { x, z, radius, damage } = e;
    const src = e.byPlayer ? 'player' : e.source;
    for (const a of G.peds) {
      if (a.dead) continue;
      const d = Math.hypot(a.x - x, a.z - z);
      if (d < radius) hurtActor(a, damage * (1 - d / radius) * 1.6, src, { x: (a.x - x) / (d || 1), z: (a.z - z) / (d || 1) });
    }
    for (const v of G.vehicles) {
      if (v === e.source) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < radius) {
        const k = 1 - d / radius;
        v.vx += (v.x - x) / (d || 1) * k * 14;
        v.vz += (v.z - z) / (d || 1) * k * 14;
        v.lastHit = { cause: 'blast', source: src, t: G.time };
        damageVehicle(v, damage * k * 1.3, 'blast', src);
      }
    }
    const p = G.player;
    if (p && !p.dead) {
      const px = p.inCar ? p.inCar.x : p.x, pz = p.inCar ? p.inCar.z : p.z;
      const d = Math.hypot(px - x, pz - z);
      if (d < radius) hurtPlayer(damage * (1 - d / radius) * (p.inCar && p.inCar !== e.source ? 0.4 : 0.9), 'explosion');
    }
    emit('camera-shake', { amount: Math.max(0, 1 - Math.hypot((p?.x ?? 0) - x, (p?.z ?? 0) - z) / 80) * 1.4 });
  });
}

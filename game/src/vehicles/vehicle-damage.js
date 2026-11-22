// Vehicle health: dents, smoke, fire, and the final explosion that leaves a charred wreck.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { rand } from '../core/seeded-random.js';

const charred = new THREE.MeshLambertMaterial({ color: 0x17141c });

export function damageVehicle(v, amount, cause, source) {
  if (v.dead || v.parked && cause === 'wall') return;
  v.health -= amount;
  v.lastHit = { cause, source, t: G.time };
  if (v.health <= 0) explodeVehicle(v);
}

export function explodeVehicle(v) {
  if (v.dead) return;
  v.dead = true;
  v.health = 0;
  v.burning = 1;
  v.ai = null;
  v.input.throttle = v.input.steer = 0;
  v.mesh.traverse((o) => {
    if (o.isMesh && o.material !== charred && !o.material.isMeshBasicMaterial) o.material = charred;
    if (o.isSprite) o.visible = false;
  });
  v.vx += (rand() - 0.5) * 4;
  v.vz += (rand() - 0.5) * 4;
  G.stats.wrecks++;
  emit('explosion', { x: v.x, z: v.z, radius: 9, damage: 70, source: v, byPlayer: v.lastHit?.source === 'player' });
  emit('vehicle-wrecked', v);
}

// Per-frame fire/smoke for damaged cars; a burning car blows after a few seconds.
export function updateVehicleDamage(v, dt) {
  if (v.dead) {
    if (v.burning > 0 && rand() < dt * 14) emit('fire', { x: v.x + (rand() - 0.5) * 2, z: v.z + (rand() - 0.5) * 2, y: 0.8 });
    return;
  }
  if (v.health < 30) {
    v.burnT += dt;
    if (rand() < dt * (v.health < 15 ? 30 : 12)) emit('smoke', { x: v.x + Math.sin(v.heading) * v.spec.length * 0.35, z: v.z + Math.cos(v.heading) * v.spec.length * 0.35, y: 1.0, dark: v.health < 15 });
    if (v.health < 15 && v.burnT > 12) explodeVehicle(v);
    else if (v.health < 15) v.health -= dt * 1.2;
  }
}

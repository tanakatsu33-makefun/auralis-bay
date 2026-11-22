// Arcade car physics: forward/lateral velocity split, speed-sensitive steering, drift on handbrake,
// building and car-to-car collisions, and the visual body roll / pitch / wheel spin.
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { clamp, damp } from '../core/math-utils.js';
import { collideCircle } from '../world/city-generator.js';
import { damageVehicle } from './vehicle-damage.js';

const probe = { x: 0, z: 0 };

export function stepVehicle(v, dt) {
  if (v.dead && Math.abs(v.speed) < 0.2) { v.vx = v.vz = 0; syncMesh(v, dt); return; }
  const sinH = Math.sin(v.heading), cosH = Math.cos(v.heading);
  let vf = v.vx * sinH + v.vz * cosH;
  let vl = v.vx * cosH - v.vz * sinH;
  const inp = v.dead ? { throttle: 0, steer: 0, brake: 0.3, handbrake: 0 } : v.input;
  const spec = v.spec;
  const hb = inp.handbrake > 0;

  let a = 0;
  if (inp.throttle > 0) a = vf < -0.5 ? inp.throttle * spec.accel * 2.2 : inp.throttle * spec.accel * (1 - clamp(vf / spec.topSpeed, 0, 1));
  else if (inp.throttle < 0) a = vf > 0.5 ? inp.throttle * spec.accel * 2.2 : inp.throttle * spec.accel * 0.7 * (1 - clamp(-vf / (spec.topSpeed * 0.35), 0, 1));
  if (v.health < 25) a *= 0.7;
  vf += a * dt;
  if (inp.brake > 0) { const b = Math.min(Math.abs(vf), 26 * inp.brake * dt); vf -= Math.sign(vf) * b; }
  if (hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 9 * dt);
  vf -= vf * (0.06 + Math.abs(vf) * 0.0016) * dt;
  if (inp.throttle === 0 && inp.brake === 0) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 2.2 * dt);

  const grip = spec.grip * (hb ? 0.22 : 1);
  vl *= Math.exp(-grip * dt);
  v.lateral = vl;

  const speedFactor = clamp(vf / 5, -1, 1) / (1 + Math.abs(vf) * 0.04);
  const targetYaw = inp.steer * spec.steer * speedFactor * (hb && Math.abs(vf) > 7 ? 1.7 : 1);
  v.yaw += (targetYaw - v.yaw) * Math.min(1, dt * 9);
  v.heading += v.yaw * dt;

  const s2 = Math.sin(v.heading), c2 = Math.cos(v.heading);
  v.vx = s2 * vf + c2 * vl;
  v.vz = c2 * vf - s2 * vl;
  v.accelFilt = damp(v.accelFilt, a, 6, dt);
  v.speed = vf;
  v.x += v.vx * dt;
  v.z += v.vz * dt;
  v.steerVis = damp(v.steerVis, inp.steer * 0.5, 14, dt);

  collideWithBuildings(v);
  syncMesh(v, dt);
}

function collideWithBuildings(v) {
  for (const off of [v.half, -v.half]) {
    probe.x = v.x + Math.sin(v.heading) * off;
    probe.z = v.z + Math.cos(v.heading) * off;
    const ox = probe.x, oz = probe.z;
    const hit = collideCircle(probe, v.radius + 0.15);
    if (!hit) continue;
    v.x += probe.x - ox;
    v.z += probe.z - oz;
    const vn = v.vx * hit.nx + v.vz * hit.nz;
    if (vn < 0) {
      const impact = -vn;
      v.vx -= 1.35 * vn * hit.nx;
      v.vz -= 1.35 * vn * hit.nz;
      v.yaw += (off > 0 ? 1 : -1) * 0.04 * impact * (hit.nx * Math.cos(v.heading) - hit.nz * Math.sin(v.heading));
      if (impact > 3) damageVehicle(v, impact * 2.2, 'wall');
      if (impact > 4) emit('crash', { x: v.x, z: v.z, force: impact, vehicle: v });
    }
  }
}

// Car-versus-car: two circles per car, impulse along the contact normal.
export function resolveVehiclePairs() {
  const list = G.vehicles;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      if (dx * dx + dz * dz > 36) continue;
      for (const oa of [a.half, -a.half]) for (const ob of [b.half, -b.half]) {
        const ax = a.x + Math.sin(a.heading) * oa, az = a.z + Math.cos(a.heading) * oa;
        const bx = b.x + Math.sin(b.heading) * ob, bz = b.z + Math.cos(b.heading) * ob;
        let nx = bx - ax, nz = bz - az;
        const d = Math.hypot(nx, nz), minD = a.radius + b.radius;
        if (d >= minD || d < 1e-4) continue;
        nx /= d; nz /= d;
        const push = (minD - d) * 0.5;
        const wa = b.parked ? 1 : 0.5, wb = a.parked ? 1 : 0.5;
        a.x -= nx * push * 2 * wa; a.z -= nz * push * 2 * wa;
        b.x += nx * push * 2 * wb; b.z += nz * push * 2 * wb;
        const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rel < 0) {
          const j2 = -(1.25) * rel / 2;
          a.vx -= nx * j2 * 2 * wa; a.vz -= nz * j2 * 2 * wa;
          b.vx += nx * j2 * 2 * wb; b.vz += nz * j2 * 2 * wb;
          a.yaw += nx * 0.02 * rel; b.yaw -= nx * 0.02 * rel;
          if (-rel > 2.5) {
            damageVehicle(a, -rel * 2.4, 'car', b);
            damageVehicle(b, -rel * 2.4, 'car', a);
            emit('crash', { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, force: -rel, vehicle: a, other: b });
          }
        }
      }
    }
  }
}

export function syncMesh(v, dt) {
  const m = v.mesh, ud = m.userData;
  m.position.set(v.x, v.dead ? -0.05 : 0, v.z);
  m.rotation.y = v.heading;
  v.pitch = damp(v.pitch, -v.accelFilt * 0.0045, 8, dt);
  v.roll = damp(v.roll, -v.yaw * v.speed * 0.0035, 8, dt);
  ud.body.rotation.x = v.pitch;
  ud.body.rotation.z = clamp(v.roll, -0.12, 0.12);
  const spin = (v.speed / v.spec.wheelR) * dt;
  for (const w of ud.wheels) {
    w.mesh.rotation.x += spin;
    if (w.front) w.holder.rotation.y = v.steerVis;
  }
}

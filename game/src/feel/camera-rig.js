// Third-person camera: a lagging chase cam in cars (speed FOV, look-behind, mouse orbit) and an
// over-the-shoulder aim cam on foot. Both are kept out of walls and shaken by crashes and blasts.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { input, isDown } from '../core/input-controls.js';
import { clamp, damp, dampAngle, angleDiff } from '../core/math-utils.js';
import { insideBuilding } from '../world/city-generator.js';
import { on } from '../core/event-bus.js';

export const camState = { yaw: 0, pitch: 0.22, orbit: 0, orbitIdle: 0, shake: 0, fov: 62, dist: 5, aim: 0, lookBack: 0, hold: null };
const dir = new THREE.Vector3();
const target = new THREE.Vector3();
const want = new THREE.Vector3();
const SENS = 0.0024;

on('camera-shake', (e) => { camState.shake = Math.min(1.6, camState.shake + e.amount); });
on('crash', (e) => { camState.shake = Math.min(1.2, camState.shake + e.force * 0.03); });

export function getAimDirection(out = new THREE.Vector3()) {
  const cp = Math.cos(camState.pitch);
  return out.set(Math.sin(camState.yaw) * cp, -Math.sin(camState.pitch), Math.cos(camState.yaw) * cp);
}

function pullIn(from, to) {
  // march from the target toward the wanted camera position; stop before geometry
  for (let t = 0.1; t <= 1; t += 0.1) {
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t, z = from.z + (to.z - from.z) * t;
    const b = insideBuilding(x, z);
    if ((b && y < b.h + 0.5) || y < 0.4) {
      const k = Math.max(0.12, t - 0.15);
      to.set(from.x + (to.x - from.x) * k, Math.max(0.5, from.y + (to.y - from.y) * k), from.z + (to.z - from.z) * k);
      return;
    }
  }
}

export function updateCamera(dt, camera) {
  const p = G.player;
  if (!p) return;
  if (camState.hold) { camera.position.copy(camState.hold.pos); camera.lookAt(camState.hold.look); camera.fov = camState.hold.fov || 55; camera.updateProjectionMatrix(); return; }
  const playing = G.mode === 'play';
  const mdx = playing ? input.mouseDX : 0, mdy = playing ? input.mouseDY : 0;
  const car = p.inCar;
  let wantFov = 62;
  if (car) {
    const moving = Math.hypot(car.vx, car.vz);
    const travel = moving > 4 && car.speed > 0 ? Math.atan2(car.vx, car.vz) : car.heading;
    const base = car.speed < -1 ? car.heading + Math.PI : car.heading + angleDiff(car.heading, travel) * 0.4;
    camState.lookBack = damp(camState.lookBack, isDown('KeyC') ? Math.PI : 0, 8, dt);
    if (mdx || mdy) { camState.orbit -= mdx * SENS; camState.pitch = clamp(camState.pitch + mdy * SENS, 0.02, 1.0); camState.orbitIdle = 0; }
    else camState.orbitIdle += dt;
    if (camState.orbitIdle > 1.2) camState.orbit = damp(camState.orbit, 0, 2.5, dt);
    camState.pitch = damp(camState.pitch, 0.22, camState.orbitIdle > 1.2 ? 1.5 : 0, dt);
    const targetYaw = (car.speed < -1 ? car.heading : base) + camState.orbit + camState.lookBack;
    camState.yaw = dampAngle(camState.yaw, targetYaw, 3.6 + Math.abs(car.speed) * 0.04, dt);
    camState.dist = damp(camState.dist, 7.4 + clamp(Math.abs(car.speed) * 0.09, 0, 3.6), 3, dt);
    const cp = Math.cos(camState.pitch);
    target.set(car.x + car.vx * 0.12, 1.5, car.z + car.vz * 0.12);
    want.set(target.x - Math.sin(camState.yaw) * camState.dist * cp, 1.4 + Math.sin(camState.pitch) * camState.dist + 1.7, target.z - Math.cos(camState.yaw) * camState.dist * cp);
    wantFov = 62 + clamp(Math.abs(car.speed), 0, 48) * 0.55;
    camState.aim = damp(camState.aim, 0, 6, dt);
  } else {
    camState.yaw -= mdx * SENS;
    camState.pitch = clamp(camState.pitch + mdy * SENS, -0.55, 1.1);
    const aiming = input.buttons[2] || p.fireT > 0;
    camState.aim = damp(camState.aim, input.buttons[2] ? 1 : 0, 10, dt);
    camState.dist = 4.6 - camState.aim * 2.1;
    const cp = Math.cos(camState.pitch), sy = Math.sin(camState.yaw), cy = Math.cos(camState.yaw);
    const shoulder = 0.55 + camState.aim * 0.35;
    target.set(p.x, 1.55, p.z);
    want.set(p.x - sy * camState.dist * cp + (-cy) * shoulder, 1.55 + Math.sin(camState.pitch) * camState.dist, p.z - cy * camState.dist * cp + sy * shoulder);
    wantFov = 60 - camState.aim * 14 + (aiming ? 0 : 0);
  }
  pullIn(target, want);
  camState.shake = damp(camState.shake, 0, 4, dt);
  const sh = camState.shake;
  const t = G.time * 40;
  camera.position.lerp(want, car ? 1 : 1 - Math.exp(-18 * dt));
  camera.position.x += Math.sin(t) * sh * 0.12;
  camera.position.y += Math.cos(t * 1.3) * sh * 0.12;
  camera.fov = damp(camera.fov, wantFov, 4, dt);
  camera.updateProjectionMatrix();
  dir.set(Math.sin(camState.yaw), -Math.sin(camState.pitch) * 0.6, Math.cos(camState.yaw));
  if (car) camera.lookAt(target.x + dir.x * 2, 1.3, target.z + dir.z * 2);
  else camera.lookAt(camera.position.x + Math.sin(camState.yaw) * Math.cos(camState.pitch) * 20, camera.position.y - Math.sin(camState.pitch) * 20, camera.position.z + Math.cos(camState.yaw) * Math.cos(camState.pitch) * 20);
}

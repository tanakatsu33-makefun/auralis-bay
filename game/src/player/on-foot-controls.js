// On-foot control: camera-relative WASD, sprint, aiming with auto-assist, shooting and weapon switching.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { input, isDown, wasTapped, axis } from '../core/input-controls.js';
import { dampAngle, damp } from '../core/math-utils.js';
import { camState, getAimDirection } from '../feel/camera-rig.js';
import { WEAPONS, WEAPON_ORDER, castRay, fireWeapon, punch } from '../combat/weapons.js';
import { emit } from '../core/event-bus.js';

const aim = new THREE.Vector3();

export function selectWeapon(id) {
  if (!G.weapons[id]) return false;
  G.weapon = id;
  emit('weapon-changed', id);
  return true;
}

function cycleWeapon(step) {
  const owned = WEAPON_ORDER.filter((w) => G.weapons[w]);
  const i = owned.indexOf(G.weapon);
  selectWeapon(owned[(i + step + owned.length) % owned.length]);
}

// Direction from the muzzle to where the crosshair points, nudged toward a nearby target (auto-aim).
function computeShotDirection(p, camera, ox, oy, oz) {
  getAimDirection(aim);
  const r = castRay(camera.position.x, camera.position.y, camera.position.z, aim.x / Math.hypot(aim.x, aim.z), aim.y / Math.hypot(aim.x, aim.z), aim.z / Math.hypot(aim.x, aim.z), 70, p);
  const t = Math.min(r.t, 70);
  const hz = Math.hypot(aim.x, aim.z);
  let tx = camera.position.x + aim.x / hz * t, ty = camera.position.y + aim.y / hz * t, tz = camera.position.z + aim.z / hz * t;
  let best = null, bestScore = 0.16;
  for (const a of G.peds) {
    if (a.dead) continue;
    const dx = a.x - ox, dz = a.z - oz, d = Math.hypot(dx, dz);
    if (d > 45 || d < 1.5) continue;
    const ang = Math.abs(Math.atan2(dx, dz) - Math.atan2(aim.x, aim.z));
    const angle = Math.min(ang, Math.PI * 2 - ang);
    if (angle < bestScore) { bestScore = angle; best = a; }
  }
  if (best && (input.buttons[2] || bestScore < 0.09)) { tx = best.x; tz = best.z; ty = 1.25; }
  const dx = tx - ox, dy = ty - oy, dz = tz - oz;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function updateOnFoot(p, dt) {
  const camera = G.three.camera;
  const f = axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
  const s = axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
  const sy = Math.sin(camState.yaw), cy = Math.cos(camState.yaw);
  let mx = sy * f - cy * s, mz = cy * f + sy * s;
  const len = Math.hypot(mx, mz);
  p.sprint = isDown('ShiftLeft', 'ShiftRight') && len > 0;
  const target = len > 0 ? (p.sprint ? 7.4 : 4.6) : 0;
  if (len > 0) { mx /= len; mz /= len; }
  const rate = target > p.speed ? 10 : 14;
  p.speed = damp(p.speed, target, rate, dt);
  if (len > 0) { p.vx = damp(p.vx, mx * p.speed, 14, dt); p.vz = damp(p.vz, mz * p.speed, 14, dt); }
  else { p.vx = damp(p.vx, 0, 14, dt); p.vz = damp(p.vz, 0, 14, dt); }
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  if (p.knockX) { p.x += p.knockX * dt; p.z += p.knockZ * dt; p.knockX *= 0.9; p.knockZ *= 0.9; }

  p.aiming = input.buttons[2];
  const shooting = input.buttons[0] && G.mode === 'play';
  if (p.aiming || shooting || p.fireT > 0) p.heading = dampAngle(p.heading, camState.yaw, 18, dt);
  else if (len > 0) p.heading = dampAngle(p.heading, Math.atan2(mx, mz), 12, dt);

  for (let k = 0; k < WEAPON_ORDER.length; k++) if (wasTapped('Digit' + (k + 1))) selectWeapon(WEAPON_ORDER[k]);
  if (input.wheel) cycleWeapon(input.wheel);

  p.fireT = Math.max(0, p.fireT - dt);
  const w = WEAPONS[G.weapon];
  const trigger = w.auto || w.melee ? shooting : input.clicked[0] && G.mode === 'play';
  if (trigger && p.fireT <= 0.0001) {
    if (w.melee) { punch(p, p.x, p.z, p.heading); p.fireT = w.rate; }
    else if (G.ammo[w.ammoKey] > 0) {
      const ox = p.x + Math.sin(p.heading) * 0.5, oz = p.z + Math.cos(p.heading) * 0.5, oy = 1.35;
      const d = computeShotDirection(p, camera, ox, oy, oz);
      fireWeapon(p, G.weapon, ox, oy, oz, d.x, d.y, d.z);
      emit('muzzle', { x: ox + d.x * 0.6, y: oy, z: oz + d.z * 0.6 });
      G.ammo[w.ammoKey]--;
      p.fireT = w.rate;
      camState.shake += 0.05;
    } else { emit('toast', 'OUT OF AMMO'); p.fireT = 0.4; }
  }
  const crosshair = document.getElementById('crosshair');
  if (crosshair) crosshair.classList.toggle('on', !G.player.inCar && G.mode === 'play' && !!(w.ammoKey));
}

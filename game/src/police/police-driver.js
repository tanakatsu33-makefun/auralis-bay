// Patrol-car driver. With a clear line to the target it charges and rams; otherwise it follows the street grid,
// biasing every turn toward the player. Cars near an on-foot player stop and the officers pile out.
import { G } from '../core/game-state.js';
import { clamp, angleDiff } from '../core/math-utils.js';
import { lineBlocked } from '../world/city-generator.js';
import { PITCH, BLOCKS } from '../world/city-grid.js';
import { driveTraffic, makeRoute } from '../traffic/traffic-ai.js';
import { spawnPedestrian } from '../traffic/pedestrians.js';

export function startPursuit(v, speed = 26) {
  const axis = Math.abs(Math.sin(v.heading)) > Math.abs(Math.cos(v.heading)) ? 'x' : 'z';
  const dir = axis === 'x' ? Math.sign(Math.sin(v.heading)) || 1 : Math.sign(Math.cos(v.heading)) || 1;
  const lat = axis === 'x' ? v.z : v.x;
  const st = makeRoute(axis, Math.max(0, Math.min(BLOCKS, Math.round(lat / PITCH))), dir);
  st.chase = { x: 0, z: 0 };
  st.speedTarget = speed;
  st.chaseSpeed = speed;
  st.ignoreYield = 99;
  v.aiState = st;
  v.mode = 'route';
  v.siren = true;
  v.unloadT = 0;
}

function targetOf(p) {
  if (p.inCar) return { x: p.inCar.x + p.inCar.vx * 0.5, z: p.inCar.z + p.inCar.vz * 0.5, speed: Math.hypot(p.inCar.vx, p.inCar.vz), car: true };
  return { x: p.x, z: p.z, speed: p.speed, car: false };
}

function unloadOfficers(v, p) {
  v.unloadT = 99;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;
    const a = spawnPedestrian(v.x + Math.cos(v.heading) * side * 2.2, v.z - Math.sin(v.heading) * side * 2.2, { role: 'cop', state: 'fight', weapon: G.wanted >= 4 ? 'smg' : 'pistol' });
    a.threat = p;
  }
}

export function drivePolice(v, dt) {
  const p = G.player;
  if (!v.aiState) startPursuit(v);
  if (G.wanted === 0 || p.dead) { // stand down: drive off like normal traffic
    if (v.aiState.chase) { v.aiState.chase = null; v.aiState.speedTarget = 11; v.siren = false; }
    driveTraffic(v, dt);
    return;
  }
  const st = v.aiState;
  v.siren = true;
  const t = targetOf(p);
  st.chase.x = t.x; st.chase.z = t.z;
  const dx = t.x - v.x, dz = t.z - v.z, d = Math.hypot(dx, dz);
  const clear = d < 90 && !lineBlocked(v.x, v.z, t.x, t.z, 4);
  if (!clear) {
    if (v.mode === 'direct') { v.mode = 'route'; startPursuit(v, st.chaseSpeed); st.chase = { x: t.x, z: t.z }; }
    driveTraffic(v, dt);
    return;
  }
  v.mode = 'direct';
  const inp = v.input;
  if (!t.car && d < 14) {
    inp.throttle = 0; inp.brake = 1; inp.steer = 0;
    if (Math.abs(v.speed) < 1 && v.unloadT < 1) unloadOfficers(v, p);
    return;
  }
  v.unloadT = 0;
  if (v.reverseT > 0) { v.reverseT -= dt; inp.throttle = -0.9; inp.steer = -inp.steer; inp.brake = 0; return; }
  const want = Math.atan2(dx, dz);
  const diff = angleDiff(v.heading, want);
  inp.steer = clamp(diff * 2.6, -1, 1);
  const top = st.chaseSpeed * (0.8 + G.wanted * 0.07);
  let speedTarget = clamp(d * 0.9, 8, top);
  if (Math.abs(diff) > 0.9) speedTarget = Math.min(speedTarget, 10);
  if (t.car && d < 40) speedTarget = Math.max(speedTarget, t.speed + 5);
  const err = speedTarget - v.speed;
  inp.throttle = clamp(err * 0.5, -1, 1);
  inp.brake = err < -4 ? 0.6 : 0;
  inp.handbrake = 0;
  if (Math.abs(v.speed) < 0.7 && d > 8) {
    v.stuckT += dt;
    if (v.stuckT > 1.4) { v.reverseT = 1.0; v.stuckT = 0; }
  } else v.stuckT = 0;
}

export function updatePoliceLights(t) {
  for (const v of G.vehicles) {
    const g = v.mesh.userData.glows;
    if (!g.redLamp) continue;
    const on = v.siren && !v.dead;
    const phase = Math.floor((t * 6 + v.lightPhase) % 2);
    g.redLamp.visible = g.blueLamp.visible = true;
    g.redGlow.visible = g.blueGlow.visible = on;
    // the two bars trade brightness so the strobe reads in motion and both colours show in a still
    g.redGlow.material.opacity = phase === 0 ? 1 : 0.55;
    g.blueGlow.material.opacity = phase === 1 ? 1 : 0.55;
  }
}

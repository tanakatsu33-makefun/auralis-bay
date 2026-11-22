// Pedestrians: stroll along sidewalks, cross at crosswalks, flee gunfire and speeding cars, and die convincingly.
import { G } from '../core/game-state.js';
import { on, emit } from '../core/event-bus.js';
import { rand, randRange, pick, chance } from '../core/seeded-random.js';
import { PITCH, BLOCKS, SIZE } from '../world/city-grid.js';
import { collideCircle } from '../world/city-generator.js';
import { buildHumanoid, animateHumanoid, SKIN_TONES } from '../characters/humanoid-mesh.js';
import { hurtActor } from '../combat/damage.js';
import { npcFight } from '../combat/npc-combat.js';
import { dampAngle } from '../core/math-utils.js';

const SIDE = 9.5;
const SHIRTS = [0xff3d8b, 0x27e1c8, 0xffb347, 0x9b6bff, 0xf2f2f2, 0x4aa3e0, 0xe85a4f, 0x7ad97a, 0xf7d046];
const PANTS = [0x2a2a48, 0x3a3a55, 0x6b4a3a, 0x20202a, 0x4a6a8a, 0x8a6a4a];
const ROLE_LOOK = {
  cop: { shirt: 0x1d2c5a, pants: 0x151c3a, hat: 0x0e1430, hp: 80 },
  gang: { shirt: 0xa01f4a, pants: 0x1c1626, hat: 0x27e1c8, hp: 70 },
  civilian: { hp: 40 },
};

export function spawnPedestrian(x, z, opts = {}) {
  const role = opts.role || 'civilian';
  const look = ROLE_LOOK[role] || ROLE_LOOK.civilian;
  const mesh = buildHumanoid({
    shirt: opts.shirt ?? look.shirt ?? pick(SHIRTS), pants: look.pants ?? pick(PANTS), skin: pick(SKIN_TONES),
    hair: pick([0x120c18, 0x4a2c1a, 0xd9b36a, 0x7a2a2a, 0x888890]), hat: look.hat ?? (chance(0.15) ? pick(SHIRTS) : null), scale: randRange(0.93, 1.06),
  });
  G.three.scene.add(mesh);
  const a = {
    kind: 'ped', role, name: opts.name || null, mesh, x, z, heading: rand() * 6.28, speed: 0, hp: opts.hp ?? look.hp, maxHp: opts.hp ?? look.hp,
    dead: false, deadT: 0, state: opts.state || 'walk', stateT: 0, threat: null, axis: chance(0.5) ? 'x' : 'z', dir: chance(0.5) ? 1 : -1,
    lane: 0, walkSpeed: randRange(1.3, 2.1), weapon: opts.weapon || (role === 'civilian' ? null : 'pistol'), fireT: randRange(0.3, 1.2),
    hitT: 0, knockX: 0, knockZ: 0, mission: opts.mission || null, aimT: 0,
  };
  snapToSidewalk(a);
  if (opts.keepPos !== false) { a.x = x; a.z = z; }
  G.peds.push(a);
  return a;
}

function snapToSidewalk(a) {
  const k = a.axis === 'x' ? Math.round(a.z / PITCH) : Math.round(a.x / PITCH);
  const kk = Math.max(0, Math.min(BLOCKS, k));
  a.lane = kk * PITCH + (chance(0.5) ? SIDE : -SIDE);
}

export function removePed(a) {
  const i = G.peds.indexOf(a);
  if (i >= 0) G.peds.splice(i, 1);
  G.three.scene.remove(a.mesh);
  a.removed = true;
}

function walk(a, dt) {
  const prev = a.axis === 'x' ? a.x : a.z;
  const step = a.walkSpeed * dt * a.dir;
  let lat = a.axis === 'x' ? a.z : a.x;
  const toLane = a.lane - lat;
  lat += Math.sign(toLane) * Math.min(Math.abs(toLane), a.walkSpeed * dt);
  if (a.axis === 'x') { a.x += step; a.z = lat; } else { a.z += step; a.x = lat; }
  const cur = a.axis === 'x' ? a.x : a.z;
  const crossed = Math.floor(prev / PITCH) !== Math.floor(cur / PITCH);
  if (crossed) {
    const kline = Math.round(cur / PITCH);
    if (chance(0.35) && kline >= 0 && kline <= BLOCKS) {
      a.axis = a.axis === 'x' ? 'z' : 'x';
      a.lane = kline * PITCH + (chance(0.5) ? SIDE : -SIDE);
      a.dir = chance(0.5) ? 1 : -1;
    }
  }
  if (cur < -2 || cur > SIZE + 2) a.dir *= -1;
  a.targetHeading = a.axis === 'x' ? (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (a.dir > 0 ? 0 : Math.PI);
  if (Math.abs(toLane) > 0.3) a.targetHeading = Math.atan2(a.axis === 'x' ? a.dir : Math.sign(toLane), a.axis === 'x' ? Math.sign(toLane) : a.dir);
  a.speed = a.walkSpeed;
  a.heading = dampAngle(a.heading, a.targetHeading, 8, dt);
}

function flee(a, dt) {
  const t = a.threat;
  const tx = t ? t.x : a.x, tz = t ? t.z : a.z;
  const dx = a.x - tx, dz = a.z - tz;
  const away = Math.atan2(dx, dz);
  a.heading = dampAngle(a.heading, away + Math.sin(a.stateT * 3) * 0.3, 10, dt);
  a.speed = 5.4;
  a.x += Math.sin(a.heading) * a.speed * dt;
  a.z += Math.cos(a.heading) * a.speed * dt;
  if (a.stateT > 7 + a.walkSpeed * 2) { a.state = 'walk'; a.stateT = 0; a.threat = null; snapToSidewalk(a); a.axis = chance(0.5) ? 'x' : 'z'; }
}

// Cars that hit people hurt them in proportion to speed.
function runOver(dt) {
  for (const v of G.vehicles) {
    const sp = Math.hypot(v.vx, v.vz);
    if (sp < 2.5 || v.dead && sp < 6) continue;
    for (const a of G.peds) {
      if (a.dead) continue;
      const dx = a.x - v.x, dz = a.z - v.z;
      if (dx * dx + dz * dz > 14) continue;
      const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
      const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (Math.abs(along) < v.spec.length * 0.5 + 0.4 && side < v.spec.width * 0.5 + 0.45) {
        const byPlayer = v.driver === 'player';
        hurtActor(a, sp * 3.2, byPlayer ? 'player' : 'traffic', { x: v.vx / sp, z: v.vz / sp });
        a.x += (v.vx / sp) * 0.6; a.z += (v.vz / sp) * 0.6;
        if (byPlayer) emit('ped-run-over', { actor: a });
      }
    }
  }
}

export function updatePedestrians(dt) {
  runOver(dt);
  for (let i = G.peds.length - 1; i >= 0; i--) {
    const a = G.peds[i];
    a.stateT += dt;
    a.hitT = Math.max(0, a.hitT - dt);
    if (a.dead) {
      a.deadT += dt;
      animateHumanoid(a.mesh, dt, 0, false, 1);
      if (a.deadT > 25 && !a.mission) { removePed(a); continue; }
    } else {
      if (a.state === 'walk') walk(a, dt);
      else if (a.state === 'flee') flee(a, dt);
      else if (a.state === 'fight') npcFight(a, dt);
      else if (a.state === 'cower') { a.speed = 0; if (a.stateT > 3) { a.state = 'walk'; a.stateT = 0; } }
      else a.speed = 0;
      if (a.knockX) { a.x += a.knockX * dt; a.z += a.knockZ * dt; a.knockX *= 0.88; a.knockZ *= 0.88; }
      collideCircle(a, 0.4);
      animateHumanoid(a.mesh, dt, a.speed, a.state === 'fight' && a.aimT > 0);
    }
    a.mesh.position.set(a.x, 0, a.z);
    a.mesh.rotation.y = a.heading;
  }
}

export function scare(a, threat) {
  if (a.dead || a.role !== 'civilian' || a.state === 'flee') return;
  a.state = 'flee';
  a.stateT = 0;
  a.threat = threat;
}

export function installPedestrianReactions() {
  on('shot', (e) => {
    for (const a of G.peds) if (!a.dead && a.role === 'civilian' && Math.hypot(a.x - e.x, a.z - e.z) < 28) scare(a, { x: e.x, z: e.z });
  });
  on('explosion', (e) => {
    for (const a of G.peds) if (!a.dead && a.role === 'civilian' && Math.hypot(a.x - e.x, a.z - e.z) < 45) scare(a, { x: e.x, z: e.z });
  });
  on('actor-hit', (e) => {
    const a = e.actor;
    if (a.role === 'civilian' && !a.dead && e.source === 'player') { a.state = 'flee'; a.stateT = 0; a.threat = G.player; }
    else if (a.role === 'gang' && !a.dead && a.state !== 'fight') { a.state = 'fight'; a.threat = G.player; }
  });
}

// The police helicopter: arrives at 3+ stars, circles the player and sweeps a spotlight; at 4+ it shoots.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { rand } from '../core/seeded-random.js';
import { damp, dampAngle } from '../core/math-utils.js';
import { makeGlowSprite } from '../fx/glow-sprites.js';
import { fireHitscan } from '../combat/weapons.js';

const box = new THREE.BoxGeometry(1, 1, 1);
let heli = null, spot = null, beam = null, pool = null;

function buildHeliMesh() {
  const g = new THREE.Group();
  const hull = new THREE.MeshLambertMaterial({ color: 0x3a3c6a, emissive: 0x151630 });
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8fe8ff }));
  canopy.scale.set(0.95, 0.7, 1.1);
  canopy.position.set(0, 0.35, 1.5);
  const lamp = makeGlowSprite(0xfff4d0, 6, 1);
  lamp.position.set(0, -1.2, 0.8);
  g.add(canopy, lamp);
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f4ff });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hull);
  body.scale.set(1.3, 1.2, 2.6);
  const stripe = new THREE.Mesh(box, white);
  stripe.scale.set(2.65, 0.25, 2.2);
  stripe.position.y = -0.2;
  const tail = new THREE.Mesh(box, hull);
  tail.scale.set(0.35, 0.4, 4.6);
  tail.position.set(0, 0.2, -4.4);
  const fin = new THREE.Mesh(box, white);
  fin.scale.set(0.1, 1.1, 0.8);
  fin.position.set(0, 0.8, -6.5);
  const mast = new THREE.Mesh(box, hull);
  mast.scale.set(0.2, 0.7, 0.2);
  mast.position.y = 1.4;
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x15121c, transparent: true, opacity: 0.55 }));
  blade.scale.set(11, 0.05, 0.4);
  const blade2 = blade.clone();
  blade2.rotation.y = Math.PI / 2;
  rotor.add(blade, blade2);
  rotor.position.y = 1.8;
  const tailRotor = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x15121c, transparent: true, opacity: 0.5 }));
  tailRotor.scale.set(0.05, 1.6, 0.2);
  tailRotor.position.set(0.25, 0.8, -6.5);
  const redLamp = makeGlowSprite(0xff2030, 3, 0.9);
  redLamp.position.set(0, 1.2, -6.4);
  const blueLamp = makeGlowSprite(0x3070ff, 3, 0.9);
  blueLamp.position.set(0, -1.0, 0.5);
  g.add(body, stripe, tail, fin, mast, rotor, tailRotor, redLamp, blueLamp);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { rotor, tailRotor, redLamp, blueLamp };
  return g;
}

export function installHelicopter(scene) {
  spot = new THREE.SpotLight(0xfff0d0, 0, 140, 0.16, 0.5, 1.2);
  spot.position.set(0, 100, 0);
  scene.add(spot, spot.target);
  const coneGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
  coneGeo.translate(0, -0.5, 0);
  coneGeo.rotateX(-Math.PI / 2); // apex at origin, opening toward +z
  beam = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.visible = false;
  beam.frustumCulled = false;
  scene.add(beam);
  pool = makeGlowSprite(0xfff2d0, 16, 0.22);
  pool.visible = false;
  scene.add(pool);
}

export function spawnHelicopter(x, z) {
  if (heli) return heli;
  const mesh = buildHeliMesh();
  G.three.scene.add(mesh);
  heli = { mesh, x, y: 42, z, heading: 0, vx: 0, vz: 0, angle: rand() * 6.28, fireT: 2, sees: true, dead: false, kind: 'heli' };
  G.heli = heli;
  mesh.position.set(x, 42, z);
  return heli;
}

export function dismissHelicopter() {
  if (!heli) return;
  G.three.scene.remove(heli.mesh);
  heli = null; G.heli = null;
  spot.intensity = 0; beam.visible = false; pool.visible = false;
}

export function updateHelicopter(dt) {
  const p = G.player;
  const want = G.wanted >= 3 && p && !p.dead;
  if (want && !heli) {
    const a = rand() * 6.28;
    spawnHelicopter(p.x + Math.sin(a) * 260, p.z + Math.cos(a) * 260);
  }
  if (!want && heli) { // leave when the heat is gone
    heli.y += dt * 10; heli.x += dt * 30;
    heli.mesh.position.set(heli.x, heli.y, heli.z);
    spot.intensity = damp(spot.intensity, 0, 6, dt);
    beam.visible = pool.visible = false;
    if (heli.y > 120) dismissHelicopter();
    return;
  }
  if (!heli) return;
  const tx = p.inCar ? p.inCar.x : p.x, tz = p.inCar ? p.inCar.z : p.z;
  const tvx = p.inCar ? p.inCar.vx : 0, tvz = p.inCar ? p.inCar.vz : 0;
  heli.angle += dt * 0.35;
  const orbit = 32;
  const gx = tx + tvx * 1.6 + Math.sin(heli.angle) * orbit, gz = tz + tvz * 1.6 + Math.cos(heli.angle) * orbit;
  const dx = gx - heli.x, dz = gz - heli.z;
  const dist = Math.hypot(dx, dz) || 1;
  const sp = Math.min(34 + Math.hypot(tvx, tvz) * 0.6, dist * 1.4);
  heli.vx = damp(heli.vx, dx / dist * sp, 2, dt);
  heli.vz = damp(heli.vz, dz / dist * sp, 2, dt);
  heli.x += heli.vx * dt; heli.z += heli.vz * dt;
  heli.y = damp(heli.y, 38 + Math.sin(G.time * 0.7) * 2, 2, dt);
  heli.heading = dampAngle(heli.heading, Math.atan2(tx - heli.x, tz - heli.z), 1.5, dt);
  const m = heli.mesh, u = m.userData;
  m.position.set(heli.x, heli.y, heli.z);
  m.rotation.set(Math.hypot(heli.vx, heli.vz) * 0.006, heli.heading, -heli.vx * 0.004 * Math.cos(heli.heading));
  u.rotor.rotation.y += dt * 40;
  u.tailRotor.rotation.x += dt * 50;
  u.redLamp.visible = Math.floor(G.time * 2) % 2 === 0;
  // spotlight on the player
  const sx = heli.x, sy = heli.y - 1, sz = heli.z;
  spot.position.set(sx, sy, sz);
  spot.target.position.set(tx, 0, tz);
  spot.intensity = damp(spot.intensity, 170, 4, dt);
  const len = Math.hypot(tx - sx, sy, tz - sz);
  beam.visible = true;
  beam.position.set(sx, sy, sz);
  beam.lookAt(tx, 0, tz);
  beam.scale.set(len * 0.075, len * 0.075, len);
  pool.visible = true;
  pool.position.set(tx, 0.6, tz);
  // gunfire at 4+ stars
  heli.fireT -= dt;
  if (G.wanted >= 4 && heli.fireT <= 0) {
    heli.fireT = 1.6 + rand();
    const dxx = tx - sx, dzz = tz - sz, hh = Math.hypot(dxx, dzz);
    fireHitscan(heli, 'smg', sx, sy, sz, dxx / hh, (1 - sy) / hh, dzz / hh);
  }
}

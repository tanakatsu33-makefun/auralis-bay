// Low-poly humanoid: pivoted arms and legs so a single function can animate walking, running, aiming and falling.
import * as THREE from 'three';

const box = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
function mat(color) {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}
const gunMat = new THREE.MeshLambertMaterial({ color: 0x1b1b22 });

function limb(parent, color, x, y, w, h, d) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const m = new THREE.Mesh(box, mat(color));
  m.scale.set(w, h, d);
  m.position.y = -h / 2;
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

export const SKIN_TONES = [0xf1c9a5, 0xd9a273, 0xa8693f, 0x7a4a2c, 0xffdcb8, 0x5c3a24];

export function buildHumanoid({ shirt = 0xff3d8b, pants = 0x2a2a48, skin = 0xd9a273, hair = 0x20141c, scale = 1, hat = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hipY = 0.95;
  const torso = new THREE.Mesh(box, mat(shirt));
  torso.scale.set(0.52, 0.62, 0.28);
  torso.position.y = hipY + 0.34;
  torso.castShadow = true;
  body.add(torso);
  const head = new THREE.Mesh(box, mat(skin));
  head.scale.set(0.27, 0.29, 0.27);
  head.position.y = hipY + 0.82;
  head.castShadow = true;
  body.add(head);
  const hairM = new THREE.Mesh(box, mat(hair));
  hairM.scale.set(0.29, 0.12, 0.29);
  hairM.position.set(0, hipY + 0.97, -0.01);
  body.add(hairM);
  if (hat) {
    const h = new THREE.Mesh(box, mat(hat));
    h.scale.set(0.32, 0.1, 0.34);
    h.position.set(0, hipY + 1.02, 0.02);
    body.add(h);
  }
  const armL = limb(body, shirt, -0.34, hipY + 0.62, 0.14, 0.58, 0.14);
  const armR = limb(body, shirt, 0.34, hipY + 0.62, 0.14, 0.58, 0.14);
  const legL = limb(body, pants, -0.13, hipY, 0.19, 0.95, 0.2);
  const legR = limb(body, pants, 0.13, hipY, 0.19, 0.95, 0.2);
  const gun = new THREE.Mesh(box, gunMat);
  gun.scale.set(0.08, 0.1, 0.5);
  gun.position.set(0, -0.5, 0.25);
  gun.visible = false;
  armR.add(gun);
  root.scale.setScalar(scale);
  root.userData = { body, armL, armR, legL, legR, gun, head, phase: 0, fall: 0 };
  return root;
}

// speed: m/s along ground; aiming: right arm raised with a weapon; down: 0..1 how far the body has fallen
export function animateHumanoid(h, dt, speed, aiming, down = 0) {
  const u = h.userData;
  u.phase += dt * (3 + speed * 1.7);
  const swing = Math.min(1, speed / 3) * 0.9;
  const s = Math.sin(u.phase);
  u.legL.rotation.x = s * swing;
  u.legR.rotation.x = -s * swing;
  u.armL.rotation.x = -s * swing * 0.8;
  u.armR.rotation.x = aiming ? -1.45 : s * swing * 0.8;
  u.gun.visible = aiming;
  u.fall += (down - u.fall) * Math.min(1, dt * 8);
  u.body.rotation.x = -u.fall * 1.5;
  u.body.position.y = -u.fall * 0.7;
  u.body.position.z = -u.fall * 0.2;
}

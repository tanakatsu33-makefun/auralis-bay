// Builds a low-poly car Group from a model spec: body, cabin glass, wheels, lights, and a police light bar.
import * as THREE from 'three';
import { CAR_MODELS } from './car-models.js';
import { makeGlowSprite } from '../fx/glow-sprites.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
wheelGeo.rotateZ(Math.PI / 2);
const bodyMats = new Map();
const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a1430, emissive: 0x3a2050 });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x15121c });
const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c8).multiplyScalar(2.2), toneMapped: false });
const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3a).multiplyScalar(1.8), toneMapped: false });
const redLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1030).multiplyScalar(3), toneMapped: false });
const blueLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2060ff).multiplyScalar(3), toneMapped: false });

function bodyMat(color) {
  let m = bodyMats.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); bodyMats.set(color, m); }
  return m;
}

function part(group, geo, mat, x, y, z, sx, sy, sz, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  group.add(m);
  return m;
}

export function buildCarMesh(modelId, color, { police = false } = {}) {
  const spec = CAR_MODELS[modelId];
  const root = new THREE.Group();
  const body = new THREE.Group(); // rolls and pitches independently of the wheels
  root.add(body);
  const { length: L, width: W, bodyH, cabinH, wheelR } = spec;
  const lift = wheelR * 0.8;
  const paint = police ? bodyMat(0x1c1a2e) : bodyMat(color);
  part(body, boxGeo, paint, 0, lift + bodyH / 2, 0, W, bodyH, L);
  const cabinLen = L * spec.cabinLen;
  const cab = part(body, boxGeo, glassMat, 0, lift + bodyH + cabinH / 2 - 0.02, L * spec.cabinShift, W * 0.9, cabinH, cabinLen);
  part(body, boxGeo, paint, 0, lift + bodyH + cabinH - 0.02, L * spec.cabinShift, W * 0.94, 0.08, cabinLen * 0.96);
  if (police) {
    part(body, boxGeo, bodyMat(0xf4f4ff), 0, lift + bodyH * 0.5, 0, W * 1.01, bodyH * 0.35, L * 0.5);
  }
  if (modelId === 'halcyon') part(body, boxGeo, headMat, 0, lift + bodyH + cabinH + 0.12, L * spec.cabinShift, 0.6, 0.2, 0.3, false);
  // lights
  for (const s of [-1, 1]) {
    part(body, boxGeo, headMat, s * W * 0.36, lift + bodyH * 0.55, L / 2 + 0.01, 0.34, 0.16, 0.06, false);
    part(body, boxGeo, tailMat, s * W * 0.36, lift + bodyH * 0.6, -L / 2 - 0.01, 0.4, 0.14, 0.06, false);
  }
  // wheels
  const wheels = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const holder = new THREE.Group();
    holder.position.set(sx * (W / 2 - 0.08), wheelR, sz * L * 0.32);
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.scale.set(0.28, wheelR, wheelR);
    w.castShadow = true;
    holder.add(w);
    root.add(holder);
    wheels.push({ holder, mesh: w, front: sz > 0 });
  }
  const glows = {};
  const head = makeGlowSprite(0xffe2a0, 3.2, 0.55);
  head.position.set(0, lift + bodyH * 0.55, L / 2 + 1.4);
  const tail = makeGlowSprite(0xff2030, 2.2, 0.55);
  tail.position.set(0, lift + bodyH * 0.6, -L / 2 - 0.4);
  body.add(head, tail);
  glows.head = head; glows.tail = tail;
  if (police) {
    const red = part(body, boxGeo, redLamp, -0.46, lift + bodyH + cabinH + 0.14, L * spec.cabinShift, 0.8, 0.22, 0.38, false);
    const blue = part(body, boxGeo, blueLamp, 0.46, lift + bodyH + cabinH + 0.14, L * spec.cabinShift, 0.8, 0.22, 0.38, false);
    const gr = makeGlowSprite(0xff2030, 11, 1); gr.position.copy(red.position); gr.position.y += 0.4;
    const gb = makeGlowSprite(0x3070ff, 11, 1); gb.position.copy(blue.position); gb.position.y += 0.4;
    body.add(gr, gb);
    glows.redLamp = red; glows.blueLamp = blue; glows.redGlow = gr; glows.blueGlow = gb;
  }
  root.userData = { body, wheels, glows, cab, spec };
  return root;
}

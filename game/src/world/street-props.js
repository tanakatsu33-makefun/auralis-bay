// Palms, street lamps, neon signs and the pier: the props that sell the dusk mood.
import * as THREE from 'three';
import { city } from './city-generator.js';
import { PITCH, ROAD_W, BLOCKS, SIZE, BEACH_X } from './city-grid.js';
import { rand, randRange, chance, pick } from '../core/seeded-random.js';
import { makeGlowPoints } from '../fx/glow-sprites.js';

const tmp = new THREE.Object3D();
function m4(x, y, z, sx, sy, sz, ry = 0, rz = 0) {
  tmp.position.set(x, y, z);
  tmp.scale.set(sx, sy, sz);
  tmp.rotation.set(0, ry, rz);
  tmp.updateMatrix();
  return tmp.matrix.clone();
}

function inst(geo, mat, list, colors) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const c = new THREE.Color();
  list.forEach((m, i) => { mesh.setMatrixAt(i, m); if (colors) { c.set(colors[i]); mesh.setColorAt(i, c); } });
  mesh.count = list.length;
  mesh.frustumCulled = false;
  return mesh;
}

export const lampPositions = [];

function buildPalms(group) {
  const trunks = [], crowns = [], crownCol = [];
  const half = ROAD_W / 2 + 1.5;
  const add = (x, z) => {
    const h = randRange(5, 9);
    trunks.push(m4(x, h / 2, z, 0.4, h, 0.4, 0, (rand() - 0.5) * 0.15));
    crowns.push(m4(x, h + 0.4, z, 3.6, 1.3, 3.6, rand() * 6));
    crownCol.push(pick([0x2f8f5a, 0x3fae6a, 0x24774f]));
  };
  for (let k = 0; k <= BLOCKS; k++) {
    for (let s = 0; s < BLOCKS * PITCH; s += 13) {
      if (chance(0.45)) add(s + randRange(-2, 2), k * PITCH + (chance(0.5) ? half : -half));
      if (chance(0.45)) add(k * PITCH + (chance(0.5) ? half : -half), s + randRange(-2, 2));
    }
  }
  for (let z = 0; z < SIZE; z += 9) add(BEACH_X - randRange(2, 18), z + randRange(-2, 2));
  for (const p of city.parks) for (let n = 0; n < 16; n++) add(p.cx + randRange(-20, 20), p.cz + randRange(-20, 20));
  const trunkMesh = inst(new THREE.CylinderGeometry(0.5, 0.8, 1, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a3a }), trunks);
  const crownMesh = inst(new THREE.SphereGeometry(1, 7, 4), new THREE.MeshLambertMaterial({ color: 0xffffff }), crowns, crownCol);
  trunkMesh.castShadow = crownMesh.castShadow = true;
  group.add(trunkMesh, crownMesh);
}

function buildLamps(group) {
  const poles = [], glows = [];
  const off = ROAD_W / 2 + 1;
  for (let i = 0; i <= BLOCKS; i++) {
    for (let j = 0; j <= BLOCKS; j++) {
      for (const [sx, sz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        const x = i * PITCH + sx * off, z = j * PITCH + sz * off;
        poles.push(m4(x, 3.6, z, 0.25, 7.2, 0.25));
        glows.push({ x, y: 7.3, z, color: 0xffb36a, gain: 1.2 });
        lampPositions.push({ x, z });
      }
      if (i < BLOCKS) { // mid-block lamp
        const x = i * PITCH + PITCH / 2, z = j * PITCH + off;
        poles.push(m4(x, 3.6, z, 0.25, 7.2, 0.25));
        glows.push({ x, y: 7.3, z, color: 0xffb36a });
      }
    }
  }
  group.add(inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x2c2342 }), poles));
  group.add(makeGlowPoints(glows, 9, 0.95));
}

function buildNeonSigns(group) {
  const boards = [], cols = [], glows = [];
  const palette = [0xff3d8b, 0x27e1c8, 0xffb347, 0x9b6bff];
  for (const b of city.buildings) {
    if ((b.kind !== 'lantern' && b.kind !== 'wharf' && b.kind !== 'heights') || b.h < 9) continue;
    if (!chance(b.kind === 'lantern' ? 0.8 : 0.35)) continue;
    const color = pick(palette);
    const side = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const y = randRange(5, Math.min(b.h - 1, 16));
    const x = b.x + side[0] * (b.w / 2 + 0.2), z = b.z + side[1] * (b.d / 2 + 0.2);
    const sw = side[0] ? 0.3 : randRange(3, 7), sd = side[0] ? randRange(3, 7) : 0.3;
    boards.push(m4(x, y, z, sw, randRange(1.2, 2.4), sd));
    cols.push(new THREE.Color(color).multiplyScalar(2.4));
    glows.push({ x: x + side[0] * 0.8, y, z: z + side[1] * 0.8, color, size: 10, gain: 1.1 });
  }
  const mesh = inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), boards, cols);
  group.add(mesh, makeGlowPoints(glows, 12, 0.8));
}

function buildPier(group) {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(150, 0.6, 9), new THREE.MeshLambertMaterial({ color: 0x9a6b52 }));
  deck.position.set(BEACH_X - 70, 1.2, 330);
  deck.receiveShadow = true;
  const posts = [], glows = [];
  for (let x = 0; x < 150; x += 10) {
    for (const s of [-4, 4]) {
      posts.push(m4(BEACH_X - x - 4, 0, 330 + s, 0.5, 4.4, 0.5));
      if (x % 20 === 0) glows.push({ x: BEACH_X - x - 4, y: 4.2, z: 330 + s, color: 0xff7ac8, size: 9 });
    }
  }
  group.add(deck, inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x4a3a52 }), posts), makeGlowPoints(glows, 10, 0.9));
  // a lit ferris wheel at the end of the pier
  const wheel = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 0.4, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x27e1c8).multiplyScalar(2) }));
  wheel.add(ring);
  const spokes = [];
  for (let a = 0; a < 12; a++) spokes.push({ x: Math.cos(a / 12 * 6.283) * 15, y: Math.sin(a / 12 * 6.283) * 15, z: 0, color: pick([0xff3d8b, 0xffb347, 0x27e1c8]) });
  wheel.add(makeGlowPoints(spokes, 7, 1));
  wheel.position.set(BEACH_X - 140, 17, 330);
  wheel.rotation.y = Math.PI / 2;
  group.userData.wheel = wheel;
  group.add(wheel);
}

export function buildStreetProps() {
  const group = new THREE.Group();
  group.name = 'props';
  buildPalms(group);
  buildLamps(group);
  buildNeonSigns(group);
  buildPier(group);
  return group;
}

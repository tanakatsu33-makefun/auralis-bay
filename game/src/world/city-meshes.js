// Turns the generated city data into GPU meshes: roads, lane paint, sidewalks, beach and instanced buildings.
import * as THREE from 'three';
import { city } from './city-generator.js';
import { PITCH, ROAD_W, BLOCKS, SIZE, SIDEWALK, BEACH_X } from './city-grid.js';
import { createBuildingMaterial } from './building-material.js';
import { rand } from '../core/seeded-random.js';

function noiseTexture(base, speck, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = speck + (0.04 + rand() * 0.1).toFixed(2) + ')';
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function instanced(geo, mat, matrices, colors) {
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  const col = new THREE.Color();
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colors) { col.set(colors[i]); mesh.setColorAt(i, col); }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

const tmp = new THREE.Object3D();
function mat4(x, y, z, sx, sy, sz, ry = 0) {
  tmp.position.set(x, y, z);
  tmp.scale.set(sx, sy, sz);
  tmp.rotation.set(0, ry, 0);
  tmp.updateMatrix();
  return tmp.matrix.clone();
}

function buildRoads(group) {
  const tex = noiseTexture('#3a3550', 'rgba(255,230,200,', 256);
  tex.repeat.set(SIZE / 24, 1);
  const tex2 = tex.clone();
  tex2.repeat.set(1, SIZE / 24);
  tex2.needsUpdate = true;
  const len = SIZE + ROAD_W * 2;
  const geo = new THREE.PlaneGeometry(len, ROAD_W);
  geo.rotateX(-Math.PI / 2);
  for (let k = 0; k <= BLOCKS; k++) {
    const a = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    a.position.set(SIZE / 2, 0.02, k * PITCH);
    a.receiveShadow = true;
    const b = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex2 }));
    b.rotation.y = Math.PI / 2;
    b.position.set(k * PITCH, 0.03, SIZE / 2);
    b.receiveShadow = true;
    group.add(a, b);
  }
}

function buildLanePaint(group) {
  const dash = [], cross = [];
  const half = ROAD_W / 2;
  for (let k = 0; k <= BLOCKS; k++) {
    for (let s = 0; s < BLOCKS; s++) {
      for (let d = half + 3; d < PITCH - half - 2; d += 7) {
        dash.push(mat4(s * PITCH + d + 1.5, 0.07, k * PITCH, 3, 1, 0.3));
        dash.push(mat4(k * PITCH, 0.08, s * PITCH + d + 1.5, 0.3, 1, 3));
      }
    }
    for (let m = 0; m <= BLOCKS; m++) { // crosswalk bars on all four arms
      for (let b = -6; b <= 6; b += 2) {
        cross.push(mat4(k * PITCH + b, 0.09, m * PITCH - half - 1.5, 0.9, 1, 2.6));
        cross.push(mat4(k * PITCH + b, 0.09, m * PITCH + half + 1.5, 0.9, 1, 2.6));
        cross.push(mat4(k * PITCH - half - 1.5, 0.09, m * PITCH + b, 2.6, 1, 0.9));
        cross.push(mat4(k * PITCH + half + 1.5, 0.09, m * PITCH + b, 2.6, 1, 0.9));
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 0.02, 1);
  group.add(instanced(geo, new THREE.MeshBasicMaterial({ color: 0xffd36e }), dash));
  group.add(instanced(geo, new THREE.MeshBasicMaterial({ color: 0xe8e4f0 }), cross));
}

function buildSidewalks(group) {
  const mats = [], colors = [];
  const size = PITCH - ROAD_W;
  for (let i = 0; i < BLOCKS; i++) {
    for (let j = 0; j < BLOCKS; j++) {
      mats.push(mat4(i * PITCH + PITCH / 2, 0.09, j * PITCH + PITCH / 2, size, 0.18, size));
      colors.push(city.blocks[i * BLOCKS + j].park ? 0x3f8a52 : 0x9a8a9c);
    }
  }
  const mesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), mats, colors);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildTerrain(group) {
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, SIZE + 400), new THREE.MeshLambertMaterial({ map: noiseTexture('#e8c9a0', 'rgba(120,80,40,', 256) }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(BEACH_X - 24, 0.01, SIZE / 2);
  sand.receiveShadow = true;
  group.add(sand);
  const outskirts = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x5b3a6e }));
  outskirts.rotation.x = -Math.PI / 2;
  outskirts.position.set(SIZE / 2 + 2000 + 100, -0.05, SIZE / 2);
  group.add(outskirts);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 400, 4000), new THREE.MeshLambertMaterial({ color: 0x5b3a6e }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(SIZE / 2, -0.06, SIZE + 2000 + 60);
  group.add(edge);
  const north = edge.clone();
  north.position.z = -2000 - 60;
  group.add(north);
}

function buildBuildings(group) {
  const mats = city.buildings.map((b) => mat4(b.x, b.h / 2, b.z, b.w, b.h, b.d));
  const colors = city.buildings.map((b) => b.color);
  const mesh = instanced(new THREE.BoxGeometry(1, 1, 1), createBuildingMaterial(), mats, colors);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  // rooftop crowns and mechanical boxes break up the skyline
  const roofs = [], roofCol = [];
  for (const b of city.buildings) {
    if (b.h < 16) continue;
    roofs.push(mat4(b.x + (rand() - 0.5) * b.w * 0.3, b.h + 1.2, b.z + (rand() - 0.5) * b.d * 0.3, b.w * 0.4, 2.4, b.d * 0.4));
    roofCol.push(0x40305a);
    if (b.h > 60) { roofs.push(mat4(b.x, b.h + 7, b.z, 0.8, 14, 0.8)); roofCol.push(0xffffff); }
  }
  const rm = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), roofs, roofCol);
  rm.castShadow = true;
  group.add(rm);
}

export function buildCityMeshes() {
  const group = new THREE.Group();
  group.name = 'city';
  buildTerrain(group);
  buildRoads(group);
  buildLanePaint(group);
  buildSidewalks(group);
  buildBuildings(group);
  return group;
}

// Tyre skid marks: a ring buffer of dark quads laid on the road behind sliding cars.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';

const MAX = 900;
let mesh, pos, head = 0, filled = 0;

export function installSkidMarks(scene) {
  pos = new Float32Array(MAX * 12);
  const idx = new Uint32Array(MAX * 6);
  for (let i = 0; i < MAX; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x07050c, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
}

function quad(x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len * 0.16, nz = dx / len * 0.16;
  const i = head++ % MAX;
  pos.set([x0 - nx, 0.1, z0 - nz, x0 + nx, 0.1, z0 + nz, x1 - nx, 0.1, z1 - nz, x1 + nx, 0.1, z1 + nz], i * 12);
  filled = Math.min(MAX, filled + 1);
}

export function updateSkidMarks(vehicles) {
  for (const v of vehicles) {
    const sliding = !v.dead && Math.abs(v.speed) > 3 && (Math.abs(v.lateral) > 2.6 || (v.input.handbrake && Math.abs(v.speed) > 6) || (v.input.brake > 0.7 && Math.abs(v.speed) > 12));
    if (!sliding) { v.skidLast = null; continue; }
    const s = Math.sin(v.heading), c = Math.cos(v.heading);
    const back = -v.spec.length * 0.32, side = v.spec.width * 0.42;
    const wl = [v.x + s * back - c * side, v.z + c * back + s * side, v.x + s * back + c * side, v.z + c * back - s * side];
    if (v.skidLast) { quad(v.skidLast[0], v.skidLast[1], wl[0], wl[1]); quad(v.skidLast[2], v.skidLast[3], wl[2], wl[3]); }
    v.skidLast = wl;
    emit('dust', { x: wl[0], z: wl[1] });
  }
  if (mesh) {
    mesh.geometry.attributes.position.needsUpdate = true;
  }
}

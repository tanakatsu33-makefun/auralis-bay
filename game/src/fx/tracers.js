// Bullet tracers: short additive streaks that fade out within a fraction of a second.
import * as THREE from 'three';
import { on } from '../core/event-bus.js';

const MAX = 96;
let lines, positions, colors, life = [];
let head = 0;

export function installTracers(scene) {
  positions = new Float32Array(MAX * 6);
  colors = new Float32Array(MAX * 6);
  life = new Array(MAX).fill(0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  lines.frustumCulled = false;
  scene.add(lines);
  const c = new THREE.Color();
  on('tracer', (e) => {
    const i = head++ % MAX;
    const dx = e.x1 - e.x0, dy = e.y1 - e.y0, dz = e.z1 - e.z0;
    const len = Math.hypot(dx, dy, dz) || 1;
    const tail = Math.min(len, 14);
    // streak from the muzzle-side start (offset a little forward) to the impact point
    positions.set([e.x1 - dx / len * tail, e.y1 - dy / len * tail, e.z1 - dz / len * tail, e.x1, e.y1, e.z1], i * 6);
    c.set(e.color || 0xffe9a0).multiplyScalar(2.2);
    colors.set([c.r * 0.3, c.g * 0.3, c.b * 0.3, c.r, c.g, c.b], i * 6);
    life[i] = 0.09;
  });
}

export function updateTracers(dt) {
  for (let i = 0; i < MAX; i++) {
    if (life[i] > 0) {
      life[i] -= dt;
      if (life[i] <= 0) positions.fill(0, i * 6, i * 6 + 6);
    }
  }
  lines.geometry.attributes.position.needsUpdate = true;
  lines.geometry.attributes.color.needsUpdate = true;
}

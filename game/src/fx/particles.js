// Pooled particle systems (one additive for fire/sparks, one alpha for smoke/dust/blood) driven by game events.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { on } from '../core/event-bus.js';
import { rand, randRange } from '../core/seeded-random.js';

const VERT = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC;
  uniform float uScale;
  void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uScale / -mv.z, 0.0, 220.0); gl_Position = projectionMatrix * mv; }`;
const FRAG = `varying float vA; varying vec3 vC;
  void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(vC, a); }`;

class ParticlePool {
  constructor(max, additive) {
    this.max = max;
    this.p = [];
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.color = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 900 } },
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.geo = geo;
  }

  emit(x, y, z, vx, vy, vz, life, size, grow, color, alpha, gravity = 0, drag = 0.5) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({ x, y, z, vx, vy, vz, life, max: life, size, grow, r: color[0], g: color[1], b: color[2], alpha, gravity, drag });
  }

  update(dt) {
    const list = this.p;
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.life -= dt;
      if (q.life <= 0) { list.splice(i, 1); continue; }
      const k = Math.exp(-q.drag * dt);
      q.vx *= k; q.vz *= k; q.vy = q.vy * k + q.gravity * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.05 && q.gravity < 0) { q.y = 0.05; q.vy *= -0.3; }
      q.size += q.grow * dt;
    }
    for (let i = 0; i < list.length; i++) {
      const q = list[i], t = q.life / q.max;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.size[i] = q.size;
      this.alpha[i] = q.alpha * Math.min(1, t * 2.2) * (t > 0.9 ? (1 - t) * 10 : 1);
      this.color[i * 3] = q.r; this.color[i * 3 + 1] = q.g; this.color[i * 3 + 2] = q.b;
    }
    this.geo.setDrawRange(0, list.length);
    for (const a of ['position', 'aSize', 'aAlpha', 'aColor']) this.geo.attributes[a].needsUpdate = true;
  }
}

let glow, smoke;
export function installParticles(scene) {
  glow = new ParticlePool(1400, true);
  smoke = new ParticlePool(1800, false);
  scene.add(glow.points, smoke.points);
  const sm = (x, y, z, dark, small) => {
    const c = dark ? [0.1, 0.09, 0.11] : [0.55, 0.5, 0.55];
    smoke.emit(x, y, z, randRange(-0.6, 0.6), randRange(1.2, 2.6), randRange(-0.6, 0.6), randRange(1.2, 2.4), small ? 0.5 : 1.0, small ? 1.2 : 2.2, c, dark ? 0.7 : 0.45, 0.2, 0.6);
  };
  on('smoke', (e) => sm(e.x, e.y, e.z, e.dark, e.small));
  on('fire', (e) => {
    glow.emit(e.x, e.y, e.z, randRange(-0.4, 0.4), randRange(1.5, 3.5), randRange(-0.4, 0.4), randRange(0.4, 0.8), 1.4, -1, [1.0, randRange(0.3, 0.55), 0.08], 0.9, 0, 0.5);
    if (rand() < 0.5) sm(e.x, e.y + 1, e.z, true, false);
  });
  on('explosion', (e) => {
    for (let i = 0; i < 26; i++) {
      const a = rand() * 6.283, s = randRange(2, 9);
      glow.emit(e.x, 1 + rand() * 2, e.z, Math.cos(a) * s, randRange(2, 8), Math.sin(a) * s, randRange(0.5, 1.1), randRange(3, 6), 4, [1.0, randRange(0.35, 0.7), 0.1], 1, 0, 1.5);
    }
    for (let i = 0; i < 34; i++) {
      const a = rand() * 6.283, s = randRange(1, 6);
      smoke.emit(e.x, 1.5, e.z, Math.cos(a) * s, randRange(2, 7), Math.sin(a) * s, randRange(1.8, 3.6), randRange(3, 5), 4, [0.12, 0.1, 0.12], 0.75, 0, 0.8);
    }
    for (let i = 0; i < 28; i++) {
      const a = rand() * 6.283, s = randRange(6, 18);
      glow.emit(e.x, 1, e.z, Math.cos(a) * s, randRange(4, 14), Math.sin(a) * s, randRange(0.5, 1.2), 0.35, 0, [1, 0.8, 0.4], 1, -22, 0.2);
    }
  });
  on('crash', (e) => {
    const n = Math.min(14, 3 + e.force | 0);
    for (let i = 0; i < n; i++) glow.emit(e.x, 0.6, e.z, randRange(-5, 5), randRange(1, 5), randRange(-5, 5), randRange(0.25, 0.6), 0.3, 0, [1, 0.85, 0.5], 1, -18, 0.3);
  });
  on('impact', (e) => {
    const dust = e.kind === 'wall' || e.kind === 'air';
    for (let i = 0; i < 5; i++) glow.emit(e.x, e.y, e.z, randRange(-3, 3), randRange(0.5, 3), randRange(-3, 3), randRange(0.15, 0.35), 0.22, 0, dust ? [1, 0.8, 0.5] : [1, 0.6, 0.3], 1, -12, 0.3);
    if (e.kind === 'wall') smoke.emit(e.x, e.y, e.z, 0, 0.6, 0, 0.7, 0.6, 1.4, [0.7, 0.6, 0.55], 0.35, 0, 1);
  });
  on('actor-hit', (e) => {
    const a = e.actor;
    for (let i = 0; i < 6; i++) smoke.emit(a.x, 1.2, a.z, randRange(-2, 2), randRange(0.5, 2.5), randRange(-2, 2), randRange(0.3, 0.6), 0.3, 0, [0.7, 0.05, 0.12], 0.9, -9, 0.5);
  });
  on('muzzle', (e) => {
    glow.emit(e.x, e.y, e.z, 0, 0, 0, 0.06, 0.6, 0, [1, 0.8, 0.4], 0.9, 0, 0);
  });
  on('dust', (e) => smoke.emit(e.x, 0.2, e.z, randRange(-0.5, 0.5), 0.5, randRange(-0.5, 0.5), 0.9, 0.9, 2, [0.75, 0.68, 0.62], 0.35, 0, 1));
}

export function updateParticles(dt, viewportHeight) {
  const s = viewportHeight * 0.9;
  glow.mat.uniforms.uScale.value = s;
  smoke.mat.uniforms.uScale.value = s;
  glow.update(dt);
  smoke.update(dt);
}

// Additive "bloom-like" glow: a soft radial texture plus helpers that build glowing point clouds.
import * as THREE from 'three';

let glowTexture = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

// Build a Points object from [{x,y,z,color,size}] entries; all share one draw call.
export function makeGlowPoints(entries, defaultSize = 6, opacity = 0.9) {
  const pos = new Float32Array(entries.length * 3);
  const col = new Float32Array(entries.length * 3);
  const col3 = new THREE.Color();
  entries.forEach((e, i) => {
    pos[i * 3] = e.x; pos[i * 3 + 1] = e.y; pos[i * 3 + 2] = e.z;
    col3.set(e.color ?? 0xffc977);
    const k = e.gain ?? 1;
    col[i * 3] = col3.r * k; col[i * 3 + 1] = col3.g * k; col[i * 3 + 2] = col3.b * k;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    map: getGlowTexture(), size: defaultSize, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// A single additive billboard sprite (used for car lights, flashes, the sun halo).
export function makeGlowSprite(color = 0xffffff, scale = 3, opacity = 1) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

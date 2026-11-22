// Golden-hour lighting: a low warm sun with a shadow frustum that follows the camera target, plus fog.
import * as THREE from 'three';
import { SUN_DIR, FOG_COLOR } from './sky-dome.js';

let sun, hemi;

export function createLighting(scene) {
  scene.fog = new THREE.Fog(FOG_COLOR, 90, 1100);
  hemi = new THREE.HemisphereLight(0xd8b0ff, 0x7a5a8a, 0.75);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffb070, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 70;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.4;
  scene.add(sun, sun.target);
  return { sun, hemi };
}

const snap = new THREE.Vector3();
export function followShadow(x, z) {
  if (!sun) return;
  // snap to texel-ish grid so shadows don't shimmer
  const g = 2;
  snap.set(Math.round(x / g) * g, 0, Math.round(z / g) * g);
  sun.target.position.copy(snap);
  sun.position.copy(snap).addScaledVector(SUN_DIR, 160);
  sun.target.updateMatrixWorld();
}

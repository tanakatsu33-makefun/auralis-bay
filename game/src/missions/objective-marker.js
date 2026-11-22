// Glowing world markers: a tall additive light beam with a pulsing ring, used for objectives, mission starts and shops.
import * as THREE from 'three';
import { G } from '../core/game-state.js';

const beamGeo = new THREE.CylinderGeometry(1.6, 1.6, 60, 20, 1, true);
beamGeo.translate(0, 30, 0);
const ringGeo = new THREE.TorusGeometry(2.6, 0.18, 6, 32);
ringGeo.rotateX(Math.PI / 2);

export function createBeam(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(beamGeo, mat);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.3), toneMapped: false, fog: false }));
  ring.position.y = 0.3;
  g.add(beam, ring);
  g.userData = { ring, beam };
  g.visible = false;
  G.three.scene.add(g);
  return g;
}

export function placeBeam(g, x, z, scaleByDistance = true) {
  if (!x && x !== 0) { g.visible = false; return; }
  g.visible = true;
  g.position.set(x, 0, z);
  const d = Math.hypot(x - G.player.x, z - G.player.z);
  const s = scaleByDistance ? Math.min(6, Math.max(1, d / 60)) : 1;
  g.userData.beam.scale.set(s, 1, s);
  g.userData.ring.scale.setScalar(s * (1 + Math.sin(G.time * 4) * 0.08));
  g.userData.ring.rotation.y = G.time;
}

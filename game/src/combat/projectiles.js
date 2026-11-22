// Rocket projectiles: fly straight, leave a smoke trail, and detonate on contact with anything.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { insideBuilding } from '../world/city-generator.js';

const rockets = [];
const rocketGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6);
rocketGeo.rotateX(Math.PI / 2);
const rocketMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(2), toneMapped: false });

export function spawnRocket(shooter, x, y, z, dx, dy, dz) {
  const len = Math.hypot(dx, dy, dz) || 1;
  const mesh = new THREE.Mesh(rocketGeo, rocketMat);
  mesh.position.set(x, y, z);
  mesh.lookAt(x + dx, y + dy, z + dz);
  G.three.scene.add(mesh);
  rockets.push({ mesh, x, y, z, vx: dx / len * 70, vy: dy / len * 70, vz: dz / len * 70, shooter, life: 4 });
}

function detonate(r, i) {
  G.three.scene.remove(r.mesh);
  rockets.splice(i, 1);
  emit('explosion', { x: r.x, z: r.z, radius: 10, damage: 90, source: r.shooter, byPlayer: r.shooter === G.player });
}

export function updateProjectiles(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
    r.life -= dt;
    r.mesh.position.set(r.x, r.y, r.z);
    emit('smoke', { x: r.x, z: r.z, y: r.y, dark: false, small: true });
    let hit = r.life <= 0 || r.y < 0.2 || !!insideBuilding(r.x, r.z);
    if (!hit) for (const v of G.vehicles) if (v !== r.shooter?.inCar && Math.hypot(v.x - r.x, v.z - r.z) < 2.2 && r.y < 2.2) { hit = true; break; }
    if (!hit) for (const a of G.peds) if (a !== r.shooter && !a.dead && Math.hypot(a.x - r.x, a.z - r.z) < 0.9 && r.y < 2) { hit = true; break; }
    if (hit) detonate(r, i);
  }
}

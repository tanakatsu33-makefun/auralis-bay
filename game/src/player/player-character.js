// The protagonist, Juno Vance: owns the player state object and routes each frame to on-foot or driving control.
import { G } from '../core/game-state.js';
import { buildHumanoid, animateHumanoid } from '../characters/humanoid-mesh.js';
import { updateOnFoot } from './on-foot-controls.js';
import { updateDriving } from './driving-controls.js';
import { collideCircle } from '../world/city-generator.js';
import { syncMesh } from '../vehicles/vehicle-physics.js';

export const SPAWN_POINTS = [
  { x: 64 * 5 + 11, z: 64 * 6 + 11, name: 'Tamarind Loft' },
  { x: 64 * 2 + 11, z: 64 * 4 + 11, name: 'Lantern Quarter Safehouse' },
];

export function createPlayer(x, z) {
  const mesh = buildHumanoid({ shirt: 0x27e1c8, pants: 0x2b2147, skin: 0xb77b50, hair: 0x120c18, hat: 0xff3d8b });
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  G.three.scene.add(mesh);
  const p = {
    kind: 'player', name: 'Juno Vance', mesh, x, z, heading: 0, vx: 0, vz: 0, speed: 0,
    hp: 100, maxHp: 100, armor: 0, dead: false, inCar: null, hurtT: 0, fireT: 0, aiming: false,
    aimYaw: 0, role: 'player', hp0: 100, invulnerable: false, sprint: false, enterCooldown: 0,
  };
  G.player = p;
  return p;
}

export function placePlayer(x, z, heading = 0) {
  const p = G.player;
  p.x = x; p.z = z; p.heading = heading; p.vx = p.vz = 0;
  p.dead = false; p.hp = p.maxHp; p.inCar = null; p.mesh.visible = true;
}

export function updatePlayer(dt) {
  const p = G.player;
  p.enterCooldown = Math.max(0, p.enterCooldown - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (p.dead) { animateHumanoid(p.mesh, dt, 0, false, 1); p.mesh.position.set(p.x, 0, p.z); return; }
  if (p.inCar) {
    updateDriving(p, p.inCar, dt);
    p.x = p.inCar.x; p.z = p.inCar.z; p.heading = p.inCar.heading;
    p.mesh.visible = false;
  } else {
    p.mesh.visible = true;
    updateOnFoot(p, dt);
    collideCircle(p, 0.4);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    animateHumanoid(p.mesh, dt, p.speed, p.aiming || p.fireT > 0.1);
  }
}

export function syncPlayerCar(dt) {
  if (G.player.inCar) syncMesh(G.player.inCar, dt);
}

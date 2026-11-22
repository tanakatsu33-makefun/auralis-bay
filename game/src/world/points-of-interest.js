// Shops (arms dealer, respray garage) and floating pickups (health, armour, cash tokens) scattered over the city.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { wasTapped } from '../core/input-controls.js';
import { rand, randInt } from '../core/seeded-random.js';
import { PITCH, BLOCKS } from './city-grid.js';
import { SHOPS, PLACES } from '../missions/story-arc.js';
import { createBeam, placeBeam } from '../missions/objective-marker.js';
import { WEAPONS, WEAPON_ORDER } from '../combat/weapons.js';
import { clearWanted } from '../police/wanted-level.js';

const shopBeams = [];
const pickupGeo = new THREE.OctahedronGeometry(0.55, 0);
const KINDS = {
  token: { color: 0x27e1c8, label: 'TIDE TOKEN +$250' },
  health: { color: 0xff3d5a, label: 'HEALTH' },
  armor: { color: 0x7ad7ff, label: 'BODY ARMOUR' },
};

export function installPointsOfInterest() {
  for (const s of SHOPS) shopBeams.push({ shop: s, beam: createBeam(new THREE.Color(s.blip)) });
  const scene = G.three.scene;
  const spots = [];
  for (let n = 0; n < 46; n++) {
    const kind = n % 4 === 0 ? 'health' : n % 7 === 0 ? 'armor' : 'token';
    const i = randInt(0, BLOCKS), j = randInt(0, BLOCKS);
    const side = rand() < 0.5 ? 9.5 : -9.5;
    spots.push({ kind, x: i * PITCH + side, z: j * PITCH + (rand() < 0.5 ? 9.5 : -9.5) });
  }
  for (const s of spots) {
    const k = KINDS[s.kind];
    const mesh = new THREE.Mesh(pickupGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(k.color).multiplyScalar(2), toneMapped: false }));
    mesh.position.set(s.x, 1.1, s.z);
    scene.add(mesh);
    G.pickups.push({ ...s, mesh, respawn: 0, taken: false });
  }
}

export function nearShop(p) {
  for (const { shop } of shopBeams) {
    const pl = PLACES[shop.place];
    if (Math.hypot(p.x - pl.x, p.z - pl.z) < 5) {
      if (shop.id === 'arms') return { shop, hint: '[E] Armour $250   [R] Ammo $200   [G] Next gun' };
      return { shop, hint: G.wanted > 0 ? 'Quick Coat: lose the heat for $400' : 'Quick Coat: respray (no heat to clear)' };
    }
  }
  return null;
}

function transact(price, apply, failMsg = 'NOT ENOUGH CASH') {
  if (G.cash < price) { emit('toast', failMsg); return; }
  G.cash -= price;
  apply();
}

export function updatePointsOfInterest(dt) {
  const p = G.player;
  for (const { shop, beam } of shopBeams) placeBeam(beam, PLACES[shop.place].x, PLACES[shop.place].z, false);
  const hit = nearShop(p);
  if (hit && G.mode === 'play' && !p.dead) {
    if (hit.shop.id === 'arms' && !p.inCar) {
      if (wasTapped('KeyE')) transact(250, () => { p.armor = 100; emit('toast', 'ARMOUR RESTORED'); });
      if (wasTapped('KeyR')) transact(200, () => { for (const w of WEAPON_ORDER) { const wk = WEAPONS[w].ammoKey; if (wk && G.weapons[w]) G.ammo[wk] += w === 'rocket' ? 4 : 60; } emit('toast', 'AMMO REFILLED'); });
      if (wasTapped('KeyG')) {
        const next = WEAPON_ORDER.find((w) => !G.weapons[w]);
        if (!next) emit('toast', 'YOU OWN EVERYTHING'); else transact(WEAPONS[next].price, () => { G.weapons[next] = true; G.ammo[next] += 60; emit('toast', 'BOUGHT ' + WEAPONS[next].name); });
      }
    } else if (hit.shop.id === 'coat' && p.inCar && G.wanted > 0 && Math.abs(p.inCar.speed) < 6) {
      transact(400, () => { clearWanted(); emit('banner', 'FRESH COAT — NO ONE KNOWS YOU'); });
    }
  }
  for (const k of G.pickups) {
    if (k.taken) { if ((k.respawn -= dt) <= 0) { k.taken = false; k.mesh.visible = true; } continue; }
    k.mesh.rotation.y += dt * 2;
    k.mesh.position.y = 1.1 + Math.sin(G.time * 2 + k.x) * 0.2;
    if (p.dead) continue;
    const reach = p.inCar ? 3.5 : 1.8;
    if (Math.hypot(p.x - k.x, p.z - k.z) < reach) {
      k.taken = true; k.respawn = 150; k.mesh.visible = false;
      if (k.kind === 'token') { G.cash += 250; G.stats.tokens++; }
      else if (k.kind === 'health') p.hp = Math.min(p.maxHp, p.hp + 50);
      else p.armor = Math.min(100, p.armor + 50);
      emit('toast', KINDS[k.kind].label);
      emit('pickup', k);
    }
  }
}

// Title screen over the live, slowly orbiting city: Continue / New Game / Save Slots.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { camState } from '../feel/camera-rig.js';
import { startNewGame, continueGame } from '../core/game-flow.js';
import { hasAnySave, describeSlot, readSlot, SLOT_COUNT, latestSlot } from '../save/save-slots.js';
import { SIZE } from '../world/city-grid.js';

const $ = (id) => document.getElementById(id);
const pos = new THREE.Vector3();
const look = new THREE.Vector3();

export function installTitleScreen() {
  $('btn-continue').disabled = !hasAnySave();
  $('btn-continue').onclick = () => continueGame(latestSlot());
  $('btn-new').onclick = () => startNewGame();
  $('btn-slots').onclick = () => {
    const list = $('slot-list');
    list.classList.toggle('hidden');
    list.innerHTML = '';
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const b = document.createElement('button');
      b.textContent = describeSlot(n);
      b.disabled = !readSlot(n);
      b.onclick = () => continueGame(n);
      list.appendChild(b);
    }
  };
}

export function refreshTitle() {
  $('btn-continue').disabled = !hasAnySave();
}

// A golden-hour flyover: the camera circles the Tidewatch skyline just above street level.
export function titleCamera(t, camera) {
  // hover east of downtown and drift in an arc, looking west into the setting sun over the ocean
  const a = Math.PI / 2 + Math.sin(t * 0.07) * 0.55;
  const cx = SIZE * 0.5, cz = SIZE * 0.5, r = 300;
  pos.set(cx + Math.sin(a) * r, 118 + Math.sin(t * 0.13) * 8, cz + Math.cos(a) * r);
  look.set(cx - 120, 20, cz + 40);
  camera.position.copy(pos);
  camera.lookAt(look);
  camera.fov = 52;
  camera.updateProjectionMatrix();
  camState.hold = null;
}

export function isTitle() {
  return G.mode === 'title';
}

// Game flow: title -> play -> paused, starting a new game or a saved one, and respawning after death or arrest.
import { G, resetProgress } from './game-state.js';
import { on, emit } from './event-bus.js';
import { fmtMoney } from './math-utils.js';
import { placePlayer, SPAWN_POINTS } from '../player/player-character.js';
import { applySave, readSlot, saveToSlot, latestSlot } from '../save/save-slots.js';
import { clearWanted } from '../police/wanted-level.js';
import { PLACES } from '../missions/story-arc.js';
import { removeVehicle } from '../vehicles/vehicle-factory.js';
import { camState } from '../feel/camera-rig.js';
import { initAudio } from '../audio/sfx-synth.js';
import { startRadio, setStation } from '../audio/radio-stations.js';
import { populateInstantly } from '../traffic/traffic-spawner.js';
import { resetDispatch } from '../police/dispatch.js';

const $ = (id) => document.getElementById(id);
const fade = (on2) => $('fade').classList.toggle('on', on2);

export function setMode(mode) {
  G.mode = mode;
  $('title-screen').classList.toggle('hidden', mode !== 'title');
  $('hud').classList.toggle('hidden', mode === 'title' || mode === 'loading');
  $('pause-menu').classList.toggle('hidden', mode !== 'paused');
  if (mode !== 'paused') window.__wantLock = mode === 'play';
}

function enterWorld(x, z, heading = 0) {
  const p = G.player;
  if (p.inCar) { p.inCar.driver = null; p.inCar = null; }
  placePlayer(x, z, heading);
  camState.yaw = heading;
  camState.hold = null;
  for (const v of [...G.vehicles]) if (Math.hypot(v.x - x, v.z - z) > 90 || v.ai === 'police') removeVehicle(v);
  populateInstantly(p, 24, 12, 30);
  resetDispatch();
  const ctx = initAudio();
  if (ctx) { startRadio(); setStation(G.radio.station, false); }
  setMode('play');
}

export function startNewGame() {
  resetProgress();
  G.playTime = 0;
  const sp = SPAWN_POINTS[1];
  enterWorld(sp.x, sp.z, 0.6);
  G.player.hp = 100; G.player.armor = 0;
  emit('banner', 'AURALIS BAY — JUNO VANCE IS BACK');
  emit('toast', 'Follow the amber marker to meet Mama Teo');
}

export function continueGame(slot = latestSlot()) {
  const data = readSlot(slot);
  if (!data) return startNewGame();
  applySave(data);
  G.slot = slot;
  enterWorld(data.x, data.z, 0);
  G.player.hp = Math.max(40, data.hp); G.player.armor = data.armor;
  emit('toast', 'WELCOME BACK — SLOT ' + slot);
}

function respawnAt(place, label, penalty) {
  const loss = Math.min(G.cash, Math.round(Math.min(800, G.cash * penalty)));
  G.cash -= loss;
  fade(true);
  setTimeout(() => {
    clearWanted();
    const p = G.player;
    if (p.inCar) { p.inCar.driver = null; p.inCar = null; }
    placePlayer(place.x, place.z, 0);
    p.armor = 0; p.dead = false; p.hp = 100;
    for (const v of [...G.vehicles]) if (v.ai === 'police' || v.roadblock) removeVehicle(v);
    for (const a of G.peds) if (a.role === 'cop') a.state = 'walk';
    setMode('play');
    fade(false);
    emit('toast', `${label}  −${fmtMoney(loss)}`);
  }, 2600);
}

export function installGameFlow() {
  on('player-down', () => { if (G.mode !== 'play') return; emit('banner', 'DOWN AND OUT'); G.mode = 'play'; respawnAt(PLACES.hospital, "St. Marrow's General bill", 0.1); });
  on('busted', () => { if (G.player.dead) return; G.player.dead = true; emit('banner', 'CUFFED'); respawnAt(PLACES.station, 'Bail paid', 0.08); });
  on('autosave', () => { if (G.mode === 'play') saveToSlot(G.slot || 1); });
}

export function togglePause() {
  if (G.mode === 'play') setMode('paused');
  else if (G.mode === 'paused') setMode('play');
}

export function backToTitle() {
  setMode('title');
}

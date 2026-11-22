// Three localStorage save slots: progress, weapons, position and story state, with a one-line summary for menus.
import { G, resetProgress } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { MISSIONS } from '../missions/mission-scripts.js';
import { fmtMoney } from '../core/math-utils.js';

const KEY = 'neontide.slot.';
export const SLOT_COUNT = 3;

function storage() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function readSlot(n) {
  const s = storage();
  if (!s) return null;
  try { return JSON.parse(s.getItem(KEY + n) || 'null'); } catch (e) { return null; }
}

export function saveToSlot(n) {
  const s = storage();
  const p = G.player;
  if (!s || !p) return false;
  const data = {
    v: 1, savedAt: Date.now(), cash: G.cash, stats: G.stats, weapons: G.weapons, ammo: G.ammo, weapon: G.weapon,
    mission: { index: G.mission.index, completed: G.mission.completed }, playTime: G.playTime || 0,
    x: p.inCar ? p.inCar.x + 3 : p.x, z: p.inCar ? p.inCar.z : p.z, hp: p.hp, armor: p.armor, radio: G.radio.station,
  };
  try { s.setItem(KEY + n, JSON.stringify(data)); } catch (e) { return false; }
  G.slot = n;
  emit('toast', 'GAME SAVED — SLOT ' + n);
  return true;
}

export function applySave(data) {
  resetProgress();
  G.cash = data.cash;
  Object.assign(G.stats, data.stats);
  G.weapons = { ...data.weapons };
  G.ammo = { ...data.ammo };
  G.weapon = data.weapon;
  G.mission.index = data.mission.index;
  G.mission.completed = [...data.mission.completed];
  G.playTime = data.playTime || 0;
  G.radio.station = data.radio || 0;
  return data;
}

export function describeSlot(n) {
  const d = readSlot(n);
  if (!d) return `SLOT ${n} — empty`;
  const done = d.mission.completed.length;
  const next = MISSIONS[d.mission.index];
  return `SLOT ${n} · ${fmtMoney(d.cash)} · ${done}/${MISSIONS.length} missions${next ? '' : ' ✔'}`;
}

export function hasAnySave() {
  for (let n = 1; n <= SLOT_COUNT; n++) if (readSlot(n)) return true;
  return false;
}

export function latestSlot() {
  let best = 0, t = -1;
  for (let n = 1; n <= SLOT_COUNT; n++) { const d = readSlot(n); if (d && d.savedAt > t) { t = d.savedAt; best = n; } }
  return best;
}

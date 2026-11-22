// The mission board: which story mission is next, its start marker, the mission list panel, and mission pass/fail banners.
import { G } from '../core/game-state.js';
import { on, emit } from '../core/event-bus.js';
import { wasTapped } from '../core/input-controls.js';
import { MISSIONS } from './mission-scripts.js';
import { PLACES, CAST } from './story-arc.js';
import { startMission, getObjective } from './mission-runner.js';
import { createBeam, placeBeam } from './objective-marker.js';

let startBeam, objectiveBeam, listOpen = false;

export function installMissionBoard() {
  startBeam = createBeam(0xffb347);
  objectiveBeam = createBeam(0x27e1c8);
  on('mission-passed', (m) => {
    emit('banner', 'MISSION PASSED  +$' + m.reward);
    emit('toast', m.weapon ? 'Unlocked: ' + m.weapon.toUpperCase() : m.title);
    emit('autosave');
  });
  on('mission-failed', (e) => emit('banner', 'MISSION FAILED — ' + e.reason));
  on('mission-start', (m) => emit('toast', 'MISSION: ' + m.title));
}

export function nextMission() {
  return MISSIONS[G.mission.index] || null;
}

export function missionStartPosition() {
  const m = nextMission();
  return !G.mission.active && m ? PLACES[m.place] : null;
}

export function updateMissionBoard(dt) {
  const p = G.player;
  const start = missionStartPosition();
  placeBeam(startBeam, start?.x, start?.z, false);
  if (start && G.mode === 'play' && !p.dead) {
    if (Math.hypot(p.x - start.x, p.z - start.z) < 4.5 && (!p.inCar || Math.abs(p.inCar.speed) < 12) && G.wanted === 0) startMission(G.mission.index);
  }
  const obj = G.mission.active ? getObjective() : null;
  placeBeam(objectiveBeam, obj?.pos?.x, obj?.pos?.z);
  if (wasTapped('Tab', 'KeyJ')) toggleList();
  if (listOpen) renderList();
}

export function toggleList() {
  listOpen = !listOpen;
  const el = document.getElementById('mission-list');
  el.classList.toggle('hidden', !listOpen);
  if (listOpen) renderList();
}

export function showList(show) {
  listOpen = show;
  document.getElementById('mission-list').classList.toggle('hidden', !show);
  if (show) renderList();
}

export function renderList() {
  const el = document.getElementById('mission-list');
  const rows = MISSIONS.map((m, i) => {
    const done = G.mission.completed.includes(m.id);
    const active = G.mission.active === m;
    const cls = done ? 'done' : active || i === G.mission.index ? 'active' : 'locked';
    const mark = done ? '✔' : active ? '▶' : i === G.mission.index ? '●' : '○';
    return `<div class="row ${cls}">${mark} ${i + 1}. ${m.title}<br><small>${CAST[m.giver].name} · $${m.reward}</small></div>`;
  });
  el.innerHTML = '<h3>STORY MISSIONS</h3>' + rows.join('');
}

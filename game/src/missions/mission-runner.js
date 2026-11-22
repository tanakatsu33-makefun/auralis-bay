// Executes the active mission one step at a time, exposes the current objective, and handles pass / fail.
import { G } from '../core/game-state.js';
import { emit, on } from '../core/event-bus.js';
import { rand, randRange } from '../core/seeded-random.js';
import { MISSIONS } from './mission-scripts.js';
import { PLACES } from './story-arc.js';
import { showDialogue } from '../ui/dialogue-box.js';
import { spawnPedestrian } from '../traffic/pedestrians.js';
import { insideBuilding } from '../world/city-generator.js';
import { spawnTargetCar, spawnMissionCar } from './mission-vehicles.js';
import { setWanted } from '../police/wanted-level.js';
import { removeVehicle } from '../vehicles/vehicle-factory.js';

const M = () => G.mission;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function currentStep() {
  const m = M();
  return m.active ? m.active.steps[m.step] : null;
}

export function startMission(index) {
  const mission = MISSIONS[index];
  if (!mission || M().active) return;
  M().active = mission;
  M().step = 0;
  emit('mission-start', mission);
  beginStep();
}

function nextStep() {
  const m = M();
  m.step++;
  if (m.step >= m.active.steps.length) return completeMission();
  beginStep();
}

function cleanupRuntime() {
  const rt = M().runtime;
  if (!rt) return;
  for (const a of rt.actors || []) a.mission = null;
  if (rt.car && !rt.car.dead && G.player.inCar !== rt.car) rt.car.mission = false;
  M().runtime = null;
}

function beginStep() {
  cleanupRuntime();
  const step = currentStep();
  const rt = (M().runtime = { t: 0, actors: [], car: null, spawned: false });
  const place = step.at ? PLACES[step.at] : null;
  switch (step.t) {
    case 'talk': showDialogue(step.who, step.lines, () => nextStep()); break;
    case 'wanted': setWanted(step.stars); emit('toast', step.text); nextStep(); break;
    case 'spawncar': {
      const spot = { x: place.x + 6, z: place.z };
      rt.car = spawnMissionCar(step.model, spot.x, spot.z, Math.PI / 2, 0xff3d3d);
      rt.car.stolenTarget = true;
      break;
    }
    case 'kill': {
      for (let i = 0; i < step.count; i++) {
        let x, z, tries = 0;
        do { x = place.x + randRange(-16, 16); z = place.z + randRange(-16, 16); tries++; } while (insideBuilding(x, z) && tries < 30);
        const a = spawnPedestrian(x, z, { role: 'gang', state: 'idle', weapon: i % 3 === 0 ? 'smg' : 'pistol', mission: true });
        rt.actors.push(a);
      }
      break;
    }
    case 'chase': {
      const from = PLACES[step.from] || PLACES.heightsLot;
      rt.car = spawnTargetCar(step.model, from.x, from.z + 4, step.hp, step.speed, step.color);
      emit('toast', 'TARGET SPOTTED');
      break;
    }
    default: break;
  }
}

export function failMission(reason) {
  const m = M();
  if (!m.active) return;
  const rt = m.runtime;
  if (rt) { for (const a of rt.actors || []) a.mission = null; if (rt.car && !rt.car.dead) removeVehicle(rt.car); }
  m.runtime = null;
  emit('mission-failed', { mission: m.active, reason });
  m.active = null;
  m.step = 0;
}

function completeMission() {
  const m = M();
  const mission = m.active;
  cleanupRuntime();
  m.active = null;
  m.completed.push(mission.id);
  m.index = Math.max(m.index, MISSIONS.indexOf(mission) + 1);
  G.cash += mission.reward;
  G.stats.missions++;
  if (mission.weapon) { G.weapons[mission.weapon] = true; G.ammo[mission.weapon] += mission.weapon === 'rocket' ? 8 : 120; }
  emit('mission-passed', mission);
}

export function getObjective() {
  const step = currentStep();
  if (!step) return null;
  const rt = M().runtime;
  let pos = step.at ? PLACES[step.at] : null;
  if (step.t === 'spawncar' && rt?.car) pos = rt.car;
  if (step.t === 'chase' && rt?.car) pos = rt.car;
  if (step.t === 'kill' && rt) { const live = rt.actors.filter((a) => !a.dead); pos = live[0] || pos; }
  if (step.t === 'getcar' || step.t === 'lose') pos = null;
  return { text: step.text || '', pos, step };
}

export function updateMission(dt) {
  const m = M();
  const step = currentStep();
  const p = G.player;
  if (!step || !m.runtime || p.dead) return;
  const rt = m.runtime;
  rt.t += dt;
  const place = step.at ? PLACES[step.at] : null;
  switch (step.t) {
    case 'goto':
      if (dist(p, place) < step.r && (!step.needVehicle || p.inCar)) nextStep();
      break;
    case 'getcar': if (p.inCar) nextStep(); break;
    case 'spawncar': if (p.inCar === rt.car) nextStep(); break;
    case 'deliver':
      if (p.inCar && (!step.needVehicle || p.inCar.model === step.needVehicle) && dist(p, place) < step.r) nextStep();
      break;
    case 'kill': {
      for (const a of rt.actors) {
        if (a.dead || a.state !== 'idle') continue;
        if (dist(a, p) < 34) { a.state = 'fight'; a.threat = p; }
      }
      if (rt.actors.every((a) => a.dead)) nextStep();
      break;
    }
    case 'chase':
      if (rt.car.dead || p.inCar === rt.car) nextStep();
      else if (dist(rt.car, p) > 330) { emit('toast', 'TARGET ESCAPED'); failMission('The target got away.'); }
      break;
    case 'lose': if (G.wanted === 0 && rt.t > 3) nextStep(); break;
    case 'hold': {
      if (dist(p, place) < step.r + 4) {
        rt.hold = (rt.hold || 0) + dt;
        if (!rt.spawned && rt.hold > 2) {
          rt.spawned = true;
          for (let i = 0; i < 3; i++) { const a = spawnPedestrian(place.x + randRange(-14, 14), place.z + randRange(-14, 14), { role: 'gang', state: 'fight', weapon: 'smg' }); a.threat = p; }
        }
        if (rt.hold >= step.seconds) nextStep();
      } else rt.hold = Math.max(0, (rt.hold || 0) - dt);
      break;
    }
    default: break;
  }
  void rand;
}

export function installMissionEvents() {
  on('player-down', () => { if (M().active) failMission('You went down.'); });
  on('busted', () => { if (M().active) failMission('Busted.'); });
}

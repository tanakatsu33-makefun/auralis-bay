// The three non-cover screenshot scenes: a mission shootout on foot, a story cutscene, and the title screen.
import { G } from '../core/game-state.js';
import { input } from '../core/input-controls.js';
import { emit } from '../core/event-bus.js';
import { setMode } from '../core/game-flow.js';
import { placePlayer } from '../player/player-character.js';
import { spawnVehicle } from '../vehicles/vehicle-factory.js';
import { spawnPedestrian } from '../traffic/pedestrians.js';
import { populateInstantly } from '../traffic/traffic-spawner.js';
import { spawnPatrolCar } from '../police/dispatch.js';
import { setWanted } from '../police/wanted-level.js';
import { startMission, jumpToStep } from '../missions/mission-runner.js';
import { camState } from '../feel/camera-rig.js';
import { PLACES } from '../missions/story-arc.js';
import { MISSIONS } from '../missions/mission-scripts.js';
import { explodeVehicle } from '../vehicles/vehicle-damage.js';
import { setDialogueStatic } from '../ui/dialogue-box.js';
import { showList } from '../missions/mission-board.js';
import { saveToSlot } from '../save/save-slots.js';
import { refreshTitle } from '../ui/title-screen.js';
import { advance, baseProgress, removeAllNonEssential } from './shot-helpers.js';

async function sceneCombat() {
  baseProgress();
  G.mission.index = 2;
  G.mission.completed = ['m1', 'm2'];
  const p = G.player;
  const dock = PLACES.gullDock;
  setMode('play');
  placePlayer(dock.x - 25, dock.z - 1, Math.PI / 2);
  p.invulnerable = true; p.hp = 72; p.armor = 40;
  camState.yaw = Math.PI / 2; camState.pitch = 0.12;
  removeAllNonEssential(null);
  populateInstantly(p, 10, 8, 16);
  startMission(2);
  advance(0.2);
  const crew = G.mission.runtime.actors;
  crew.forEach((a, i) => { a.x = p.x + 11 + (i % 4) * 4.5; a.z = dock.z - 1 + (i < 4 ? -3 : 3.5) + (i % 2) * 1.2; a.state = 'fight'; a.threat = p; a.heading = -Math.PI / 2; });
  const wreck = spawnVehicle('brisa', p.x + 30, dock.z - 6, 1.2, { color: 0x4aa3a0 });
  setWanted(2);
  for (let i = 0; i < 3; i++) { const a = spawnPedestrian(dock.x - 4 + i * 6, dock.z + 9, { role: 'civilian', state: 'flee' }); a.threat = { x: dock.x, z: dock.z }; }
  spawnPatrolCar('x', 10, dock.x - 110, 1);
  input.buttons[2] = true;
  advance(0.5, () => { camState.yaw = Math.PI / 2; });
  explodeVehicle(wreck);
  advance(2.3, () => {
    camState.yaw = Math.PI / 2 - 0.05;
    input.buttons[0] = true; input.clicked[0] = true;
    p.hp = Math.max(p.hp, 60);
  });
  input.buttons[2] = true;
  emit('banner', 'SHOOTOUT AT THE IRON GULL DOCKS');
}

async function sceneStory() {
  baseProgress();
  G.mission.index = 5;
  G.mission.completed = ['m1', 'm2', 'm3', 'm4', 'm5'];
  G.weapon = 'pistol';
  const p = G.player;
  const tower = PLACES.tower;
  setMode('play');
  placePlayer(457.5, 205, -0.5);
  p.invulnerable = true; p.armor = 60;
  camState.yaw = -0.55; camState.pitch = -0.32;
  removeAllNonEssential(null);
  populateInstantly(p, 8, 6, 10);
  spawnVehicle('bulwark', 452, 222, 0, { color: 0x2b2b3a });
  spawnPedestrian(452, 196, { role: 'gang', state: 'idle', weapon: 'smg' });
  spawnPedestrian(462, 214, { role: 'civilian', state: 'idle' });
  startMission(5);
  jumpToStep(3);
  advance(1.2, () => { camState.yaw = -0.55; camState.pitch = -0.32; });
  setDialogueStatic('silas', MISSIONS[5].steps[3].lines, 0, true);
  showList(true);
  document.getElementById('toast').classList.remove('show');
}

async function sceneTitle() {
  baseProgress();
  const p = G.player;
  saveToSlot(1);
  G.cash = 3120; G.mission.completed = ['m1']; G.mission.index = 1;
  saveToSlot(2);
  placePlayer(270, 200, 0);
  p.mesh.visible = false;
  removeAllNonEssential(null);
  populateInstantly(p, 36, 16, 50);
  setMode('title');
  refreshTitle();
  advance(8);
  document.getElementById('btn-slots').click();
}

export const SCENES_EXTRA = { combat: sceneCombat, story: sceneStory, title: sceneTitle };

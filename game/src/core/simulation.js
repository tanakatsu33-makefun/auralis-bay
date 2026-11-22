// One simulation step and one render pass, shared by the live loop and the deterministic screenshot director.
import { G } from './game-state.js';
import { input, wasTapped, endInputFrame } from './input-controls.js';
import { updatePlayer } from '../player/player-character.js';
import { updateVehicles } from '../vehicles/vehicle-manager.js';
import { updatePedestrians } from '../traffic/pedestrians.js';
import { updatePopulation } from '../traffic/traffic-spawner.js';
import { updateProjectiles } from '../combat/projectiles.js';
import { updateWanted } from '../police/wanted-level.js';
import { updateDispatch } from '../police/dispatch.js';
import { updateHelicopter } from '../police/helicopter.js';
import { updatePoliceLights } from '../police/police-driver.js';
import { updateMission } from '../missions/mission-runner.js';
import { updateMissionBoard } from '../missions/mission-board.js';
import { updatePointsOfInterest } from '../world/points-of-interest.js';
import { updateDialogue } from '../ui/dialogue-box.js';
import { updateParticles } from '../fx/particles.js';
import { updateTracers } from '../fx/tracers.js';
import { updateCamera } from '../feel/camera-rig.js';
import { titleCamera } from '../ui/title-screen.js';
import { updateHud } from '../ui/hud.js';
import { updateMinimap } from '../ui/minimap.js';
import { updateSfx, audio } from '../audio/sfx-synth.js';
import { nextStation } from '../audio/radio-stations.js';
import { tryEnterCar, exitCar } from '../vehicles/carjack.js';
import { nearShop } from '../world/points-of-interest.js';
import { saveToSlot } from '../save/save-slots.js';
import { togglePause } from './game-flow.js';
import { onPauseOpened } from '../ui/pause-menu.js';
import { lampFlicker } from '../fx/street-life.js';
import { on } from './event-bus.js';

export const sim = { world: null, paused: false, lockLostAt: -1 };

on('pointer-lock-lost', () => {
  if (G.mode !== 'play') return;
  sim.lockLostAt = performance.now();
  togglePause();
  onPauseOpened();
});

function handleGlobalKeys() {
  const p = G.player;
  if (wasTapped('Escape') && performance.now() - sim.lockLostAt > 250) { togglePause(); if (G.mode === 'paused') onPauseOpened(); }
  if (G.mode !== 'play') return;
  if (wasTapped('KeyF') || (wasTapped('KeyE') && !(nearShop(p) && !p.inCar))) {
    if (p.inCar) exitCar(p); else tryEnterCar(p);
  }
  if (wasTapped('KeyQ')) nextStation();
  if (wasTapped('F5')) saveToSlot(G.slot || 1);
}

export function stepSimulation(dt) {
  if (G.mode === 'paused' || G.mode === 'loading') return;
  G.time += dt;
  G.dt = dt;
  if (G.mode === 'play' || G.mode === 'dialogue') G.playTime = (G.playTime || 0) + dt;
  const p = G.player;
  if (G.mode === 'play') updatePlayer(dt);
  else if (G.mode === 'dialogue') { if (p.inCar) { p.inCar.input.throttle = 0; p.inCar.input.brake = 0.5; } p.speed = 0; p.vx = p.vz = 0; }
  updateVehicles(dt);
  updatePedestrians(dt);
  updatePopulation(dt, G.mode === 'title' ? 0.9 : 1);
  updateProjectiles(dt);
  if (G.mode === 'play' || G.mode === 'dialogue') {
    updateWanted(dt);
    updateDispatch(dt);
    updateHelicopter(dt);
    updateMission(dt);
    updateMissionBoard(dt);
    updatePointsOfInterest(dt);
    updateDialogue(dt);
  }
  updatePoliceLights(G.time);
  lampFlicker(G.time);
}

export function renderFrame(dt) {
  const { world } = sim;
  const p = G.player;
  if (G.mode === 'title') titleCamera(G.time, world.camera);
  else updateCamera(dt, world.camera);
  updateParticles(dt, window.innerHeight * (window.devicePixelRatio > 1.5 ? 1.5 : window.devicePixelRatio || 1));
  updateTracers(dt);
  world.tick(dt, G.mode === 'title' ? world.camera.position.x : p.x, G.mode === 'title' ? world.camera.position.z : p.z);
  world.post.uniforms.flash.value = p.hurtT > 0 ? p.hurtT * 2.2 : 0;
  if (G.mode !== 'title') { updateHud(dt); updateMinimap(); }
  if (audio.ctx) {
    updateSfx(dt);
    audio.music.gain.setTargetAtTime(p.inCar ? 0.35 : 0.12, audio.ctx.currentTime, 0.3);
  }
  world.render();
}

export function frameHandlers() {
  handleGlobalKeys();
}

export function finishFrame() {
  endInputFrame();
}

export { input };

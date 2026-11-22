// Entry point: boots every system in order, shows the title screen, then runs the fixed-step game loop.
import { createWorld } from './world/scene-setup.js';
import { G } from './core/game-state.js';
import { seedRandom } from './core/seeded-random.js';
import { installInput } from './core/input-controls.js';
import { installParticles } from './fx/particles.js';
import { installTracers } from './fx/tracers.js';
import { installSkidMarks } from './fx/skid-marks.js';
import { installHelicopter } from './police/helicopter.js';
import { installExplosions } from './combat/explosions.js';
import { installPedestrianReactions } from './traffic/pedestrians.js';
import { installWantedRules } from './police/wanted-level.js';
import { installMissionEvents } from './missions/mission-runner.js';
import { installMissionBoard } from './missions/mission-board.js';
import { installPointsOfInterest } from './world/points-of-interest.js';
import { installHud } from './ui/hud.js';
import { installMinimap } from './ui/minimap.js';
import { installSfxEvents } from './audio/sfx-synth.js';
import { installGameFlow, setMode } from './core/game-flow.js';
import { installTitleScreen } from './ui/title-screen.js';
import { installPauseMenu } from './ui/pause-menu.js';
import { createPlayer } from './player/player-character.js';
import { populateInstantly } from './traffic/traffic-spawner.js';
import { stepSimulation, renderFrame, frameHandlers, finishFrame, sim } from './core/simulation.js';
import { runShot } from './screenshot/shot-director.js';

const params = new URLSearchParams(location.search);
seedRandom(Number(params.get('seed') || 7));
G.shot = params.get('shot');

const world = createWorld(document.getElementById('viewport'));
sim.world = world;
const { scene } = world;
installInput(world.renderer.domElement);
installParticles(scene);
installTracers(scene);
installSkidMarks(scene);
installHelicopter(scene);
installExplosions();
installPedestrianReactions();
installWantedRules();
installMissionEvents();
installMissionBoard();
installPointsOfInterest();
installHud();
installMinimap();
installSfxEvents();
installGameFlow();
installTitleScreen();
installPauseMenu();

const player = createPlayer(5.5 * 64, 6 * 64 + 9);
player.mesh.visible = false;
populateInstantly(player, 30, 14, 40);
document.getElementById('loading').classList.add('hidden');
setMode('title');

const STEP = 1 / 60;
let acc = 0, last = performance.now();

function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += real;
  frameHandlers();
  let steps = 0;
  while (acc >= STEP && steps < 4) { stepSimulation(STEP); acc -= STEP; steps++; }
  if (steps === 4) acc = 0;
  renderFrame(real);
  finishFrame();
  requestAnimationFrame(frame);
}

if (G.shot) {
  runShot(G.shot, world).then(() => { window.__shotReady = true; });
} else {
  requestAnimationFrame(frame);
}
window.__game = { G, stepSimulation, renderFrame };

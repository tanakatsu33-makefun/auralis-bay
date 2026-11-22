// Steps every vehicle each frame: picks the right driver (traffic / police / player), runs physics, damage and collisions.
import { G } from '../core/game-state.js';
import { stepVehicle, resolveVehiclePairs } from './vehicle-physics.js';
import { updateVehicleDamage } from './vehicle-damage.js';
import { driveTraffic } from '../traffic/traffic-ai.js';
import { drivePolice } from '../police/police-driver.js';
import { driveTarget } from '../missions/mission-vehicles.js';
import { updateSkidMarks } from '../fx/skid-marks.js';

export function updateVehicles(dt) {
  const list = G.vehicles;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.dead) {
      if (v.ai === 'traffic') driveTraffic(v, dt);
      else if (v.ai === 'police') drivePolice(v, dt);
      else if (v.ai === 'target') driveTarget(v, dt);
      else if (v.driver !== 'player' && !v.parked) { v.input.throttle = 0; v.input.steer *= 0.9; }
    }
    stepVehicle(v, dt);
    updateVehicleDamage(v, dt);
  }
  resolveVehiclePairs();
  updateSkidMarks(list);
}

// Entering, leaving and stealing cars. Occupied traffic cars are carjacked: the driver is yanked out
// and either flees or (for police) fights back, and witnesses raise the wanted level.
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';
import { rand } from '../core/seeded-random.js';
import { nearestVehicle } from './vehicle-factory.js';
import { collideCircle } from '../world/city-generator.js';
import { spawnPedestrian } from '../traffic/pedestrians.js';
import { camState } from '../feel/camera-rig.js';

export function nearestEnterable(p) {
  return nearestVehicle(p.x, p.z, 3.6, (v) => !v.dead && v !== p.inCar && Math.abs(v.speed) < 14);
}

export function tryEnterCar(p) {
  if (p.inCar || p.enterCooldown > 0) return false;
  const v = nearestEnterable(p);
  if (!v) return false;
  const occupied = v.ai === 'traffic' || v.ai === 'police' || v.ai === 'gang' || v.ai === 'target';
  if (occupied) {
    const side = Math.sign((v.x - p.x) * Math.cos(v.heading) - (v.z - p.z) * Math.sin(v.heading)) || 1;
    const driver = spawnPedestrian(v.x + Math.cos(v.heading) * -side * 1.6, v.z - Math.sin(v.heading) * -side * 1.6, {
      role: v.ai === 'police' ? 'cop' : v.ai === 'gang' ? 'gang' : 'civilian', state: v.ai === 'traffic' ? 'flee' : 'fight',
    });
    driver.threat = p;
    emit('carjack', { vehicle: v, driver, victimRole: driver.role });
    G.stats.carjacks++;
    v.ai = null; v.aiState = null;
  } else if (v.parked && rand() < 0.5) emit('car-alarm', { vehicle: v });
  v.parked = false;
  v.stolen = true;
  v.driver = 'player';
  v.input.throttle = 0; v.input.steer = 0;
  p.inCar = v;
  p.enterCooldown = 0.5;
  camState.yaw = v.heading;
  emit('enter-car', { vehicle: v });
  return true;
}

export function exitCar(p) {
  const v = p.inCar;
  if (!v || p.enterCooldown > 0) return false;
  if (Math.abs(v.speed) > 9) return false;
  const c = Math.cos(v.heading), s = Math.sin(v.heading);
  const probe = { x: 0, z: 0 };
  for (const side of [1, -1]) {
    probe.x = v.x + c * side * 2.0; probe.z = v.z - s * side * 2.0;
    const ox = probe.x, oz = probe.z;
    collideCircle(probe, 0.45);
    if (Math.hypot(probe.x - ox, probe.z - oz) < 0.2) {
      p.x = probe.x; p.z = probe.z;
      finishExit(p, v);
      return true;
    }
  }
  p.x = v.x + c * 2.0; p.z = v.z - s * 2.0;
  finishExit(p, v);
  return true;
}

function finishExit(p, v) {
  v.driver = null;
  v.input.throttle = 0; v.input.steer = 0; v.input.handbrake = 1;
  p.inCar = null;
  p.speed = 0; p.vx = p.vz = 0;
  p.enterCooldown = 0.5;
  p.heading = v.heading;
  camState.yaw = v.heading;
  emit('exit-car', { vehicle: v });
}

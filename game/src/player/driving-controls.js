// Translates keyboard state into the vehicle's throttle / steer / handbrake inputs while the player drives.
import { isDown, axis } from '../core/input-controls.js';
import { clamp, damp } from '../core/math-utils.js';
import { emit } from '../core/event-bus.js';
import { G } from '../core/game-state.js';

export function updateDriving(p, car, dt) {
  const inp = car.input;
  if (G.mode !== 'play') { inp.throttle = 0; inp.handbrake = 0; return; }
  inp.throttle = axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
  const wantSteer = axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']) * -1; // positive = left turn
  // ease the wheel in and recentre it faster than it turns, like a real rack
  const rate = wantSteer === 0 ? 12 : 7;
  inp.steer = clamp(damp(inp.steer, wantSteer, rate, dt), -1, 1);
  inp.handbrake = isDown('Space') ? 1 : 0;
  inp.brake = 0;
  car.honk = isDown('KeyH');
  if (car.honk) emit('horn', { vehicle: car });
}

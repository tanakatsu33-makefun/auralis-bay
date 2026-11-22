// Traffic driver: keeps a car in its right-hand lane, picks turns at intersections, yields to the right and brakes for obstacles.
import { G } from '../core/game-state.js';
import { rand, chance } from '../core/seeded-random.js';
import { clamp, angleDiff } from '../core/math-utils.js';
import { PITCH, BLOCKS, laneOffset } from '../world/city-grid.js';

export function routeHeading(axis, dir) {
  return axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
}

export function laneCoord(st) {
  return st.k * PITCH + (st.axis === 'x' ? laneOffset(st.dir) : -laneOffset(st.dir));
}

export function makeRoute(axis, k, dir) {
  return { axis, k, dir, decidedNode: -999, turn: null, speedTarget: 9 + rand() * 6, ignoreYield: 0, reverseT: 0 };
}

const TURN_RIGHT = { 'x1': ['z', 1], 'z1': ['x', -1], 'x-1': ['z', -1], 'z-1': ['x', 1] };
const TURN_LEFT = { 'x1': ['z', -1], 'z1': ['x', 1], 'x-1': ['z', 1], 'z-1': ['x', -1] };

function chooseTurn(st, nk) {
  const options = [];
  const ahead = nk + st.dir;
  if (ahead >= 0 && ahead <= BLOCKS) options.push(['straight', 5]);
  const key = st.axis + st.dir;
  for (const [name, table, weight] of [['right', TURN_RIGHT, 2], ['left', TURN_LEFT, 2]]) {
    const d = table[key][1];
    const okRange = d > 0 ? st.k < BLOCKS : st.k > 0;
    if (okRange) options.push([name, weight]);
  }
  if (!options.length) return 'uturn';
  if (st.chase) { // pursuers prefer the turn that points at the target
    const nodeX = st.axis === 'x' ? nk * PITCH : st.k * PITCH, nodeZ = st.axis === 'x' ? st.k * PITCH : nk * PITCH;
    for (const o of options) {
      let hx, hz;
      if (o[0] === 'straight') { hx = st.axis === 'x' ? st.dir : 0; hz = st.axis === 'z' ? st.dir : 0; }
      else { const [ax, d] = (o[0] === 'right' ? TURN_RIGHT : TURN_LEFT)[key]; hx = ax === 'x' ? d : 0; hz = ax === 'z' ? d : 0; }
      const dot = ((st.chase.x - nodeX) * hx + (st.chase.z - nodeZ) * hz) / (Math.hypot(st.chase.x - nodeX, st.chase.z - nodeZ) + 1);
      o[1] = Math.max(0.05, o[1] * (0.2 + (dot + 1) * 1.6));
    }
  }
  let total = options.reduce((s, o) => s + o[1], 0), r = rand() * total;
  for (const [name, w] of options) { r -= w; if (r <= 0) return name; }
  return options[0][0];
}

function findObstacle(v, st) {
  const sh = Math.sin(v.heading), ch = Math.cos(v.heading);
  const look = 7 + Math.max(0, v.speed) * 1.0;
  let nearest = 99;
  const consider = (x, z, hx, hz, moving, isCar) => {
    const dx = x - v.x, dz = z - v.z;
    const fx = dx * sh + dz * ch;
    if (fx < 0.5 || fx > look) return;
    const lx = dx * ch - dz * sh;
    if (Math.abs(lx) > (isCar ? 2.2 : 1.7)) {
      // perpendicular traffic coming from the right: give way
      if (!isCar || st.ignoreYield > 0 || lx > -1 || lx < -9 || fx > 12) return;
      const cross = Math.abs(hx * ch - hz * sh) > 0.7 || false;
      if (!cross || !moving) return;
    }
    nearest = Math.min(nearest, fx - (isCar ? 4.2 : 2.5));
  };
  for (const o of G.vehicles) {
    if (o === v || o.removed) continue;
    const dx = o.x - v.x, dz = o.z - v.z;
    if (dx * dx + dz * dz > 400) continue;
    consider(o.x, o.z, Math.sin(o.heading), Math.cos(o.heading), Math.abs(o.speed) > 1.5, true);
  }
  for (const a of G.peds) {
    if (a.dead && a.deadT > 2) continue;
    const dx = a.x - v.x, dz = a.z - v.z;
    if (dx * dx + dz * dz > 400) continue;
    consider(a.x, a.z, 0, 0, true, false);
  }
  const p = G.player;
  if (p && !p.inCar) consider(p.x, p.z, 0, 0, true, false);
  return nearest;
}

export function driveTraffic(v, dt) {
  const st = v.aiState;
  if (!st) return;
  const inp = v.input;
  const along = st.axis === 'x' ? v.x : v.z;
  const lane = laneCoord(st);
  const nextIdx = st.dir > 0 ? Math.floor(along / PITCH) + 1 : Math.ceil(along / PITCH) - 1;
  const nextC = nextIdx * PITCH;
  const distNode = (nextC - along) * st.dir;
  if (distNode < 14 && st.decidedNode !== nextIdx && nextIdx >= 0 && nextIdx <= BLOCKS) {
    st.decidedNode = nextIdx;
    st.turn = chooseTurn(st, nextIdx);
    st.node = nextIdx;
  }
  if (st.turn && st.turn !== 'straight' && st.node === nextIdx) {
    if (st.turn === 'uturn') { st.dir = -st.dir; st.turn = null; }
    else {
      const [nax, ndir] = (st.turn === 'right' ? TURN_RIGHT : TURN_LEFT)[st.axis + st.dir];
      const newLane = nextC + (nax === 'x' ? laneOffset(ndir) : -laneOffset(ndir));
      if ((newLane - along) * st.dir <= 0.2) {
        const oldK = st.k;
        st.axis = nax; st.dir = ndir; st.k = nextIdx; st.turn = null; st.decidedNode = -999;
        void oldK;
      }
    }
  }
  const slowForTurn = st.turn && st.turn !== 'straight' && distNode < 16;
  let speedTarget = slowForTurn ? 6 : st.speedTarget;
  const gap = findObstacle(v, st);
  if (gap < 30) speedTarget = Math.min(speedTarget, st.chase ? Math.max(8, gap * 2) : Math.max(0, gap * 0.9));
  if (st.chase) speedTarget = Math.min(speedTarget, st.chaseSpeed || 24);
  const aheadLook = 6 + Math.abs(v.speed) * 0.45;
  const tAlong = (st.axis === 'x' ? v.x : v.z) + st.dir * aheadLook;
  const tx = st.axis === 'x' ? tAlong : lane, tz = st.axis === 'x' ? lane : tAlong;
  const want = Math.atan2(tx - v.x, tz - v.z);
  let steer = clamp(angleDiff(v.heading, want) * 2.4, -1, 1);
  if (st.reverseT > 0) { st.reverseT -= dt; inp.throttle = -0.8; inp.steer = -steer; inp.brake = 0; return; }
  const err = speedTarget - v.speed;
  inp.steer = steer;
  inp.throttle = clamp(err * 0.45, -1, 1);
  inp.brake = err < -2.5 ? 0.7 : 0;
  inp.handbrake = 0;
  st.ignoreYield = Math.max(0, st.ignoreYield - dt);
  if (Math.abs(v.speed) < 0.6 && speedTarget > 1) {
    v.stuckT += dt;
    if (v.stuckT > 3) { st.ignoreYield = 3; if (v.stuckT > 5.5) { st.reverseT = 1.1; v.stuckT = 0; } }
  } else v.stuckT = 0;
}

export function randomTurnBias() { return chance(0.5); }

// Small numeric helpers shared by every system.
export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(current, target, rate, dt) {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function angleDiff(from, to) {
  return wrapAngle(to - from);
}

export function dampAngle(current, target, rate, dt) {
  return current + angleDiff(current, target) * (1 - Math.exp(-rate * dt));
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function headingOf(dx, dz) {
  return Math.atan2(dx, dz);
}

export function forwardOf(heading, out = { x: 0, z: 0 }) {
  out.x = Math.sin(heading);
  out.z = Math.cos(heading);
  return out;
}

export function smoothstep(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function fmtMoney(n) {
  return '$' + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

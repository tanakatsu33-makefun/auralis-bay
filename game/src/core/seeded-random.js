// Deterministic random numbers: every system draws from here so ?seed=N reproduces a scene.
let state = 123456789;

export function seedRandom(seed) {
  state = (Math.floor(seed * 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
}

export function rand() {
  // mulberry32
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(a, b) {
  return a + (b - a) * rand();
}

export function randInt(a, b) {
  return Math.floor(randRange(a, b + 1));
}

export function pick(list) {
  return list[Math.floor(rand() * list.length) % list.length];
}

export function chance(p) {
  return rand() < p;
}

export function randSign() {
  return rand() < 0.5 ? -1 : 1;
}

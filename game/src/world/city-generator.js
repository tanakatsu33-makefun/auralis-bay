// Procedural city generator: fills every block with lots/buildings and answers collision queries.
import { rand, randRange, pick, chance } from '../core/seeded-random.js';
import { PITCH, ROAD_W, BLOCKS, SIDEWALK, districtOfBlock, SIZE } from './city-grid.js';

export const city = { buildings: [], parks: [], blocks: [], grid: new Map(), landmarks: [] };

const CELL = 16;
const PALETTES = {
  wharf: [0xff8fa3, 0xffd6a5, 0x9be7ff, 0xfff1c9, 0xc9a7ff],
  palm: [0xffe2c2, 0xf7b7a3, 0xcde8d0, 0xfff3d6, 0xe8c1ff],
  lantern: [0xd96c5c, 0xe8a05a, 0x8a5c9e, 0xc4476f, 0xf2c078],
  heights: [0x5ec8d8, 0x7a8cff, 0xd8e6f2, 0x9a7be0, 0x4bb3c9],
  copper: [0xb57a52, 0x8f6a5a, 0xc89066, 0x7a6a7a, 0xa88a6a],
  ridge: [0xf0c9a0, 0xe8a07a, 0xd6b8e0, 0xf6e2b8, 0xc8a090],
};

function addBuilding(b) {
  b.minX = b.x - b.w / 2; b.maxX = b.x + b.w / 2;
  b.minZ = b.z - b.d / 2; b.maxZ = b.z + b.d / 2;
  city.buildings.push(b);
  for (let cx = Math.floor(b.minX / CELL); cx <= Math.floor(b.maxX / CELL); cx++) {
    for (let cz = Math.floor(b.minZ / CELL); cz <= Math.floor(b.maxZ / CELL); cz++) {
      const key = cx * 4096 + cz;
      let list = city.grid.get(key);
      if (!list) city.grid.set(key, (list = []));
      list.push(b);
    }
  }
}

function heightFor(d) {
  switch (d.id) {
    case 'heights': return randRange(38, 110);
    case 'lantern': return randRange(12, 30);
    case 'copper': return randRange(7, 15);
    case 'wharf': return randRange(8, 22);
    case 'ridge': return randRange(14, 34);
    default: return randRange(6, 14);
  }
}

function makeLots(x0, z0, size, d) {
  const lots = [];
  const mode = d.id === 'copper' ? (chance(0.5) ? 1 : 2) : d.id === 'heights' ? (chance(0.55) ? 1 : 4) : pick([1, 2, 2, 4, 4]);
  const gap = 2;
  if (mode === 1) lots.push([x0, z0, size, size]);
  else if (mode === 2) {
    const s = randRange(0.4, 0.6) * size;
    if (chance(0.5)) { lots.push([x0, z0, s - gap / 2, size], [x0 + s + gap / 2, z0, size - s - gap / 2, size]); }
    else { lots.push([x0, z0, size, s - gap / 2], [x0, z0 + s + gap / 2, size, size - s - gap / 2]); }
  } else {
    const h = (size - gap) / 2;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) lots.push([x0 + a * (h + gap), z0 + b * (h + gap), h, h]);
  }
  return lots;
}

function fillBlock(i, j) {
  const d = districtOfBlock(i, j);
  const x0 = i * PITCH + ROAD_W / 2 + SIDEWALK;
  const z0 = j * PITCH + ROAD_W / 2 + SIDEWALK;
  const size = PITCH - ROAD_W - SIDEWALK * 2;
  const block = { i, j, d, cx: x0 + size / 2, cz: z0 + size / 2, size, park: false };
  city.blocks.push(block);
  if (d.id === 'palm' && (i + j) % 3 === 0 || (i === 6 && j === 1) || (i === 2 && j === 8) || (i === 10 && j === 10)) {
    block.park = true;
    city.parks.push(block);
    return;
  }
  for (const [lx, lz, lw, ld] of makeLots(x0, z0, size, d)) {
    const inset = randRange(0, 2.5);
    const w = lw - inset * 2, dd = ld - inset * 2;
    let h = heightFor(d);
    if (d.id === 'heights' && i === 6 && j === 4) h = 168; // Tidewatch Tower
    const b = {
      x: lx + lw / 2, z: lz + ld / 2, w, d: dd, h, district: d.id,
      color: pick(PALETTES[d.id]), tint: rand(), kind: d.id,
    };
    addBuilding(b);
    if (h > 160) city.landmarks.push({ name: 'Tidewatch Tower', x: b.x, z: b.z, h });
  }
}

export function generateCity() {
  city.buildings.length = 0; city.parks.length = 0; city.blocks.length = 0;
  city.grid.clear(); city.landmarks.length = 0;
  for (let i = 0; i < BLOCKS; i++) for (let j = 0; j < BLOCKS; j++) fillBlock(i, j);
  return city;
}

const near = [];
export function buildingsNear(x, z, r) {
  near.length = 0;
  for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
    for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
      const list = city.grid.get(cx * 4096 + cz);
      if (list) for (const b of list) if (!near.includes(b)) near.push(b);
    }
  }
  return near;
}

// Push a circle out of any building. Returns the deepest overlap info or null.
const hit = { nx: 0, nz: 0, depth: 0, building: null };
export function collideCircle(pos, r) {
  let found = false;
  hit.depth = 0;
  for (const b of buildingsNear(pos.x, pos.z, r + 1)) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    let dx = pos.x - cx, dz = pos.z - cz;
    let d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    let d = Math.sqrt(d2), nx, nz, depth;
    if (d > 1e-5) { nx = dx / d; nz = dz / d; depth = r - d; }
    else { // centre inside the box: exit by the nearest face
      const l = pos.x - b.minX, rr = b.maxX - pos.x, t = pos.z - b.minZ, bt = b.maxZ - pos.z;
      const m = Math.min(l, rr, t, bt);
      nx = m === l ? -1 : m === rr ? 1 : 0; nz = m === t ? -1 : m === bt ? 1 : 0;
      if (nx === 0 && nz === 0) nz = 1;
      depth = m + r;
    }
    pos.x += nx * depth; pos.z += nz * depth;
    if (depth > hit.depth) { hit.depth = depth; hit.nx = nx; hit.nz = nz; hit.building = b; }
    found = true;
  }
  return found ? hit : null;
}

export function lineBlocked(ax, az, bx, bz, step = 3) {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.floor(len / step));
  for (let k = 1; k < n; k++) {
    const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    for (const b of buildingsNear(x, z, 0.5)) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  }
  return false;
}

export function insideBuilding(x, z) {
  for (const b of buildingsNear(x, z, 0.5)) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return b;
  return null;
}

export const CITY_SIZE = SIZE;

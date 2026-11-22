// Geometry of Auralis Bay: a 12x12 block street grid on a headland, ocean to the west.
export const PITCH = 64;        // distance between road centre lines
export const ROAD_W = 16;       // road width
export const BLOCKS = 12;       // blocks per side
export const SIDEWALK = 3;      // sidewalk strip between road and lot
export const SIZE = PITCH * BLOCKS;
export const BEACH_X = -6;      // x where sand starts (ocean is x < BEACH_X - 30)

export const DISTRICTS = [
  { id: 'wharf', name: 'MARLIN WHARF', blurb: 'boardwalks and neon' },
  { id: 'palm', name: 'PALMGROVE', blurb: 'quiet villas' },
  { id: 'lantern', name: 'LANTERN QUARTER', blurb: 'old town and night markets' },
  { id: 'heights', name: 'SAFFRON HEIGHTS', blurb: 'glass towers' },
  { id: 'copper', name: 'COPPERLINE YARDS', blurb: 'docks and warehouses' },
  { id: 'ridge', name: 'EMBER RIDGE', blurb: 'hillside apartments' },
];

export function districtOfBlock(i, j) {
  if (i <= 1) return DISTRICTS[0];
  if (j >= 9) return DISTRICTS[4];
  if (i >= 4 && i <= 8 && j >= 2 && j <= 7) return DISTRICTS[3];
  if (i <= 3 && j <= 3) return DISTRICTS[1];
  if (i <= 4 && j >= 4) return DISTRICTS[2];
  if (i >= 9) return DISTRICTS[5];
  return DISTRICTS[1 + ((i + j) % 2 === 0 ? 0 : 4)];
}

export function districtAt(x, z) {
  const i = Math.floor(x / PITCH), j = Math.floor(z / PITCH);
  if (x < 0) return DISTRICTS[0];
  return districtOfBlock(Math.min(BLOCKS - 1, Math.max(0, i)), Math.min(BLOCKS - 1, Math.max(0, j)));
}

export function roadLine(k) {
  return k * PITCH;
}

// Which road lines are nearest to a coordinate.
export function nearestLine(v) {
  return Math.max(0, Math.min(BLOCKS, Math.round(v / PITCH)));
}

export function onRoad(x, z, margin = 0) {
  if (x < -ROAD_W || z < -ROAD_W || x > SIZE + ROAD_W || z > SIZE + ROAD_W) return false;
  const half = ROAD_W / 2 + margin;
  const rx = Math.abs(x - nearestLine(x) * PITCH);
  const rz = Math.abs(z - nearestLine(z) * PITCH);
  return rx < half || rz < half;
}

// Right-hand traffic lane centre for a road running along `axis` toward `dir`.
export function laneOffset(dir) {
  return dir > 0 ? 4 : -4;
}

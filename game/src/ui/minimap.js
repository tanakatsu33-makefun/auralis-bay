// Round, heading-up minimap drawn on a canvas: streets, blocks, sea, plus blips for police, objectives and shops.
import { G } from '../core/game-state.js';
import { PITCH, ROAD_W, BLOCKS, SIZE, BEACH_X } from '../world/city-grid.js';
import { city } from '../world/city-generator.js';
import { SHOPS, PLACES } from '../missions/story-arc.js';
import { missionStartPosition } from '../missions/mission-board.js';
import { getObjective } from '../missions/mission-runner.js';

const RANGE = 120; // metres from centre to rim
let canvas, g;

export function installMinimap() {
  canvas = document.getElementById('minimap');
  g = canvas.getContext('2d');
}

function blip(x, z, color, r, shape = 'dot') {
  const p = G.player;
  let dx = x - p.x, dz = z - p.z;
  const d = Math.hypot(dx, dz);
  const lim = RANGE - 7;
  if (d > lim) { dx *= lim / d; dz *= lim / d; }
  g.fillStyle = color;
  g.strokeStyle = '#140a2e';
  g.lineWidth = 3 / g.__scale;
  g.beginPath();
  if (shape === 'diamond') { g.moveTo(p.x + dx, p.z + dz - r * 1.5); g.lineTo(p.x + dx + r * 1.2, p.z + dz); g.lineTo(p.x + dx, p.z + dz + r * 1.5); g.lineTo(p.x + dx - r * 1.2, p.z + dz); g.closePath(); }
  else g.arc(p.x + dx, p.z + dz, r, 0, 7);
  g.stroke();
  g.fill();
}

export function updateMinimap() {
  const p = G.player;
  if (!p || !g) return;
  const S = canvas.width, c = S / 2, scale = c / RANGE;
  g.__scale = scale;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.clip();
  g.fillStyle = '#1b1240';
  g.fillRect(0, 0, S, S);
  g.translate(c, c);
  g.rotate(p.heading - Math.PI);
  g.scale(scale, scale);
  g.translate(-p.x, -p.z);
  // sea and beach
  g.fillStyle = '#25508f'; g.fillRect(-2000, -2000, 2000 + BEACH_X - 30, 4000 + SIZE);
  g.fillStyle = '#d9b98a'; g.fillRect(BEACH_X - 30, -200, 30, SIZE + 400);
  // blocks
  const x0 = p.x - RANGE * 1.5, x1 = p.x + RANGE * 1.5, z0 = p.z - RANGE * 1.5, z1 = p.z + RANGE * 1.5;
  for (const b of city.blocks) {
    const bx = b.i * PITCH + ROAD_W / 2, bz = b.j * PITCH + ROAD_W / 2, s = PITCH - ROAD_W;
    if (bx > x1 || bx + s < x0 || bz > z1 || bz + s < z0) continue;
    g.fillStyle = b.park ? '#2d7a4a' : b.d.id === 'heights' ? '#4a3a82' : b.d.id === 'copper' ? '#4a3340' : '#3b2a66';
    g.fillRect(bx, bz, s, s);
  }
  // main roads brighter than the rest
  g.fillStyle = '#e9b4a0';
  for (let k = 0; k <= BLOCKS; k++) {
    const w = k % 3 === 0 ? ROAD_W * 0.9 : ROAD_W * 0.55;
    g.fillStyle = k % 3 === 0 ? '#f2c9a8' : '#c88aa0';
    g.fillRect(k * PITCH - w / 2, -ROAD_W, w, SIZE + ROAD_W * 2);
    g.fillRect(-ROAD_W, k * PITCH - w / 2, SIZE + ROAD_W * 2, w);
  }
  // blips
  const start = missionStartPosition();
  if (start) blip(start.x, start.z, '#ffb347', 6, 'diamond');
  const obj = G.mission.active ? getObjective() : null;
  if (obj?.pos) blip(obj.pos.x, obj.pos.z, '#27e1c8', 6, 'diamond');
  for (const s of SHOPS) blip(PLACES[s.place].x, PLACES[s.place].z, s.blip, 3.5);
  const flash = Math.floor(G.time * 5) % 2 === 0;
  for (const v of G.vehicles) {
    if (v.dead) continue;
    const d = Math.hypot(v.x - p.x, v.z - p.z);
    if (v.ai === 'police' && v.siren) blip(v.x, v.z, flash ? '#ff3050' : '#4a8cff', 4.2);
    else if (v.ai === 'target') blip(v.x, v.z, '#ff3d8b', 5);
    else if (d < 60 && v !== p.inCar) blip(v.x, v.z, '#9a8abf', 2);
  }
  for (const a of G.peds) {
    if (a.dead) continue;
    if (a.role === 'cop' && G.wanted > 0) blip(a.x, a.z, flash ? '#ff3050' : '#4a8cff', 3);
    else if (a.role === 'gang') blip(a.x, a.z, '#ff3d8b', 3);
  }
  if (G.heli) blip(G.heli.x, G.heli.z, '#ffffff', 5.5);
  g.restore();
  // fixed player arrow and rim
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#fff3dc'; g.strokeStyle = '#140a2e'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(c, c - 16); g.lineTo(c + 11, c + 11); g.lineTo(c, c + 5); g.lineTo(c - 11, c + 11); g.closePath(); g.stroke(); g.fill();
  g.font = 'bold 28px sans-serif'; g.textAlign = 'center';
  g.fillStyle = '#ff3d8b'; // north marker on the rim
  g.fillText('N', c - Math.sin(p.heading) * (c - 24), c + Math.cos(p.heading) * (c - 24) + 10);
}

// Wanted level: crimes add "heat"; stars derive from heat; staying out of police sight cools it down.
import { G } from '../core/game-state.js';
import { on, emit } from '../core/event-bus.js';
import { lineBlocked } from '../world/city-generator.js';

export const STAR_THRESHOLDS = [0.95, 3, 5.5, 8.5, 12];
const MAX_HEAT = 14;

export function starsFromHeat(h) {
  let s = 0;
  for (const t of STAR_THRESHOLDS) if (h >= t) s++;
  return s;
}

export function addHeat(amount) {
  const before = G.wanted;
  G.heat = Math.min(MAX_HEAT, G.heat + amount);
  if (amount > 0) G.seenTimer = Math.min(G.seenTimer, 2);
  G.wanted = starsFromHeat(G.heat);
  if (G.wanted > before) emit('wanted-up', G.wanted);
}

export function setWanted(stars) {
  G.heat = stars <= 0 ? 0 : STAR_THRESHOLDS[stars - 1] + 0.05;
  G.wanted = stars;
}

export function clearWanted() {
  const had = G.wanted > 0;
  G.heat = 0; G.wanted = 0; G.seenTimer = 0;
  if (had) emit('wanted-cleared');
}

export function installWantedRules() {
  on('actor-killed', ({ actor, source }) => {
    if (source !== 'player') return;
    if (actor.role === 'civilian') addHeat(1.0);
    else if (actor.role === 'cop') addHeat(2.6);
    else if (actor.role === 'gang') addHeat(0.15);
  });
  on('actor-hit', ({ actor, source }) => {
    if (source === 'player' && actor.role === 'cop') addHeat(0.5);
    else if (source === 'player' && actor.role === 'civilian') addHeat(0.12);
  });
  on('ped-run-over', () => addHeat(0.2));
  on('carjack', ({ victimRole }) => addHeat(victimRole === 'cop' ? 2 : victimRole === 'gang' ? 0 : 0.6));
  on('explosion', (e) => { if (e.byPlayer) addHeat(0.9); });
  on('shot', (e) => { if (e.byPlayer && e.weapon !== 'fists') addHeat(0.03); });
  on('crash', (e) => {
    const v = e.vehicle;
    if (v && v.driver === 'player' && e.other && (e.other.ai === 'traffic' || e.other.ai === 'police')) addHeat(e.other.ai === 'police' ? 0.5 : 0.1 + e.force * 0.02);
  });
}

// Called each frame: police that can see the player keep the heat up; otherwise it cools.
export function updateWanted(dt) {
  const p = G.player;
  if (!p || p.dead) return;
  if (G.wanted > 0) {
    let seen = false;
    for (const v of G.vehicles) {
      if (v.ai !== 'police' || v.dead) continue;
      const d = Math.hypot(v.x - p.x, v.z - p.z);
      if (d < 70 && !lineBlocked(v.x, v.z, p.x, p.z, 6)) { seen = true; break; }
    }
    if (!seen) for (const a of G.peds) {
      if (a.role !== 'cop' || a.dead) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d < 60 && !lineBlocked(a.x, a.z, p.x, p.z, 6)) { seen = true; break; }
    }
    if (G.heli && !G.heli.dead && G.heli.sees) seen = true;
    if (seen) G.seenTimer = 0; else G.seenTimer += dt;
    if (G.seenTimer > 7) {
      G.heat -= dt * (0.9 + G.seenTimer * 0.03);
      if (G.heat < 0) G.heat = 0;
      const stars = starsFromHeat(G.heat);
      if (stars < G.wanted) G.wanted = stars;
      if (G.wanted === 0) { G.heat = 0; emit('wanted-cleared'); }
    }
  } else if (G.heat > 0) {
    G.heat = Math.max(0, G.heat - dt * 0.12);
  }
}

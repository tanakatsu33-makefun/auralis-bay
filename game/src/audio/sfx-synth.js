// Procedural sound effects on WebAudio: engine, sirens, gunshots, blasts, crashes, horn, rotor. No audio files.
import { G } from '../core/game-state.js';
import { on } from '../core/event-bus.js';

export const audio = { ctx: null, master: null, sfx: null, music: null, noise: null };
let engine = null, siren = null, rotor = null, hornNodes = null, wind = null;

export function initAudio() {
  if (audio.ctx) { audio.ctx.resume?.(); return audio.ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  audio.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  audio.master = ctx.createGain();
  audio.master.gain.value = 0.8;
  audio.sfx = ctx.createGain(); audio.sfx.gain.value = 0.9;
  audio.music = ctx.createGain(); audio.music.gain.value = 0.35;
  audio.sfx.connect(audio.master); audio.music.connect(audio.master);
  audio.master.connect(comp); comp.connect(ctx.destination);
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  audio.noise = buf;
  buildEngine(ctx); buildSiren(ctx); buildRotor(ctx); buildHorn(ctx);
  return ctx;
}

function osc(ctx, type, freq) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); return o; }
function noiseSrc(ctx, loop = true) { const s = ctx.createBufferSource(); s.buffer = audio.noise; s.loop = loop; return s; }

function buildEngine(ctx) {
  const a = osc(ctx, 'sawtooth', 60), b = osc(ctx, 'square', 30);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
  const g = ctx.createGain(); g.gain.value = 0;
  a.connect(f); b.connect(f); f.connect(g); g.connect(audio.sfx);
  engine = { a, b, f, g };
  const ns = noiseSrc(ctx); const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 900;
  const ng = ctx.createGain(); ng.gain.value = 0; ns.connect(nf); nf.connect(ng); ng.connect(audio.sfx); ns.start();
  wind = { g: ng, f: nf };
}

function buildSiren(ctx) {
  const o = osc(ctx, 'triangle', 800), o2 = osc(ctx, 'sine', 1200);
  const g = ctx.createGain(); g.gain.value = 0;
  o.connect(g); o2.connect(g); g.connect(audio.sfx);
  siren = { o, o2, g };
}

function buildRotor(ctx) {
  const s = noiseSrc(ctx); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 160; f.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.value = 0;
  const lfo = osc(ctx, 'sine', 13); const lg = ctx.createGain(); lg.gain.value = 0.5;
  lfo.connect(lg); lg.connect(g.gain);
  s.connect(f); f.connect(g); g.connect(audio.sfx); s.start();
  rotor = { g };
}

function buildHorn(ctx) {
  const a = osc(ctx, 'square', 392), b = osc(ctx, 'square', 494);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
  const g = ctx.createGain(); g.gain.value = 0;
  a.connect(f); b.connect(f); f.connect(g); g.connect(audio.sfx);
  hornNodes = { g };
}

function burst(time, { freq = 1500, q = 0.8, dur = 0.15, gain = 0.6, type = 'bandpass', sweep = 0 }) {
  const ctx = audio.ctx;
  const s = noiseSrc(ctx, false);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, time); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), time + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  s.connect(f); f.connect(g); g.connect(audio.sfx);
  s.start(time, Math.random()); s.stop(time + dur + 0.05);
}

function thump(time, f0, f1, dur, gain) {
  const ctx = audio.ctx;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, time); o.frequency.exponentialRampToValueAtTime(f1, time + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  o.connect(g); g.connect(audio.sfx); o.start(time); o.stop(time + dur + 0.05);
}

function nearGain(x, z, ref = 30) {
  const p = G.player;
  const d = Math.hypot(x - p.x, z - p.z);
  return Math.min(1, ref / (ref + d * 0.9)) ;
}

const SHOT_SOUNDS = {
  pistol: (t, k) => { burst(t, { freq: 2200, q: 0.7, dur: 0.14, gain: 0.7 * k }); thump(t, 220, 60, 0.12, 0.5 * k); },
  smg: (t, k) => { burst(t, { freq: 2800, q: 0.9, dur: 0.09, gain: 0.55 * k }); thump(t, 260, 80, 0.07, 0.35 * k); },
  shotgun: (t, k) => { burst(t, { freq: 1100, q: 0.5, dur: 0.38, gain: 0.95 * k, sweep: 0.3 }); thump(t, 160, 40, 0.25, 0.8 * k); },
  rocket: (t, k) => { burst(t, { freq: 700, q: 0.4, dur: 0.6, gain: 0.7 * k, type: 'lowpass', sweep: 3 }); },
  punch: (t, k) => { thump(t, 140, 50, 0.1, 0.6 * k); burst(t, { freq: 600, dur: 0.06, gain: 0.3 * k }); },
};

export function installSfxEvents() {
  on('shot', (e) => { if (!audio.ctx) return; const k = nearGain(e.x, e.z); (SHOT_SOUNDS[e.sound] || SHOT_SOUNDS.pistol)(audio.ctx.currentTime, k); });
  on('explosion', (e) => {
    if (!audio.ctx) return; const t = audio.ctx.currentTime, k = nearGain(e.x, e.z, 60);
    burst(t, { freq: 900, q: 0.3, dur: 1.6, gain: 1.1 * k, type: 'lowpass', sweep: 0.12 }); thump(t, 120, 28, 0.9, 1.0 * k);
  });
  on('crash', (e) => {
    if (!audio.ctx) return; const t = audio.ctx.currentTime, k = nearGain(e.x, e.z) * Math.min(1, e.force / 10);
    burst(t, { freq: 1800, q: 0.6, dur: 0.25, gain: 0.7 * k }); thump(t, 120, 45, 0.18, 0.7 * k);
  });
  on('pickup', () => chime([880, 1320], 0.09));
  on('mission-passed', () => chime([523, 659, 784, 1047, 1319], 0.14));
  on('mission-failed', () => chime([330, 262, 196], 0.22));
  on('wanted-up', () => chime([1175, 880], 0.09));
  on('car-alarm', () => chime([1500, 1000, 1500, 1000, 1500, 1000], 0.12));
}

export function chime(notes, step) {
  if (!audio.ctx) return;
  const ctx = audio.ctx;
  notes.forEach((n, i) => {
    const t = ctx.currentTime + i * step;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = n;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + step * 2.2);
    o.connect(g); g.connect(audio.sfx); o.start(t); o.stop(t + step * 2.4);
  });
}

// Per-frame continuous sounds: engine, wind, nearest siren, helicopter, horn.
export function updateSfx(dt) {
  if (!audio.ctx) return;
  const ctx = audio.ctx, t = ctx.currentTime, p = G.player;
  const car = p?.inCar;
  const sp = car ? Math.abs(car.speed) : 0;
  const gearW = 9.5, gear = Math.min(5, Math.floor(sp / gearW)), rpm = Math.min(1, (sp - gear * gearW) / gearW);
  const thr = car ? Math.abs(car.input.throttle) : 0;
  const f = 38 + gear * 7 + rpm * 62 + thr * 14;
  engine.a.frequency.setTargetAtTime(f, t, 0.05);
  engine.b.frequency.setTargetAtTime(f * 0.5, t, 0.05);
  engine.f.frequency.setTargetAtTime(260 + rpm * 500 + thr * 400, t, 0.05);
  engine.g.gain.setTargetAtTime(car && !car.dead ? 0.13 + thr * 0.12 : 0, t, 0.1);
  wind.g.gain.setTargetAtTime(car ? Math.min(0.2, sp * 0.004) : 0, t, 0.2);
  wind.f.frequency.setTargetAtTime(400 + sp * 25, t, 0.2);
  let nearest = 999;
  for (const v of G.vehicles) if (v.siren && !v.dead) nearest = Math.min(nearest, Math.hypot(v.x - p.x, v.z - p.z));
  const sirenGain = nearest < 220 ? 0.12 * Math.min(1, 40 / (nearest + 10)) : 0;
  const phase = (G.time * 0.9) % 1;
  siren.o.frequency.setTargetAtTime(700 + Math.sin(phase * 6.283) * 380, t, 0.03);
  siren.o2.frequency.setTargetAtTime(1050 + Math.sin(phase * 6.283) * 570, t, 0.03);
  siren.g.gain.setTargetAtTime(sirenGain, t, 0.1);
  const hd = G.heli ? Math.hypot(G.heli.x - p.x, G.heli.z - p.z) : 999;
  rotor.g.gain.setTargetAtTime(G.heli ? 0.5 * Math.min(1, 60 / (hd + 20)) : 0, t, 0.2);
  hornNodes.g.gain.setTargetAtTime(car?.honk ? 0.12 : 0, t, 0.02);
}

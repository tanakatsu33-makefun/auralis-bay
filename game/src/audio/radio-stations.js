// In-car radio with three invented stations. Each station is a tiny step-sequencer score played by synths.
import { G } from '../core/game-state.js';
import { audio } from './sfx-synth.js';
import { emit } from '../core/event-bus.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const STATIONS = [
  { name: 'VELVET DUSK 88.8', dj: 'DJ Marigold', tracks: ['Neon Lullaby', 'Slow Burn Skyline', 'Pink Hour'], bpm: 96, root: 45, scale: [0, 3, 7, 10], prog: [0, 5, 3, 4], kick: '1000100010001000', snare: '0000100000001000', hat: '0010001000100010', arp: '1011101110101101', style: 'synth' },
  { name: 'BRINE & BASS 101.3', dj: 'Tidepool Tom', tracks: ['Harbour Rumble', 'Kelp Knife', 'Sub Marina'], bpm: 140, root: 40, scale: [0, 3, 5, 7, 10], prog: [0, 0, 3, 2], kick: '1000000110100000', snare: '0000100000001001', hat: '1010101010101011', arp: '1000100100101000', style: 'bass' },
  { name: 'CORAL STATIC 94.7', dj: 'Static Orchid', tracks: ['Sunburn Surf', 'Beach Fuzz Lover', 'Salt in the Static'], bpm: 108, root: 52, scale: [0, 4, 7, 9], prog: [0, 3, 4, 3], kick: '1000001010000010', snare: '0000100000001000', hat: '1111111111111111', arp: '1101101011011010', style: 'pluck' },
];
export const RADIO_OFF = { name: 'RADIO OFF' };

let timer = null, nextTime = 0, step = 0, trackLabel = '';

export function currentStationName() {
  if (!G.radio.on) return 'RADIO OFF';
  const s = STATIONS[G.radio.station];
  return s.name + (trackLabel ? ' · ' + trackLabel : '');
}

function tone(type, freq, t, dur, gain, dest, cutoff = 2000) {
  const ctx = audio.ctx;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

function drum(kind, t) {
  const ctx = audio.ctx;
  if (kind === 'kick') {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(audio.music); o.start(t); o.stop(t + 0.22);
    return;
  }
  const s = ctx.createBufferSource(); s.buffer = audio.noise;
  const f = ctx.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const g = ctx.createGain(); const len = kind === 'hat' ? 0.04 : 0.14;
  g.gain.setValueAtTime(kind === 'hat' ? 0.18 : 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  s.connect(f); f.connect(g); g.connect(audio.music); s.start(t, Math.random()); s.stop(t + len + 0.02);
}

function scheduleStep(st, i, t) {
  const bar = Math.floor(i / 16), s16 = i % 16;
  const chordRoot = st.root + st.scale[st.prog[bar % st.prog.length] % st.scale.length] + (st.prog[bar % st.prog.length] > 3 ? 0 : 0);
  const secs = 60 / st.bpm / 4;
  if (st.kick[s16] === '1') drum('kick', t);
  if (st.snare[s16] === '1') drum('snare', t);
  if (st.hat[s16] === '1') drum('hat', t);
  if (s16 % 4 === 0 || (st.style === 'bass' && s16 % 8 === 6)) tone(st.style === 'bass' ? 'sine' : 'sawtooth', midi(chordRoot - 12), t, secs * (st.style === 'bass' ? 3.5 : 3), st.style === 'bass' ? 0.6 : 0.32, audio.music, st.style === 'bass' ? 400 : 700);
  if (s16 === 0) for (const iv of [0, st.scale[1], st.scale[2]]) tone(st.style === 'pluck' ? 'triangle' : 'sawtooth', midi(chordRoot + 12 + iv), t, secs * 15, 0.07, audio.music, 900);
  if (st.arp[s16] === '1') {
    const n = chordRoot + 24 + st.scale[(i * 3 + bar) % st.scale.length];
    tone(st.style === 'pluck' ? 'triangle' : 'square', midi(n), t, secs * (st.style === 'pluck' ? 2.5 : 1.6), 0.1, audio.music, st.style === 'synth' ? 1800 : 3000);
  }
}

function pump() {
  const ctx = audio.ctx;
  if (!ctx || !G.radio.on) return;
  const st = STATIONS[G.radio.station];
  const secs = 60 / st.bpm / 4;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.35) {
    scheduleStep(st, step, nextTime);
    nextTime += secs;
    step++;
  }
}

export function startRadio() {
  if (timer || !audio.ctx) return;
  timer = setInterval(pump, 90);
}

export function setStation(index, announce = true) {
  const n = STATIONS.length + 1;
  const i = (index + n) % n;
  G.radio.on = i < STATIONS.length;
  if (G.radio.on) { G.radio.station = i; trackLabel = STATIONS[i].tracks[Math.floor(Math.abs(Math.sin(i * 9.3 + G.time)) * 3) % 3]; }
  else trackLabel = '';
  step = 0; nextTime = 0;
  if (announce) emit('toast', G.radio.on ? `${STATIONS[G.radio.station].name} — ${STATIONS[G.radio.station].dj}` : 'RADIO OFF');
}

export function nextStation() {
  setStation(G.radio.on ? G.radio.station + 1 : 0);
}

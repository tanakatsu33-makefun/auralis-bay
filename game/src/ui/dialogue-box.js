// Story dialogue box: a portrait, a speaker name and typed-out lines. The world keeps moving but input is held.
import { G } from '../core/game-state.js';
import { input, wasTapped } from '../core/input-controls.js';
import { CAST } from '../missions/story-arc.js';
import { drawPortrait } from './portraits.js';

let queue = [], who = 'teo', done = null, typed = 0, lineIndex = 0, prevMode = 'play';

const box = () => document.getElementById('dialogue-box');

export function showDialogue(speaker, lines, onDone) {
  who = speaker;
  queue = lines.slice();
  done = onDone;
  lineIndex = 0;
  typed = 0;
  prevMode = G.mode === 'dialogue' ? prevMode : G.mode;
  G.mode = 'dialogue';
  drawPortrait(document.getElementById('dialogue-portrait'), who);
  setSpeaker();
  box().classList.remove('hidden');
  render();
}

function setSpeaker() {
  const c = CAST[who];
  document.getElementById('dialogue-name').innerHTML = `${c.name} <small>${c.role.toUpperCase()}</small>`;
}

function render() {
  const text = queue[lineIndex] || '';
  document.getElementById('dialogue-line').textContent = text.slice(0, Math.floor(typed));
  document.getElementById('dialogue-next').textContent = lineIndex >= queue.length - 1 ? '[SPACE] close' : '[SPACE] continue';
}

export function isDialogueOpen() {
  return !box().classList.contains('hidden');
}

export function updateDialogue(dt) {
  if (!isDialogueOpen()) return;
  const text = queue[lineIndex] || '';
  typed = Math.min(text.length, typed + dt * 70);
  render();
  if (wasTapped('Space', 'Enter', 'KeyE') || input.clicked[0]) {
    if (typed < text.length) { typed = text.length; render(); return; }
    lineIndex++;
    typed = 0;
    if (lineIndex >= queue.length) closeDialogue();
    else render();
  }
}

export function closeDialogue() {
  box().classList.add('hidden');
  G.mode = prevMode === 'dialogue' ? 'play' : prevMode;
  const cb = done;
  done = null;
  if (cb) cb();
}

export function setDialogueStatic(speaker, lines, index, fullTyped = true) {
  who = speaker; queue = lines; lineIndex = index; typed = fullTyped ? 9999 : 0;
  drawPortrait(document.getElementById('dialogue-portrait'), who);
  setSpeaker();
  box().classList.remove('hidden');
  G.mode = 'dialogue';
  render();
}

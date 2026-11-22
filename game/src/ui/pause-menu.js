// Pause menu: resume, save to a slot, quit to the title, and the control cheat-sheet.
import { G } from '../core/game-state.js';
import { saveToSlot, describeSlot, SLOT_COUNT } from '../save/save-slots.js';
import { togglePause, backToTitle } from '../core/game-flow.js';
import { refreshTitle } from './title-screen.js';

const $ = (id) => document.getElementById(id);

function renderSlots() {
  const box = $('pause-slots');
  box.innerHTML = '';
  for (let n = 1; n <= SLOT_COUNT; n++) {
    const b = document.createElement('button');
    b.textContent = 'SAVE → ' + describeSlot(n);
    b.onclick = () => { saveToSlot(n); renderSlots(); };
    box.appendChild(b);
  }
}

export function installPauseMenu() {
  $('btn-resume').onclick = () => togglePause();
  $('btn-quit').onclick = () => { backToTitle(); refreshTitle(); };
  $('pause-help').innerHTML = 'WASD / arrows move &amp; drive · mouse aim · LMB shoot · RMB aim<br>E / F enter-exit car · SPACE handbrake · SHIFT sprint<br>1-5 or wheel weapons · Q radio · H horn · C look back<br>TAB mission list · F5 quick-save · ESC pause';
}

export function onPauseOpened() {
  renderSlots();
}

export function isPaused() {
  return G.mode === 'paused';
}

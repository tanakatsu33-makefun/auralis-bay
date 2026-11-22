// Keyboard + mouse state. Systems poll `input` each frame; `endFrame` clears one-shot values.
export const input = {
  held: new Set(),
  tapped: new Set(),
  mouseDX: 0,
  mouseDY: 0,
  buttons: [false, false, false],
  clicked: [false, false, false],
  wheel: 0,
  locked: false,
};

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function isDown(...codes) {
  return codes.some((c) => input.held.has(c));
}

export function wasTapped(...codes) {
  return codes.some((c) => input.tapped.has(c));
}

export function axis(neg, pos) {
  return (isDown(...pos) ? 1 : 0) - (isDown(...neg) ? 1 : 0);
}

export function installInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) input.tapped.add(e.code);
    input.held.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.held.delete(e.code));
  window.addEventListener('blur', () => { input.held.clear(); input.buttons.fill(false); });
  window.addEventListener('mousemove', (e) => {
    input.mouseDX += e.movementX || 0;
    input.mouseDY += e.movementY || 0;
  });
  window.addEventListener('mousedown', (e) => {
    input.buttons[e.button] = true;
    input.clicked[e.button] = true;
    if (document.pointerLockElement !== canvas && canvas && window.__wantLock) {
      try { canvas.requestPointerLock?.(); } catch (err) { /* ignored */ }
    }
  });
  window.addEventListener('mouseup', (e) => { input.buttons[e.button] = false; });
  window.addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); }, { passive: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
}

export function endInputFrame() {
  input.tapped.clear();
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.clicked.fill(false);
  input.wheel = 0;
}

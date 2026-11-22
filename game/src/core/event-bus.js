// Tiny publish/subscribe bus so simulation systems can announce things (crashes, shots, kills)
// without importing the audio, particle or HUD modules that react to them.
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(fn);
}

export function emit(name, data) {
  const list = listeners.get(name);
  if (!list) return;
  for (let i = 0; i < list.length; i++) list[i](data);
}

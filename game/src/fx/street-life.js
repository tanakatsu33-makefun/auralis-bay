// Ambient city life: neon signs pulse and buzz so the dusk skyline never looks frozen.
import { G } from '../core/game-state.js';

export function lampFlicker(t) {
  const neon = G.three?.props?.userData?.neon;
  if (!neon) return;
  neon.opacity = 0.72 + Math.sin(t * 3.1) * 0.1 + (Math.sin(t * 23) > 0.96 ? -0.3 : 0);
}

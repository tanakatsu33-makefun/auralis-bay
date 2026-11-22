// Applies damage to people (player or NPC) and announces kills; armour soaks damage first for the player.
import { G } from '../core/game-state.js';
import { emit } from '../core/event-bus.js';

export function hurtPlayer(amount, source = 'npc') {
  const p = G.player;
  if (!p || p.dead || p.invulnerable) return;
  if (p.armor > 0) {
    const soak = Math.min(p.armor, amount * 0.7);
    p.armor -= soak;
    amount -= soak;
  }
  p.hp -= amount;
  p.hurtT = 0.35;
  emit('player-hurt', { amount, source });
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    emit('player-down', { source });
  }
}

export function hurtActor(a, amount, source, hitDir) {
  if (a.dead) return false;
  a.hp -= amount;
  a.hitT = 0.2;
  a.lastAttacker = source;
  if (hitDir) { a.knockX = hitDir.x * 3; a.knockZ = hitDir.z * 3; }
  emit('actor-hit', { actor: a, source, amount });
  if (a.hp <= 0) {
    a.dead = true;
    a.deadT = 0;
    if (source === 'player') G.stats.kills++;
    emit('actor-killed', { actor: a, source });
    return true;
  }
  return false;
}

// Procedural character portraits drawn on a 160x160 canvas: sunset gradient, bust, face, hair and a signature accessory.
import { CAST } from '../missions/story-arc.js';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function drawPortrait(canvas, id) {
  const c = CAST[id] || CAST.juno;
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a1458');
  bg.addColorStop(0.6, '#c4476f');
  bg.addColorStop(1, '#ffb347');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,240,200,0.9)';
  g.beginPath(); g.arc(W * 0.78, H * 0.62, 16, 0, 7); g.fill();
  // shoulders
  g.fillStyle = c.shirt;
  rr(g, W * 0.12, H * 0.68, W * 0.76, H * 0.5, 22); g.fill();
  if (c.suit) { g.fillStyle = '#f4f4ff'; g.beginPath(); g.moveTo(W * 0.42, H * 0.68); g.lineTo(W * 0.58, H * 0.68); g.lineTo(W * 0.5, H * 0.9); g.fill(); g.fillStyle = c.accent; g.fillRect(W * 0.485, H * 0.7, W * 0.03, H * 0.18); }
  else { g.fillStyle = c.accent; g.fillRect(W * 0.12, H * 0.68, W * 0.76, 6); }
  // neck + head
  g.fillStyle = c.skin;
  g.fillRect(W * 0.42, H * 0.56, W * 0.16, H * 0.16);
  g.beginPath(); g.ellipse(W * 0.5, H * 0.42, W * 0.2, H * 0.24, 0, 0, 7); g.fill();
  // hair
  g.fillStyle = c.hair;
  g.beginPath(); g.ellipse(W * 0.5, H * 0.28, W * 0.215, H * 0.16, 0, Math.PI, 0); g.fill();
  g.fillRect(W * 0.29, H * 0.26, W * 0.05, H * 0.2);
  g.fillRect(W * 0.66, H * 0.26, W * 0.05, H * 0.2);
  // face
  g.fillStyle = '#1a1020';
  g.beginPath(); g.ellipse(W * 0.42, H * 0.42, 4, 5, 0, 0, 7); g.ellipse(W * 0.58, H * 0.42, 4, 5, 0, 0, 7); g.fill();
  g.strokeStyle = '#4a2418'; g.lineWidth = 3;
  g.beginPath(); g.arc(W * 0.5, H * 0.5, W * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  if (c.glasses) { g.strokeStyle = c.accent; g.lineWidth = 3; g.strokeRect(W * 0.34, H * 0.37, W * 0.13, H * 0.1); g.strokeRect(W * 0.53, H * 0.37, W * 0.13, H * 0.1); g.beginPath(); g.moveTo(W * 0.47, H * 0.42); g.lineTo(W * 0.53, H * 0.42); g.stroke(); }
  if (c.hat || c.cap) { g.fillStyle = c.accent; g.fillRect(W * 0.28, H * 0.2, W * 0.44, H * 0.08); g.fillStyle = c.hat ? '#ffffff' : c.shirt; g.fillRect(W * 0.34, H * 0.12, W * 0.32, H * 0.1); }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
}

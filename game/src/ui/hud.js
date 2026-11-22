// HUD controller: wanted stars, cash, health/armour, speedometer, radio, mission objective, hints, toasts and banners.
import { G } from '../core/game-state.js';
import { on } from '../core/event-bus.js';
import { fmtMoney } from '../core/math-utils.js';
import { districtAt } from '../world/city-grid.js';
import { WEAPONS } from '../combat/weapons.js';
import { currentStationName } from '../audio/radio-stations.js';
import { getObjective } from '../missions/mission-runner.js';
import { nextMission } from '../missions/mission-board.js';
import { PLACES } from '../missions/story-arc.js';
import { nearestEnterable } from '../vehicles/carjack.js';
import { nearShop } from '../world/points-of-interest.js';

const $ = (id) => document.getElementById(id);
let toastT = 0, bannerT = 0;
const cache = {};

function setText(id, text) {
  if (cache[id] === text) return;
  cache[id] = text;
  $(id).textContent = text;
}

export function installHud() {
  on('toast', (msg) => { $('toast').textContent = msg; $('toast').classList.add('show'); toastT = 2.6; });
  on('banner', (msg) => { $('banner').textContent = msg; $('banner').classList.add('show'); bannerT = 3.2; });
}

function starsHtml(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += `<span class="${i < n ? 'on' : 'off'}">★</span>`;
  return s;
}

export function updateHud(dt) {
  const p = G.player;
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.remove('show');
  if (bannerT > 0 && (bannerT -= dt) <= 0) $('banner').classList.remove('show');
  const stars = G.wanted;
  const key = 'stars' + stars + (G.seenTimer > 7 ? 'f' : '');
  if (cache.stars !== key) {
    cache.stars = key;
    $('wanted-stars').innerHTML = starsHtml(stars);
    $('wanted-stars').classList.toggle('flash', stars > 0 && G.seenTimer > 7);
  }
  setText('cash', fmtMoney(G.cash));
  setText('district-name', districtAt(p.x, p.z).name);
  $('health-fill').style.width = Math.max(0, p.hp) + '%';
  $('armor-fill').style.width = Math.max(0, p.armor) + '%';
  const car = p.inCar;
  $('speedometer').style.display = car ? '' : 'none';
  $('weapon-info').style.display = car ? 'none' : '';
  if (car) setText('speed-value', String(Math.round(Math.abs(car.speed) * 3.6)));
  else {
    const w = WEAPONS[G.weapon];
    setText('weapon-info', w.ammoKey ? `${w.name}  ${G.ammo[w.ammoKey]}` : w.name);
  }
  setText('radio-name', car ? currentStationName().split(' · ')[0] : 'ON FOOT');
  // mission line
  if (G.mission.active) {
    const o = getObjective();
    setText('mission-title', G.mission.active.title);
    setText('mission-objective', o?.text || '');
    setText('mission-distance', o?.pos ? Math.round(Math.hypot(o.pos.x - p.x, o.pos.z - p.z)) + ' m' : '');
  } else if (nextMission()) {
    const m = nextMission(), pl = PLACES[m.place];
    setText('mission-title', 'NEXT: ' + m.title);
    setText('mission-objective', 'Go to ' + pl.name);
    setText('mission-distance', Math.round(Math.hypot(pl.x - p.x, pl.z - p.z)) + ' m');
  } else {
    setText('mission-title', 'FREE ROAM');
    setText('mission-objective', 'The city is yours');
    setText('mission-distance', '');
  }
  // contextual hint
  let hint = '';
  const shop = nearShop(p);
  if (shop) hint = shop.hint;
  else if (car) hint = Math.abs(car.speed) < 9 ? '[E] Exit car' : '';
  else { const v = nearestEnterable(p); if (v) hint = `[E] ${v.ai === 'traffic' ? 'Carjack' : 'Enter'} ${v.spec.name}`; }
  setText('hint', G.mode === 'play' ? hint : '');
}

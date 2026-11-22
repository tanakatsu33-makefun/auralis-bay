// "The Glass Tide": cast, named places and the seven-mission story arc of Auralis Bay (data only).
import { PITCH } from '../world/city-grid.js';

export const CAST = {
  juno: { name: 'JUNO VANCE', role: 'courier', skin: '#b77b50', hair: '#120c18', shirt: '#27e1c8', accent: '#ff3d8b', hat: true },
  teo: { name: 'MAMA TEO', role: 'fixer', skin: '#d9a273', hair: '#c9c4d8', shirt: '#e8a05a', accent: '#ffb347', glasses: true },
  rook: { name: 'ROOK DELACROIX', role: 'wheelman', skin: '#7a4a2c', hair: '#20141c', shirt: '#6f5bff', accent: '#27e1c8', cap: true },
  mena: { name: 'DR. MENA OKAFOR', role: 'hacker', skin: '#a8693f', hair: '#2a1a3a', shirt: '#ff3d8b', accent: '#9be7ff', glasses: true },
  silas: { name: 'SILAS VANTONGEREN', role: 'Vantage Marine CEO', skin: '#f1c9a5', hair: '#bdb8c8', shirt: '#2a2a48', accent: '#c9a7ff', suit: true },
  harrow: { name: 'COMMISSIONER HARROW', role: 'police chief', skin: '#ffdcb8', hair: '#5a5a66', shirt: '#1d2c5a', accent: '#ffd23f', hat: true },
};

const at = (ix, iz, ox = 0, oz = 0) => ({ x: ix * PITCH + ox, z: iz * PITCH + oz });

export const PLACES = {
  noodleBar: { name: 'Salt & Ember Noodle Bar', ...at(2, 5, 9.5, 9.5) },
  garage: { name: "Rook's Copperline Garage", ...at(3, 10, 9.5, 9.5) },
  heightsLot: { name: 'Saffron Heights Valet', ...at(6, 3, 9.5, -9.5) },
  gullDock: { name: 'Iron Gull Warehouse', ...at(8, 10, -9.5, 9.5) },
  wharfPlaza: { name: 'Marlin Wharf Plaza', ...at(1, 5, 9.5, -9.5) },
  tower: { name: 'Tidewatch Tower', x: 416, z: 265.5 },
  safehouse: { name: 'Tamarind Loft', ...at(2, 2, 9.5, 9.5) },
  hospital: { name: "St. Marrow's General", ...at(4, 1, 9.5, 9.5) },
  station: { name: 'Halyard Street Precinct', ...at(7, 8, 9.5, 9.5) },
  gunShop: { name: "Brass Gull Arms", ...at(5, 8, -9.5, 9.5) },
  quickCoat: { name: 'Quick Coat Respray', ...at(9, 6, 9.5, 9.5) },
};

export const SHOPS = [
  { id: 'arms', place: 'gunShop', label: 'ARMS & ARMOUR', blip: '#ffb347' },
  { id: 'coat', place: 'quickCoat', label: 'QUICK COAT (clears wanted)', blip: '#27e1c8' },
];

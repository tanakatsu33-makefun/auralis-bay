// The single shared, mutable game state. Systems read and write fields here instead of importing each other.
export const G = {
  mode: 'loading',        // loading | title | play | paused | dialogue
  time: 0,                // seconds of simulated time
  dt: 0,
  three: null,            // { scene, camera, renderer }
  player: null,           // set by player/player-character.js
  vehicles: [],           // every vehicle in the world (traffic, police, parked, player's)
  peds: [],               // every pedestrian / gangster / officer
  pickups: [],
  effects: [],
  cash: 500,
  wanted: 0,              // 0..5 stars
  heat: 0,                // continuous crime heat that drives the stars
  seenTimer: 0,           // seconds since a cop last saw the player
  weapons: { fists: true, pistol: true },
  ammo: { pistol: 90, smg: 0, shotgun: 0, rocket: 0 },
  weapon: 'pistol',
  stats: { kills: 0, carjacks: 0, missions: 0, tokens: 0, wrecks: 0 },
  mission: { index: 0, step: 0, active: null, completed: [], runtime: null },
  radio: { station: 0, on: true },
  slot: 1,
  shot: null,             // screenshot-mode scene name, or null
  flags: {},
};

export function resetProgress() {
  G.cash = 500;
  G.wanted = 0;
  G.heat = 0;
  G.weapons = { fists: true, pistol: true };
  G.ammo = { pistol: 90, smg: 0, shotgun: 0, rocket: 0 };
  G.weapon = 'pistol';
  G.stats = { kills: 0, carjacks: 0, missions: 0, tokens: 0, wrecks: 0 };
  G.mission = { index: 0, step: 0, active: null, completed: [], runtime: null };
  G.flags = {};
}

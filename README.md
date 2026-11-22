# NEON TIDE: Auralis Bay

An original open-world crime game that runs in desktop Chrome from static files (three.js r170 is vendored, no build step,
no network). You play **Juno Vance**, a courier who comes back to the sun-drenched coastal megacity of **Auralis Bay** at
golden hour to expose the shipping tycoon **Silas Vantongeren** and the corrupt **Commissioner Harrow**.

Everything is invented for this entry: the city and its districts (Marlin Wharf, Palmgrove, Lantern Quarter,
Saffron Heights, Copperline Yards, Ember Ridge), the crew (Mama Teo, Rook Delacroix, Dr. Mena Okafor), the cars
(Kestrel GT, Brisa, Tamarin, Okapi, Bulwark, Halcyon Cab, Marlin Interceptor, Stingray), the radio stations
(Velvet Dusk 88.8, Brine & Bass 101.3, Coral Static 94.7) and all of the art and sound, which is generated at run time.

## Run it

```
node serve.ts            # serves game/ on http://localhost:8080
```

Open `http://localhost:8080` in desktop Chrome (any static file server works). Click **New Game** or **Continue**.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | walk, or drive (W/S throttle and brake/reverse) |
| Mouse | look and aim (on foot), orbit the chase camera (in a car) |
| Left mouse | shoot / punch, Right mouse: aim |
| 1-5 or wheel | fists, pistol, SMG, shotgun, rocket launcher |
| E or F | enter / leave a car (carjack an occupied one), buy at shops |
| Space | handbrake (drift) / continue dialogue |
| Shift | sprint |
| Q | next radio station, H horn, C look behind |
| Tab / J | mission list |
| F5 | quick save (current slot), Esc pause menu with 3 save slots |

## What is in the game

* **City**: a 12x12 block procedurally generated coastal grid with an ocean, beach and pier, tower skyline, palms, street lamps,
  neon signs, and a golden-hour sky. Buildings are drawn instanced with a window-grid shader; a bloom pass supplies the glow.
* **Traffic and people**: lane-following traffic that turns, yields and brakes; pedestrians who stroll, cross, panic and can be hit.
* **Cars**: steal parked cars or carjack occupied ones; arcade drift physics, damage, smoke, fire and explosions, skid marks.
* **Wanted level**: five stars driven by crime heat. Patrol cars chase and ram, officers jump out and shoot, roadblocks appear at three
  stars, a helicopter with a spotlight joins in and shoots at four. Break line of sight to cool down, or use the Quick Coat respray.
* **Story**: seven missions with named characters, portraits and dialogue (goto, steal, deliver, shootouts, chases, heat evasion, assault).
* **Combat**: pistol, SMG, shotgun, rocket launcher, fists; health, armour, auto-aim assist, pickups, an arms shop.
* **HUD**: round heading-up minimap with police blips, wanted stars, cash, health/armour, speedometer, radio, objective line.
* **Audio**: WebAudio synthesis only: engine, sirens, gunshots, explosions, rotor, horn, and a three-station radio.
* **Saves**: three localStorage slots from the title or pause menu.

## Code map (`game/src`)

| Folder | Role |
| --- | --- |
| `world/` | city generator, grid, meshes, building shader, sky and ocean, lights, props, shops and pickups |
| `vehicles/` | car catalog, meshes, physics, damage, carjacking, vehicle manager |
| `traffic/` | traffic AI, pedestrians, population spawner |
| `police/` | wanted level, dispatch, police driver, helicopter |
| `combat/` | weapons, NPC combat, projectiles, explosions, damage |
| `missions/` | story data, mission scripts, runner, board, markers |
| `player/`, `feel/` | player control, on-foot and driving input, camera rig |
| `ui/` | HUD, minimap, dialogue, portraits, title screen, pause menu |
| `audio/` | sound synth and radio stations |
| `fx/` | particles, tracers, skid marks, glow sprites, bloom pass |
| `save/`, `core/` | save slots, game state, input, event bus, simulation loop |
| `screenshot/` | the `?shot=` screenshot mode |

## Screenshots and tests

`node tools/shoot.mjs` serves `game/` and takes the screenshots in `screenshots/` from the real game
(`?shot=cover|combat|story|title&seed=1`, a deterministic staged scene using the real simulation and renderer).
`node tools/smoke-test.mjs` drives the real game headlessly (new game, carjack, drive, shoot, save, missions, police, death, arrest).

MIT licensed.

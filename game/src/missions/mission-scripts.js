// The seven story missions as step lists. Step types are interpreted by mission-runner.js.
export const MISSIONS = [
  {
    id: 'm1', title: 'FRESH OFF THE FERRY', giver: 'teo', place: 'noodleBar', reward: 600,
    blurb: 'Teo has a job, and a debt to collect.',
    steps: [
      { t: 'talk', who: 'teo', lines: [
        'Juno Vance. The ferry cat finally dragged you back to Auralis Bay.',
        'Vantage Marine burned the Tidewater pier and took the Halcyon Ledger with it. Everyone who could prove it is quiet or missing.',
        'You are not quiet. You are a courier. Go borrow some wheels and meet Rook at his garage in Copperline.' ] },
      { t: 'getcar', text: 'Steal a car (press E next to one)' },
      { t: 'deliver', at: 'garage', text: "Drive to Rook's Copperline Garage", r: 9 },
      { t: 'talk', who: 'rook', lines: [
        'Nice and dented. That is how I like my couriers.',
        'Next job: a Stingray roadster is sitting at the Saffron Heights valet. Bring it home before the owner finishes his espresso.' ] },
    ],
  },
  {
    id: 'm2', title: 'BORROWED WHEELS', giver: 'rook', place: 'garage', reward: 900,
    blurb: 'A roadster that needs a new owner.',
    steps: [
      { t: 'spawncar', model: 'stingray', at: 'heightsLot', text: 'Find the red Stingray at the Heights valet', mark: true },
      { t: 'deliver', at: 'garage', text: 'Bring the Stingray to the garage', r: 9, needVehicle: 'stingray' },
      { t: 'talk', who: 'rook', lines: [
        'Look at that paintwork! Mena wants us at the Iron Gull warehouse. Those thugs have been selling the Ledger crates.',
        'Bring a gun. Bring two. Take whatever you find.' ] },
    ],
  },
  {
    id: 'm3', title: 'IRON GULL SHAKEDOWN', giver: 'mena', place: 'garage', reward: 1200, weapon: 'smg',
    blurb: 'Clear the dockside warehouse.',
    steps: [
      { t: 'goto', at: 'gullDock', r: 30, text: 'Head to the Iron Gull warehouse' },
      { t: 'kill', at: 'gullDock', count: 7, text: 'Take out the Iron Gull crew' },
      { t: 'talk', who: 'mena', lines: [
        'Fingerprints on the crates trace to Vantage Marine. Their courier is doing a run right now. Silver sedan, heading for the Heights.',
        'Take the SMG from their stash. Stop that car.' ] },
    ],
  },
  {
    id: 'm4', title: 'LEDGER RUN', giver: 'mena', place: 'garage', reward: 1500, weapon: 'shotgun',
    blurb: 'Chase down a Vantage courier.',
    steps: [
      { t: 'chase', model: 'brisa', hp: 90, speed: 21, text: 'Wreck the fleeing Vantage sedan', from: 'heightsLot' },
      { t: 'talk', who: 'teo', lines: [
        'A burned courier and a drive full of ledgers. Mena says one page names Commissioner Harrow.',
        'Harrow knows we have it. The patrol cars will be hunting you. Get to the Wharf and lose them.' ] },
    ],
  },
  {
    id: 'm5', title: 'HEAT LAMP', giver: 'rook', place: 'garage', reward: 1800,
    blurb: 'Harrow has put out a four-star order on you.',
    steps: [
      { t: 'wanted', stars: 3, text: 'Harrow is sending units!' },
      { t: 'goto', at: 'wharfPlaza', r: 12, text: 'Get to Marlin Wharf Plaza', needVehicle: true },
      { t: 'lose', text: 'Lose the police (stay out of sight)' },
      { t: 'talk', who: 'mena', lines: [
        'You are alive and the cops are chasing someone else. Good.',
        'The decrypt key is in the Tidewatch Tower server room. Silas keeps armed guards at the entrance.' ] },
    ],
  },
  {
    id: 'm6', title: 'GLASS TOWER', giver: 'mena', place: 'wharfPlaza', reward: 2400, weapon: 'rocket',
    blurb: 'Storm the tower and copy the key.',
    steps: [
      { t: 'goto', at: 'tower', r: 40, text: 'Go to the foot of Tidewatch Tower' },
      { t: 'kill', at: 'tower', count: 9, text: 'Clear the Vantage security team' },
      { t: 'hold', at: 'tower', seconds: 8, r: 6, text: 'Stay by the terminal while Mena copies the key' },
      { t: 'talk', who: 'silas', lines: [
        'Miss Vance. You have my attention and, regrettably, my ledger.',
        'I am leaving the city by sea tonight. You will not be on the ferry, because you will not be anywhere.' ] },
    ],
  },
  {
    id: 'm7', title: "HARROW'S LAST CALL", giver: 'teo', place: 'noodleBar', reward: 5000,
    blurb: 'Stop Silas before the tide takes him.',
    steps: [
      { t: 'chase', model: 'bulwark', hp: 320, speed: 24, text: "Wreck Silas's armoured Bulwark", from: 'tower', color: 0x2b2b3a },
      { t: 'talk', who: 'teo', lines: [
        'The Ledger is public, Silas is in custody and Harrow resigned before breakfast.',
        'Auralis Bay owes you one, Juno. Keep the car. The sun is going down and the city is all yours.' ] },
    ],
  },
];

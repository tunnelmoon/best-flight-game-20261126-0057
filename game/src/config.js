// Ridgeline Run: shared constants and the three sorties.
// One clear job: every number the game balances lives here.

export const GAME_TITLE = 'Ridgeline Run';
export const GAME_SUBTITLE = 'a bush-plane courier in the Kestrel valley';

// World: the valley runs along +Z. X is east, Y is up. Units are metres-ish.
export const WORLD = {
  valleyHalfWidth: 90,
  mountainHeight: 170,
  viewDistance: 420,
  terrainStep: 10,
  runwayZ: 0,
  runwayLength: 150,
  runwayHalfWidth: 7,
  runwayHeading: 0,
};

// Flight model limits.
export const FLIGHT = {
  minSpeed: 26,
  maxSpeed: 95,
  cruiseSpeed: 58,
  climbRate: 9,
  sinkRate: 7,
  turnRate: 0.85,
  pitchRate: 0.55,
  rollRate: 1.9,
  throttleStep: 0.5,
  fuelCapacity: 100,
  fuelBurn: 1.6,
  stallSpeed: 30,
  gearSpeed: 45,
  safeLandingSink: 4.5,
};

// Ring geometry.
export const RING = {
  radius: 14,
  count: 8,
};

// Time-of-day palettes, keyed by mission.
export const SKIES = {
  dawn: {
    top: '#2e4a7a', mid: '#e8a06a', low: '#f7c98f',
    sun: '#ffd9a0', sunX: 0.5, sunY: 0.26,
    fog: 'rgba(232, 160, 106, 0.35)',
    groundTint: '#8a7a5a',
  },
  day: {
    top: '#2f6fd0', mid: '#8fc3ee', low: '#dcefff',
    sun: '#fff3c4', sunX: 0.22, sunY: 0.18,
    fog: 'rgba(143, 195, 238, 0.30)',
    groundTint: '#7a8a4a',
  },
  dusk: {
    top: '#1d2340', mid: '#c65a7a', low: '#f2a35e',
    sun: '#ff9e5e', sunX: 0.5, sunY: 0.34,
    fog: 'rgba(198, 90, 122, 0.35)',
    groundTint: '#6a5a6a',
  },
};

// The three sorties. Each is a different goal over the same valley.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'Sortie 1: Ring Run',
    sky: 'day',
    brief: 'Fly the valley and thread all 8 rings before the fuel runs dry.',
    objective: 'Thread the rings',
    rings: true,
    parcel: false,
    landing: false,
    timeLimit: 240,
  },
  {
    id: 'delivery',
    name: 'Sortie 2: River Delivery',
    sky: 'dawn',
    brief: 'Follow the river, drop the parcel on the hay field, then land on the strip.',
    objective: 'Drop the parcel, then land',
    rings: false,
    parcel: true,
    landing: true,
    timeLimit: 300,
  },
  {
    id: 'dusk',
    name: 'Sortie 3: Dusk Landing',
    sky: 'dusk',
    brief: 'Crosswind at dusk. Bring her down soft on the strip. No second chances.',
    objective: 'Land on the strip',
    rings: false,
    parcel: false,
    landing: true,
    timeLimit: 240,
    crosswind: 6,
  },
];

// Scoring.
export const SCORE = {
  ring: 100,
  parcel: 250,
  landingSoft: 300,
  landingHard: 80,
  timeBonusPerSecond: 2,
};

// Embergarden tuning: every number that shapes how the game feels lives here,
// so balancing is one file, not a hunt through the world code.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

// The player: Luma, a firefly keeper of the last lantern.
export const PLAYER = {
  radius: 14,
  speed: 330,
  accel: 2600,
  friction: 6.5,
  dashSpeed: 920,
  dashTime: 0.16,
  dashCost: 10,
  dashCooldown: 2.5,
  invulnAfterDash: 0.25,
};

// Glow is health, light and score fuel at once. It drains slowly, embers feed it.
export const GLOW = {
  start: 100,
  max: 100,
  drainPerSecond: 1.4,
  drainPerWave: 0.06,
  ember: 6,
  firefly: 3,
  wispHit: 16,
  lightBase: 130,
  lightPerGlow: 1.6,
  lowFlickerBelow: 30,
};

// Pickups.
export const EMBER = { radius: 11, score: 10, drift: 26, wobble: 34 };
export const FIREFLY = { radius: 8, score: 25, drift: 40, wobble: 55 };

// Shadow wisps: the garden's hunger. They steer toward the light.
export const WISP = {
  radius: 13,
  baseSpeed: 88,
  speedPerWave: 9,
  spawnInterval: 2.2,
  spawnShrinkPerWave: 0.16,
  maxAliveBase: 3,
  maxAlivePerWave: 1,
  seekTurn: 2.4,
  wobble: 26,
};

// Waves: collect the quota of embers to clear a wave, then choose an upgrade.
export const WAVES = {
  total: 8,
  quotaBase: 8,
  quotaPerWave: 2,
  clearBonusPerWave: 100,
  fireflyEverySeconds: 7,
};

// The Moth King, wave 8: swoops, rests glowing, and only a dash through its
// resting glow can banish it. Three banishments bring the dawn.
export const MOTH_KING = {
  radius: 46,
  hitsToBanish: 3,
  swoopSpeed: 380,
  swoopPause: 1.1,
  restSeconds: 2.2,
  emberTrickleSeconds: 3.5,
};

// Combo: pickups chained within the window raise the multiplier.
export const COMBO = { windowSeconds: 4, step: 0.25, maxBonus: 3 };

// Upgrades offered between waves (three drawn at random, no repeats).
export const UPGRADES = [
  { id: 'wide-glow', name: 'Wide Glow', desc: '+30% light radius', icon: '◉' },
  { id: 'swift-dash', name: 'Swift Dash', desc: 'Dash recharges 35% faster', icon: '≫' },
  { id: 'magnet', name: 'Moth Magnet', desc: '+70% pickup radius', icon: '◎' },
  { id: 'rich-embers', name: 'Rich Embers', desc: 'Embers worth +50% more', icon: '✦' },
  { id: 'second-wind', name: 'Second Wind', desc: '+35 glow now, +10 max glow', icon: '♥' },
  { id: 'swift-wings', name: 'Swift Wings', desc: '+18% move speed', icon: '»' },
];

export const BEST_KEY = 'embergarden.best';
export const MUTE_KEY = 'embergarden.muted';

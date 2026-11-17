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
  orbHit: 10,
  lightBase: 130,
  lightPerGlow: 1.6,
  lowFlickerBelow: 30,
};

// Pickups.
export const EMBER = { radius: 11, score: 10, drift: 26, wobble: 34 };
export const FIREFLY = { radius: 8, score: 25, drift: 40, wobble: 55 };
// Moonpetals are rare: a white bloom worth a shield and a deep drink of glow.
export const MOONPETAL = { radius: 12, score: 60, glow: 25, everySeconds: 24 };

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

// Gloomspores: rooted shadows that wake, aim, and spit slow gloom orbs.
// They never chase — they punish standing still and force the keeper to move.
export const SPORE = {
  radius: 15,
  drift: 12,
  aimSeconds: 1.1,
  fireInterval: 3.4,
  orbSpeed: 130,
  orbRadius: 8,
  orbLife: 5,
  maxAliveBase: 0,
  maxAlivePerWave: 1,
  firstWave: 2,
};

// Waves: collect the quota of embers to clear a wave, then choose an upgrade.
// Each wave has its own name and weather, so no two waves play alike.
export const WAVES = {
  total: 8,
  quotaBase: 8,
  quotaPerWave: 2,
  clearBonusPerWave: 100,
  fireflyEverySeconds: 7,
};

export const WAVE_THEMES = [
  { name: 'First Light', sub: 'Gather embers. Feed the glow.', emberMult: 1, wispMult: 1, sporeMult: 0, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
  { name: 'Spores Wake', sub: 'Gloomspores spit slow orbs — keep moving.', emberMult: 1, wispMult: 1, sporeMult: 1, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
  { name: 'Ember Rain', sub: 'Embers fall thick and fast.', emberMult: 1.8, wispMult: 1, sporeMult: 1, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
  { name: 'The Swarm', sub: 'The wisps come hunting in numbers.', emberMult: 1, wispMult: 1.4, sporeMult: 1, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
  { name: 'Firefly Bloom', sub: 'Fireflies swarm — every one worth double.', emberMult: 1, wispMult: 1, sporeMult: 1, fireflyMult: 2.2, drainMult: 1, emberValueMult: 1 },
  { name: 'Gloom Tide', sub: 'Spores and wisps together. Do not stand still.', emberMult: 1, wispMult: 1.4, sporeMult: 1.8, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
  { name: 'The Long Night', sub: 'The dark drinks faster — embers are worth more.', emberMult: 1.2, wispMult: 1.2, sporeMult: 1.2, fireflyMult: 1, drainMult: 1.6, emberValueMult: 1.5 },
  { name: 'The Moth King', sub: 'Dash through its resting glow, three times.', emberMult: 1, wispMult: 0.7, sporeMult: 0, fireflyMult: 1, drainMult: 1, emberValueMult: 1 },
];

// The night deepens, then warms toward dawn: one palette per wave.
// [sky top, sky middle, sky bottom, hill, ground top, ground bottom]
export const WAVE_PALETTES = [
  ['#0a0e26', '#181344', '#2a1f58', '#120d33', '#0a0718', '#05030c'],
  ['#0a0d24', '#151238', '#241c50', '#100c2e', '#090718', '#04030b'],
  ['#0b0e28', '#1a1246', '#2e2058', '#130d36', '#0a0719', '#05030c'],
  ['#0d0b26', '#1c1038', '#331a4d', '#150b30', '#0b0618', '#06030d'],
  ['#0a0f2a', '#181647', '#2a215c', '#120e34', '#0a0719', '#05030c'],
  ['#0c0a24', '#1a1138', '#301a4e', '#130b2e', '#090618', '#04030b'],
  ['#141031', '#2a1848', '#452a58', '#1c1238', '#100a20', '#080410'],
  ['#1c1030', '#3a1c4e', '#5a2a58', '#22123a', '#140b22', '#090410'],
];

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

// The Gloom Herald, wave 4's mid-boss: a rooted gloom-bloom that lumbers
// after the keeper, fans slow orbs at her, then opens its glowing heart —
// and only a dash through that open glow can banish it. Two banishments.
export const HERALD = {
  radius: 34,
  hitsToBanish: 2,
  stalkSpeed: 48,
  enterSeconds: 1.4,
  telegraphSeconds: 0.7,
  restSeconds: 2.2,
  fireCooldown: 5.0,
  fanHalfAngle: 0.35,
  orbSpeed: 135,
  score: 300,
  firstWave: 4,
};

// Star moths: rare, fast, worth a fortune — a chase across the garden.
export const STARMOTH = {
  radius: 11,
  score: 150,
  speed: 210,
  everySeconds: 32,
  firstWave: 2,
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
  { id: 'slow-burn', name: 'Slow Burn', desc: 'Glow drains 20% slower', icon: '◐' },
  { id: 'ember-trail', name: 'Ember Trail', desc: 'Dashing scatters embers behind you', icon: '✧' },
];

export const BEST_KEY = 'embergarden.best';
export const MUTE_KEY = 'embergarden.muted';

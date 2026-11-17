// Embergarden's rules: Luma's glow, the embers that feed it, the wisps that
// hunger for it, the gloomspores that spit orbs, the moonpetals that ward,
// the waves and their weather, the upgrades between them, and the Moth King.
// The world is pure logic — no DOM, no canvas — so a seed replays exactly.
import {
  BEST_KEY,
  COMBO,
  EMBER,
  FIELD,
  FIREFLY,
  GLOW,
  HERALD,
  MOONPETAL,
  MOTH_KING,
  PLAYER,
  SPORE,
  STARMOTH,
  STEP,
  UPGRADES,
  WAVES,
  WAVE_THEMES,
  WISP,
} from './config.js';
import { pick, range, shuffle } from './random.js';
import { createHerald, stepHerald } from './herald.js';

export const EVENT_PICKUP = 1;
export const EVENT_FIREFLY = 2;
export const EVENT_HIT = 4;
export const EVENT_DASH = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_WIN = 64;
export const EVENT_BOSS_HIT = 128;
export const EVENT_SHIELD = 256;
export const EVENT_PETAL = 512;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const KIND_EMBER = 'ember';
const KIND_FIREFLY = 'firefly';
const KIND_WISP = 'wisp';
const KIND_SPORE = 'spore';
const KIND_ORB = 'orb';
const KIND_PETAL = 'petal';
const KIND_MOTH = 'moth';

function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    glow: GLOW.start,
    maxGlow: GLOW.max,
    dashTime: 0,
    dashCooldown: 0,
    invuln: 0,
    shield: false,
    face: 0,
  };
}

export function createWorld(random) {
  const state = {
    screen: SCREEN_TITLE,
    player: makePlayer(),
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    wave: 1,
    theme: WAVE_THEMES[0],
    quota: WAVES.quotaBase + WAVES.quotaPerWave,
    quotaGot: 0,
    embers: [],
    fireflies: [],
    moths: [],
    wisps: [],
    spores: [],
    orbs: [],
    petals: [],
    boss: null,
    heraldBanished: false,
    mothsCaught: 0,
    particles: [],
    floats: [],
    motes: [],
    time: 0,
    playTime: 0,
    shake: 0,
    flash: 0,
    dashCount: 0,
    hitsTaken: 0,
    embersEaten: 0,
    firefliesEaten: 0,
    petalsEaten: 0,
    sporesScattered: 0,
    orbsScattered: 0,
    lightRadiusMult: 1,
    dashCooldownMult: 1,
    pickupBonus: 0,
    emberValueMult: 1,
    speedMult: 1,
    drainMult: 1,
    emberTrail: false,
    offered: [],
    spawnTimer: 0,
    fireflyTimer: 0,
    mothTimer: STARMOTH.everySeconds,
    emberTrickleTimer: 0,
    wispTimer: 0,
    sporeTimer: 0,
    petalTimer: MOONPETAL.everySeconds,
    banner: null,
  };

  // Ninety decorative motes drift through the garden forever, on every screen.
  for (let i = 0; i < 90; i += 1) {
    state.motes.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      phase: random() * Math.PI * 2,
      speed: range(random, 6, 18),
      size: range(random, 1.2, 3.2),
      gold: random() < 0.35,
    });
  }

  function lightRadius() {
    const glow = Math.max(0, state.player.glow);
    return (GLOW.lightBase + glow * GLOW.lightPerGlow) * state.lightRadiusMult;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = range(random, speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: range(random, 0.35, 0.8),
        maxLife: 0.8,
        size: range(random, 1.5, 3.5),
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, life: 1.1, maxLife: 1.1, color });
  }

  function showBanner(title, sub) {
    state.banner = { title, sub, timer: 2.6, max: 2.6 };
  }

  function spawnEmber(anywhere = false) {
    const margin = 30;
    state.embers.push({
      kind: KIND_EMBER,
      x: range(random, margin, FIELD.width - margin),
      y: anywhere ? range(random, margin, FIELD.height - margin) : FIELD.height + 12,
      vy: -range(random, EMBER.drift * 0.7, EMBER.drift * 1.3),
      phase: random() * Math.PI * 2,
      radius: EMBER.radius,
      active: true,
    });
  }

  function spawnEmberAt(x, y) {
    state.embers.push({
      kind: KIND_EMBER,
      x: Math.max(24, Math.min(FIELD.width - 24, x)),
      y: Math.max(24, Math.min(FIELD.height - 24, y)),
      vy: -range(random, 8, 20),
      phase: random() * Math.PI * 2,
      radius: EMBER.radius,
      active: true,
    });
  }

  function spawnFirefly() {
    const margin = 40;
    state.fireflies.push({
      kind: KIND_FIREFLY,
      x: range(random, margin, FIELD.width - margin),
      y: range(random, margin, FIELD.height - margin),
      vx: range(random, -FIREFLY.drift, FIREFLY.drift),
      vy: range(random, -FIREFLY.drift, FIREFLY.drift),
      phase: random() * Math.PI * 2,
      radius: FIREFLY.radius,
      active: true,
    });
  }

  function spawnPetal() {
    const margin = 60;
    state.petals.push({
      kind: KIND_PETAL,
      x: range(random, margin, FIELD.width - margin),
      y: range(random, margin, FIELD.height - margin),
      phase: random() * Math.PI * 2,
      radius: MOONPETAL.radius,
      life: 9,
      active: true,
    });
  }

  function spawnWisp() {
    const edge = Math.floor(random() * 4);
    let x;
    let y;
    if (edge === 0) {
      x = random() * FIELD.width;
      y = -16;
    } else if (edge === 1) {
      x = random() * FIELD.width;
      y = FIELD.height + 16;
    } else if (edge === 2) {
      x = -16;
      y = random() * FIELD.height;
    } else {
      x = FIELD.width + 16;
      y = random() * FIELD.height;
    }
    state.wisps.push({
      kind: KIND_WISP,
      x,
      y,
      vx: 0,
      vy: 0,
      phase: random() * Math.PI * 2,
      radius: WISP.radius,
      active: true,
    });
  }

  function spawnSpore() {
    // Rooted away from the keeper, never on top of her.
    let x;
    let y;
    for (let tries = 0; tries < 8; tries += 1) {
      x = range(random, 50, FIELD.width - 50);
      y = range(random, 60, FIELD.height - 60);
      if (Math.hypot(x - state.player.x, y - state.player.y) > 200) break;
    }
    state.spores.push({
      kind: KIND_SPORE,
      x,
      y,
      vx: range(random, -SPORE.drift, SPORE.drift),
      vy: range(random, -SPORE.drift, SPORE.drift),
      phase: random() * Math.PI * 2,
      radius: SPORE.radius,
      mode: 'aim',
      modeTimer: SPORE.aimSeconds,
      fireTimer: SPORE.fireInterval,
      active: true,
    });
  }

  function spawnBoss() {
    state.boss = {
      kind: 'king',
      x: FIELD.width / 2,
      y: -70,
      vx: 0,
      vy: 0,
      radius: MOTH_KING.radius,
      hits: 0,
      mode: 'enter',
      modeTimer: 99,
      targetX: FIELD.width / 2,
      targetY: 120,
      vulnerable: false,
      active: true,
    };
  }

  function spawnMoth() {
    // A star moth crosses the garden, left to right or right to left,
    // fast and high: catch it before it leaves.
    const fromLeft = random() < 0.5;
    state.moths.push({
      kind: KIND_MOTH,
      x: fromLeft ? -20 : FIELD.width + 20,
      y: range(random, 90, FIELD.height - 160),
      vx: (fromLeft ? 1 : -1) * STARMOTH.speed,
      phase: random() * Math.PI * 2,
      radius: STARMOTH.radius,
      active: true,
    });
  }

  function startWave(wave) {
    state.wave = wave;
    state.theme = WAVE_THEMES[wave - 1];
    state.quota = WAVES.quotaBase + WAVES.quotaPerWave * wave;
    state.quotaGot = 0;
    state.wisps.length = 0;
    state.embers.length = 0;
    state.fireflies.length = 0;
    state.moths.length = 0;
    state.spores.length = 0;
    state.orbs.length = 0;
    state.petals.length = 0;
    state.boss = null;
    state.wispTimer = 1.2;
    state.fireflyTimer = 2;
    state.sporeTimer = 3;
    // The petal clock is NOT reset here: a moonpetal blooms on its own
    // schedule, about every 24 seconds of play, whatever the wave.
    for (let i = 0; i < 5 + wave; i += 1) spawnEmber(true);
    for (let i = 0; i < 2; i += 1) spawnFirefly();
    if (wave === WAVES.total) spawnBoss();
    if (wave === HERALD.firstWave) state.boss = createHerald(random);
    showBanner(`WAVE ${wave} — ${state.theme.name}`, state.theme.sub);
  }

  function offerUpgrades() {
    const drawn = shuffle(random, UPGRADES).slice(0, 3);
    state.offered = drawn;
    return drawn;
  }

  function applyUpgrade(id) {
    const player = state.player;
    if (id === 'wide-glow') state.lightRadiusMult *= 1.3;
    else if (id === 'swift-dash') state.dashCooldownMult *= 0.65;
    else if (id === 'magnet') state.pickupBonus += 42;
    else if (id === 'rich-embers') state.emberValueMult *= 1.5;
    else if (id === 'second-wind') {
      player.maxGlow += 10;
      player.glow = Math.min(player.maxGlow, player.glow + 35);
    } else if (id === 'swift-wings') state.speedMult *= 1.18;
    else if (id === 'slow-burn') state.drainMult *= 0.8;
    else if (id === 'ember-trail') state.emberTrail = true;
    state.offered = [];
  }

  function addCombo() {
    state.combo += 1;
    state.comboTimer = COMBO.windowSeconds;
    state.multiplier = 1 + Math.min(state.combo, 12) * COMBO.step;
  }

  function breakCombo() {
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
  }

  function takeHit(fromX, fromY, damage) {
    const player = state.player;
    if (player.shield) {
      // The moonpetal's ward holds: one hit, swallowed whole.
      player.shield = false;
      player.invuln = 1.1;
      state.shake = 0.18;
      burst(player.x, player.y, '#ffffff', 16, 240);
      floatText(player.x, player.y - 26, 'SHIELD HELD', '#ffffff');
      return EVENT_SHIELD;
    }
    player.glow -= damage;
    state.hitsTaken += 1;
    state.shake = 0.35;
    state.flash = 0.5;
    breakCombo();
    const dx = player.x - fromX;
    const dy = player.y - fromY;
    const length = Math.hypot(dx, dy) || 1;
    player.vx += (dx / length) * 420;
    player.vy += (dy / length) * 420;
    player.invuln = 1.1;
    burst(player.x, player.y, '#b78cff', 18, 260);
    if (player.glow <= 0) {
      player.glow = 0;
      burst(player.x, player.y, '#ffd76a', 40, 320);
      state.screen = SCREEN_OVER;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function stepBoss(dt) {
    const boss = state.boss;
    const player = state.player;
    if (!boss || !boss.active) return 0;
    boss.modeTimer -= dt;
    if (boss.mode === 'enter') {
      boss.y += (120 - boss.y) * dt * 1.6;
      if (boss.modeTimer <= 0 || Math.abs(boss.y - 120) < 4) {
        boss.mode = 'telegraph';
        boss.modeTimer = 0.7;
      }
      return 0;
    }
    if (boss.mode === 'telegraph') {
      // The king shows where it will strike: a lit line to its target.
      boss.targetX = player.x;
      boss.targetY = player.y;
      if (boss.modeTimer <= 0) {
        boss.mode = 'swoop';
        const dx = boss.targetX - boss.x;
        const dy = boss.targetY - boss.y;
        const length = Math.hypot(dx, dy) || 1;
        boss.vx = (dx / length) * MOTH_KING.swoopSpeed;
        boss.vy = (dy / length) * MOTH_KING.swoopSpeed;
      }
      return 0;
    }
    if (boss.mode === 'swoop') {
      boss.x += boss.vx * dt;
      boss.y += boss.vy * dt;
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const distance = Math.hypot(dx, dy);
      const hitPlayer = distance < boss.radius + player.radius - 6;
      const outOfField =
        boss.x < -80 || boss.x > FIELD.width + 80 || boss.y < -80 || boss.y > FIELD.height + 80;
      if (hitPlayer && player.invuln <= 0 && player.dashTime <= 0) {
        const event = takeHit(boss.x, boss.y, GLOW.wispHit);
        boss.mode = 'pause';
        boss.modeTimer = MOTH_KING.swoopPause;
        return event;
      }
      if (hitPlayer && player.dashTime > 0) {
        // A dash through a swooping king does nothing: it is only vulnerable
        // while it rests and glows after the swoop.
        boss.mode = 'pause';
        boss.modeTimer = MOTH_KING.swoopPause;
        return 0;
      }
      if (outOfField || boss.modeTimer < -2) {
        boss.mode = 'rest';
        boss.modeTimer = MOTH_KING.restSeconds;
        boss.vulnerable = true;
      }
      return 0;
    }
    if (boss.mode === 'pause') {
      if (boss.modeTimer <= 0) {
        boss.mode = 'rest';
        boss.modeTimer = MOTH_KING.restSeconds;
        boss.vulnerable = true;
      }
      return 0;
    }
    if (boss.mode === 'rest') {
      boss.vulnerable = true;
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const distance = Math.hypot(dx, dy);
      if (distance < boss.radius + player.radius && player.dashTime > 0) {
        boss.hits += 1;
        boss.vulnerable = false;
        burst(boss.x, boss.y, '#ffd76a', 30, 340);
        state.shake = 0.4;
        if (boss.hits >= MOTH_KING.hitsToBanish) {
          boss.active = false;
          burst(boss.x, boss.y, '#fff3c4', 60, 420);
          state.screen = SCREEN_WIN;
          return EVENT_BOSS_HIT | EVENT_WIN;
        }
        boss.mode = 'telegraph';
        boss.modeTimer = 0.7;
        return EVENT_BOSS_HIT;
      }
      if (distance < boss.radius + player.radius - 4 && player.invuln <= 0 && player.dashTime <= 0) {
        const event = takeHit(boss.x, boss.y, GLOW.wispHit);
        boss.mode = 'telegraph';
        boss.modeTimer = 0.7;
        boss.vulnerable = false;
        return event;
      }
      if (boss.modeTimer <= 0) {
        boss.vulnerable = false;
        boss.mode = 'telegraph';
        boss.modeTimer = 0.7;
      }
      return 0;
    }
    return 0;
  }

  function stepSpores(dt) {
    const player = state.player;
    for (const spore of state.spores) {
      if (!spore.active) continue;
      spore.phase += dt * 2;
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;
      if (spore.x < 30 || spore.x > FIELD.width - 30) spore.vx *= -1;
      if (spore.y < 40 || spore.y > FIELD.height - 40) spore.vy *= -1;
      if (spore.mode === 'aim') {
        spore.modeTimer -= dt;
        if (spore.modeTimer <= 0) {
          // Spit one slow orb at where the keeper stands now.
          const dx = player.x - spore.x;
          const dy = player.y - spore.y;
          const length = Math.hypot(dx, dy) || 1;
          state.orbs.push({
            kind: KIND_ORB,
            x: spore.x,
            y: spore.y,
            vx: (dx / length) * SPORE.orbSpeed,
            vy: (dy / length) * SPORE.orbSpeed,
            radius: SPORE.orbRadius,
            life: SPORE.orbLife,
            active: true,
          });
          spore.mode = 'cool';
          spore.modeTimer = SPORE.fireInterval;
          burst(spore.x, spore.y, '#b78cff', 6, 120);
        }
      } else {
        spore.modeTimer -= dt;
        if (spore.modeTimer <= 0) {
          spore.mode = 'aim';
          spore.modeTimer = SPORE.aimSeconds;
        }
      }
    }
    state.spores = state.spores.filter((s) => s.active);
  }

  function stepOrbs(dt) {
    const player = state.player;
    let events = 0;
    for (const orb of state.orbs) {
      if (!orb.active) continue;
      orb.life -= dt;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (orb.life <= 0 || orb.x < -30 || orb.x > FIELD.width + 30 || orb.y < -30 || orb.y > FIELD.height + 30) {
        orb.active = false;
        continue;
      }
      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      if (Math.hypot(dx, dy) < player.radius + orb.radius) {
        if (player.dashTime > 0) {
          // Dashing through an orb scatters it.
          orb.active = false;
          burst(orb.x, orb.y, '#b78cff', 10, 200);
          state.orbsScattered += 1;
          state.score += 5;
        } else if (player.invuln <= 0) {
          orb.active = false;
          events |= takeHit(orb.x, orb.y, GLOW.orbHit);
          if (events & EVENT_OVER) return events;
        }
      }
    }
    state.orbs = state.orbs.filter((o) => o.active);
    return events;
  }

  function stepPlay(dt, input) {
    const player = state.player;
    const theme = state.theme;
    let events = 0;
    state.time += dt;
    state.playTime += dt;

    // The light always burns: glow drains, faster in later waves and on
    // the Long Night; Slow Burn eases it.
    player.glow -= (GLOW.drainPerSecond + GLOW.drainPerWave * (state.wave - 1)) * theme.drainMult * state.drainMult * dt;
    if (player.glow <= 0) {
      player.glow = 0;
      burst(player.x, player.y, '#ffd76a', 40, 320);
      state.screen = SCREEN_OVER;
      return EVENT_OVER;
    }

    // Steering: the mouse leads, the keys answer, and a dash is a burst.
    let desiredX = 0;
    let desiredY = 0;
    if (input.mouse) {
      const dx = input.mouse.x - player.x;
      const dy = input.mouse.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 4) {
        const speed = Math.min(PLAYER.speed * state.speedMult, distance * 8);
        desiredX = (dx / distance) * speed;
        desiredY = (dy / distance) * speed;
      }
    }
    if (input.keys.left) desiredX -= PLAYER.speed * state.speedMult;
    if (input.keys.right) desiredX += PLAYER.speed * state.speedMult;
    if (input.keys.up) desiredY -= PLAYER.speed * state.speedMult;
    if (input.keys.down) desiredY += PLAYER.speed * state.speedMult;
    const desiredLength = Math.hypot(desiredX, desiredY);
    if (desiredLength > PLAYER.speed * state.speedMult) {
      desiredX = (desiredX / desiredLength) * PLAYER.speed * state.speedMult;
      desiredY = (desiredY / desiredLength) * PLAYER.speed * state.speedMult;
    }

    if (input.dash && player.dashCooldown <= 0 && player.glow > PLAYER.dashCost) {
      player.glow -= PLAYER.dashCost;
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown * state.dashCooldownMult;
      player.invuln = Math.max(player.invuln, PLAYER.dashTime + PLAYER.invulnAfterDash);
      const dashLength = desiredLength || 1;
      const dashX = desiredLength ? desiredX / dashLength : Math.cos(player.face);
      const dashY = desiredLength ? desiredY / dashLength : Math.sin(player.face);
      player.vx = dashX * PLAYER.dashSpeed;
      player.vy = dashY * PLAYER.dashSpeed;
      state.dashCount += 1;
      events |= EVENT_DASH;
      burst(player.x, player.y, '#9fe8ff', 10, 200);
      if (state.emberTrail) {
        // The trail: three fresh embers where the dash began.
        for (let i = 1; i <= 3; i += 1) {
          spawnEmberAt(player.x - dashX * 22 * i, player.y - dashY * 22 * i);
        }
      }
    }

    if (player.dashTime > 0) {
      player.dashTime -= dt;
    } else {
      player.vx += (desiredX - player.vx) * Math.min(1, PLAYER.accel * dt / (PLAYER.speed * state.speedMult));
      player.vy += (desiredY - player.vy) * Math.min(1, PLAYER.accel * dt / (PLAYER.speed * state.speedMult));
      const drag = Math.exp(-PLAYER.friction * dt);
      if (desiredLength === 0) {
        player.vx *= drag;
        player.vy *= drag;
      }
    }
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
    if (Math.hypot(player.vx, player.vy) > 20) player.face = Math.atan2(player.vy, player.vx);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);

    // Combo window ticks down; a lapsed chain falls back to x1.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) breakCombo();
    }

    // Spawning: embers keep the garden fed, fireflies wander in, wisps hunt,
    // spores root and spit, and a moonpetal blooms now and then.
    const emberTarget = Math.round((5 + state.wave) * theme.emberMult);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.embers.length < emberTarget) {
      spawnEmber();
      state.spawnTimer = 0.55 / Math.max(1, theme.emberMult);
    }
    state.fireflyTimer -= dt;
    if (state.fireflyTimer <= 0) {
      spawnFirefly();
      state.fireflyTimer = (WAVES.fireflyEverySeconds + random() * 3) / Math.max(1, theme.fireflyMult);
    }
    const wispCap = Math.min(9, Math.round((WISP.maxAliveBase + WISP.maxAlivePerWave * state.wave) * theme.wispMult));
    state.wispTimer -= dt;
    if (state.wispTimer <= 0 && state.wisps.length < wispCap) {
      spawnWisp();
      const interval = Math.max(0.9, WISP.spawnInterval - WISP.spawnShrinkPerWave * state.wave);
      state.wispTimer = interval * range(random, 0.8, 1.2) / Math.max(1, theme.wispMult);
    }
    const sporeCap = state.wave >= SPORE.firstWave
      ? Math.min(4, Math.round((state.wave - SPORE.firstWave + 1) * theme.sporeMult))
      : 0;
    state.sporeTimer -= dt;
    if (state.sporeTimer <= 0 && state.spores.length < sporeCap) {
      spawnSpore();
      state.sporeTimer = range(random, 2.5, 4);
    }
    state.petalTimer -= dt;
    if (state.petalTimer <= 0 && state.petals.length === 0) {
      spawnPetal();
      state.petalTimer = MOONPETAL.everySeconds + random() * 6;
    }
    if (state.boss && state.boss.kind === 'king') {
      state.emberTrickleTimer -= dt;
      if (state.emberTrickleTimer <= 0) {
        spawnEmber(true);
        state.emberTrickleTimer = MOTH_KING.emberTrickleSeconds;
      }
    }

    // Star moths cross the garden from wave 2: one at a time, fast, gone
    // in seconds — a chase worth a fortune.
    if (state.wave >= STARMOTH.firstWave) {
      state.mothTimer -= dt;
      if (state.mothTimer <= 0 && state.moths.length === 0) {
        spawnMoth();
        state.mothTimer = STARMOTH.everySeconds + random() * 8;
      }
    }

    // Embers rise and wobble; catching one feeds the light.
    const pickupRadius = state.pickupBonus;
    for (const ember of state.embers) {
      if (!ember.active) continue;
      ember.phase += dt * 2;
      ember.y += ember.vy * dt;
      ember.x += Math.sin(ember.phase) * EMBER.wobble * dt * 0.4;
      if (ember.y < -20) {
        ember.active = false;
        continue;
      }
      const dx = player.x - ember.x;
      const dy = player.y - ember.y;
      if (Math.hypot(dx, dy) < player.radius + ember.radius + pickupRadius) {
        ember.active = false;
        addCombo();
        const value = Math.round(EMBER.score * state.emberValueMult * theme.emberValueMult * state.multiplier);
        state.score += value;
        player.glow = Math.min(player.maxGlow, player.glow + GLOW.ember * state.emberValueMult);
        state.embersEaten += 1;
        state.quotaGot += 1;
        burst(ember.x, ember.y, '#ffd76a', 10, 180);
        floatText(ember.x, ember.y - 12, `+${value}`, '#ffd76a');
        events |= EVENT_PICKUP;
      }
    }
    state.embers = state.embers.filter((e) => e.active);

    // Fireflies drift; catching one is worth more and keeps the chain alive.
    const fireflyValueMult = theme.fireflyMult >= 2 ? 2 : 1;
    for (const fly of state.fireflies) {
      if (!fly.active) continue;
      fly.phase += dt * 2;
      fly.x += fly.vx * dt + Math.sin(fly.phase) * FIREFLY.wobble * dt * 0.5;
      fly.y += fly.vy * dt + Math.cos(fly.phase * 0.7) * FIREFLY.wobble * dt * 0.5;
      if (fly.x < 10 || fly.x > FIELD.width - 10) fly.vx *= -1;
      if (fly.y < 10 || fly.y > FIELD.height - 10) fly.vy *= -1;
      const dx = player.x - fly.x;
      const dy = player.y - fly.y;
      if (Math.hypot(dx, dy) < player.radius + fly.radius + pickupRadius) {
        fly.active = false;
        addCombo();
        const value = Math.round(FIREFLY.score * fireflyValueMult * state.multiplier);
        state.score += value;
        player.glow = Math.min(player.maxGlow, player.glow + GLOW.firefly);
        state.firefliesEaten += 1;
        burst(fly.x, fly.y, '#7ef0e0', 12, 200);
        floatText(fly.x, fly.y - 12, `+${value}`, '#7ef0e0');
        events |= EVENT_FIREFLY;
      }
    }
    state.fireflies = state.fireflies.filter((f) => f.active);

    // Moonpetals bloom briefly: a shield for one hit and a deep drink of glow.
    for (const petal of state.petals) {
      if (!petal.active) continue;
      petal.phase += dt * 1.5;
      petal.life -= dt;
      if (petal.life <= 0) {
        petal.active = false;
        continue;
      }
      const dx = player.x - petal.x;
      const dy = player.y - petal.y;
      if (Math.hypot(dx, dy) < player.radius + petal.radius + pickupRadius) {
        petal.active = false;
        addCombo();
        const value = Math.round(MOONPETAL.score * state.multiplier);
        state.score += value;
        player.glow = Math.min(player.maxGlow, player.glow + MOONPETAL.glow);
        player.shield = true;
        state.petalsEaten += 1;
        burst(petal.x, petal.y, '#ffffff', 18, 220);
        floatText(petal.x, petal.y - 12, `+${value} SHIELD`, '#ffffff');
        events |= EVENT_PETAL;
      }
    }
    state.petals = state.petals.filter((p) => p.active);

    // Star moths streak across the garden: catch one mid-flight and the
    // chain jumps. They leave as fast as they came.
    for (const moth of state.moths) {
      if (!moth.active) continue;
      moth.phase += dt * 3;
      moth.x += moth.vx * dt;
      moth.y += Math.sin(moth.phase) * 46 * dt;
      if (moth.x < -40 || moth.x > FIELD.width + 40) {
        moth.active = false;
        continue;
      }
      const dx = player.x - moth.x;
      const dy = player.y - moth.y;
      if (Math.hypot(dx, dy) < player.radius + moth.radius + pickupRadius) {
        moth.active = false;
        addCombo();
        const value = Math.round(STARMOTH.score * state.multiplier);
        state.score += value;
        state.mothsCaught += 1;
        burst(moth.x, moth.y, '#ffe9a8', 16, 240);
        floatText(moth.x, moth.y - 12, `+${value} STAR MOTH`, '#ffe9a8');
        events |= EVENT_FIREFLY;
      }
    }
    state.moths = state.moths.filter((m) => m.active);

    // Wisps steer toward the light. Touching one (unless dashing or shielded
    // by invulnerability) burns glow and breaks the combo.
    const wispSpeed = WISP.baseSpeed + WISP.speedPerWave * state.wave;
    for (const wisp of state.wisps) {
      if (!wisp.active) continue;
      wisp.phase += dt * 2;
      const dx = player.x - wisp.x;
      const dy = player.y - wisp.y;
      const distance = Math.hypot(dx, dy) || 1;
      const steer = WISP.seekTurn * dt;
      wisp.vx += (dx / distance) * wispSpeed * steer;
      wisp.vy += (dy / distance) * wispSpeed * steer;
      const speed = Math.hypot(wisp.vx, wisp.vy) || 1;
      const cap = wispSpeed * 1.25;
      if (speed > cap) {
        wisp.vx = (wisp.vx / speed) * cap;
        wisp.vy = (wisp.vy / speed) * cap;
      }
      wisp.x += wisp.vx * dt + Math.cos(wisp.phase) * WISP.wobble * dt * 0.4;
      wisp.y += wisp.vy * dt + Math.sin(wisp.phase) * WISP.wobble * dt * 0.4;
      if (distance < player.radius + wisp.radius - 2) {
        if (player.dashTime > 0) {
          // Dashing through a wisp scatters it.
          wisp.active = false;
          burst(wisp.x, wisp.y, '#b78cff', 14, 240);
          state.score += 5;
        } else if (player.invuln <= 0) {
          wisp.active = false;
          events |= takeHit(wisp.x, wisp.y, GLOW.wispHit);
          if (events & EVENT_OVER) return events;
        }
      }
    }
    state.wisps = state.wisps.filter((w) => w.active);

    // Spores aim and spit; their orbs drift and burn.
    stepSpores(dt);
    events |= stepOrbs(dt);
    if (events & EVENT_OVER) return events;

    // The bosses: the Gloom Herald on wave 4, the Moth King on wave 8.
    if (state.boss) {
      const bossApi = { state, random, takeHit, burst, floatText, spawnEmberAt, spawnPetal, showBanner };
      events |= state.boss.kind === 'herald' ? stepHerald(state.boss, bossApi, dt) : stepBoss(dt);
      if (events & (EVENT_OVER | EVENT_WIN)) return events;
      if (!state.boss.active) state.boss = null;
    }

    // Wave cleared: the quota is met. Wave 8 ends only with the king banished.
    if (state.quotaGot >= state.quota && state.wave < WAVES.total) {
      const bonus = WAVES.clearBonusPerWave * state.wave;
      state.score += bonus;
      floatText(player.x, player.y - 30, `Wave ${state.wave} clear! +${bonus}`, '#ffd76a');
      if (state.wave + 1 <= WAVES.total) offerUpgrades();
      state.screen = SCREEN_UPGRADE;
      return events | EVENT_WAVE_CLEAR;
    }

    return events;
  }

  function stepAmbient(dt) {
    for (const mote of state.motes) {
      mote.phase += dt * 0.5;
      mote.y -= mote.speed * dt * 0.4;
      mote.x += Math.sin(mote.phase) * 8 * dt;
      if (mote.y < -4) {
        mote.y = FIELD.height + 4;
        mote.x = random() * FIELD.width;
      }
    }
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const text of state.floats) {
      text.life -= dt;
      text.y -= 26 * dt;
    }
    state.floats = state.floats.filter((f) => f.life > 0);
    state.shake = Math.max(0, state.shake - dt);
    state.flash = Math.max(0, state.flash - dt * 1.6);
    if (state.banner) {
      state.banner.timer -= dt;
      if (state.banner.timer <= 0) state.banner = null;
    }
  }

  return {
    state,
    lightRadius,
    reset() {
      const best = state.best;
      const fresh = createWorld(random);
      Object.keys(state).forEach((key) => {
        state[key] = fresh.state[key];
      });
      state.best = best;
      state.screen = SCREEN_TITLE;
    },
    startGame() {
      state.player = makePlayer();
      state.score = 0;
      state.combo = 0;
      state.comboTimer = 0;
      state.multiplier = 1;
      state.time = 0;
      state.playTime = 0;
      state.dashCount = 0;
      state.hitsTaken = 0;
      state.embersEaten = 0;
      state.firefliesEaten = 0;
      state.petalsEaten = 0;
      state.sporesScattered = 0;
      state.orbsScattered = 0;
      state.lightRadiusMult = 1;
      state.dashCooldownMult = 1;
      state.pickupBonus = 0;
      state.emberValueMult = 1;
      state.speedMult = 1;
      state.drainMult = 1;
      state.emberTrail = false;
      state.offered = [];
      state.embers = [];
      state.fireflies = [];
      state.moths = [];
      state.mothTimer = STARMOTH.everySeconds;
      state.heraldBanished = false;
      state.mothsCaught = 0;
      state.wisps = [];
      state.spores = [];
      state.orbs = [];
      state.petals = [];
      state.boss = null;
      state.particles = [];
      state.floats = [];
      startWave(1);
      state.screen = SCREEN_PLAY;
    },
    nextWave() {
      startWave(state.wave + 1);
      state.screen = SCREEN_PLAY;
    },
    applyUpgrade,
    step(dt, input) {
      stepAmbient(dt);
      if (state.screen !== SCREEN_PLAY) return 0;
      return stepPlay(dt, input);
    },
  };
}

/** Read the saved best score (0 when storage is off). */
export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Save the best score. */
export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

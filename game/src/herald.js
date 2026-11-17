// The Gloom Herald, wave 4's mid-boss: one job — a rooted gloom-bloom
// that lumbers after the keeper, fans slow orbs at her, then opens its
// glowing heart. Only a dash through that open glow can banish it, twice.
// It lives in the world's boss slot, so it reads like the Moth King to the
// HUD, the autopilot and the playtest driver: same shape, same rules.
import { FIELD, GLOW, HERALD, SPORE } from './config.js';

// The boss-hit bit of the world's event mask (world.js EVENT_BOSS_HIT).
// Kept as a number here so herald.js never imports world.js back.
const EVENT_BOSS_HIT = 128;

/** A fresh Herald, entering from the top of the garden. */
export function createHerald(random) {
  void random;
  return {
    kind: 'herald',
    x: FIELD.width / 2,
    y: -70,
    vx: 0,
    vy: 0,
    radius: HERALD.radius,
    hits: 0,
    mode: 'enter',
    modeTimer: HERALD.enterSeconds,
    targetX: FIELD.width / 2,
    targetY: 140,
    vulnerable: false,
    active: true,
    phase: 0,
  };
}

/** The three orb angles of one fan, around the direction to the keeper. */
export function heraldFanAngles(herald, player) {
  const base = Math.atan2(player.y - herald.y, player.x - herald.x);
  return [base - HERALD.fanHalfAngle, base, base + HERALD.fanHalfAngle];
}

/**
 * Step the Herald one tick. `api` is the world's closures: state, random,
 * takeHit, burst, floatText, spawnEmberAt, spawnPetal and showBanner.
 * Returns the world's event bitmask (0, EVENT_HIT, EVENT_BOSS_HIT...).
 */
export function stepHerald(herald, api, dt) {
  const { state, random } = api;
  const player = state.player;
  if (!herald.active) return 0;
  herald.phase += dt * 2;
  herald.modeTimer -= dt;

  if (herald.mode === 'enter') {
    herald.y += (140 - herald.y) * dt * 1.6;
    if (herald.modeTimer <= 0 || Math.abs(herald.y - 140) < 4) {
      herald.mode = 'stalk';
      herald.modeTimer = HERALD.fireCooldown;
      api.showBanner('THE GLOOM HERALD', 'Dash through its open glow — twice.');
    }
    return 0;
  }

  if (herald.mode === 'stalk') {
    // Lumber after the keeper, never fast enough to catch a moving one.
    const dx = player.x - herald.x;
    const dy = player.y - herald.y;
    const length = Math.hypot(dx, dy) || 1;
    herald.x += (dx / length) * HERALD.stalkSpeed * dt;
    herald.y += (dy / length) * HERALD.stalkSpeed * dt;
    herald.x = Math.max(30, Math.min(FIELD.width - 30, herald.x));
    herald.y = Math.max(50, Math.min(FIELD.height - 50, herald.y));
    const distance = Math.hypot(player.x - herald.x, player.y - herald.y);
    if (distance < herald.radius + player.radius - 4 && player.dashTime <= 0 && player.invuln <= 0) {
      // A lumbering bloom, not a sharp wisp: its touch burns less.
      return api.takeHit(herald.x, herald.y, GLOW.orbHit);
    }
    if (herald.modeTimer <= 0) {
      herald.mode = 'telegraph';
      herald.modeTimer = HERALD.telegraphSeconds;
    }
    return 0;
  }

  if (herald.mode === 'telegraph') {
    // Track the keeper while it opens: the fan is never a surprise.
    herald.targetX = player.x;
    herald.targetY = player.y;
    if (herald.modeTimer <= 0) {
      for (const angle of heraldFanAngles(herald, player)) {
        state.orbs.push({
          kind: 'orb',
          x: herald.x,
          y: herald.y,
          vx: Math.cos(angle) * HERALD.orbSpeed,
          vy: Math.sin(angle) * HERALD.orbSpeed,
          radius: SPORE.orbRadius,
          life: SPORE.orbLife,
          active: true,
        });
      }
      api.burst(herald.x, herald.y, '#b78cff', 10, 200);
      herald.mode = 'rest';
      herald.modeTimer = HERALD.restSeconds;
      herald.vulnerable = true;
    }
    return 0;
  }

  if (herald.mode === 'rest') {
    herald.vulnerable = true;
    const dx = player.x - herald.x;
    const dy = player.y - herald.y;
    const distance = Math.hypot(dx, dy);
    if (distance < herald.radius + player.radius && player.dashTime > 0) {
      herald.hits += 1;
      herald.vulnerable = false;
      api.burst(herald.x, herald.y, '#ffd76a', 30, 340);
      state.shake = 0.4;
      if (herald.hits >= HERALD.hitsToBanish) {
        herald.active = false;
        state.heraldBanished = true;
        state.score += HERALD.score;
        api.floatText(herald.x, herald.y - 30, `HERALD BANISHED! +${HERALD.score}`, '#ffd76a');
        api.burst(herald.x, herald.y, '#fff3c4', 60, 420);
        api.spawnPetal();
        for (let i = 0; i < 3; i += 1) {
          api.spawnEmberAt(herald.x + (random() - 0.5) * 160, herald.y + (random() - 0.5) * 120);
        }
        return EVENT_BOSS_HIT;
      }
      herald.mode = 'telegraph';
      herald.modeTimer = HERALD.telegraphSeconds;
      return EVENT_BOSS_HIT;
    }
    if (distance < herald.radius + player.radius - 4 && player.invuln <= 0 && player.dashTime <= 0) {
      const event = api.takeHit(herald.x, herald.y, GLOW.orbHit);
      herald.mode = 'telegraph';
      herald.modeTimer = HERALD.telegraphSeconds;
      herald.vulnerable = false;
      return event;
    }
    if (herald.modeTimer <= 0) {
      herald.vulnerable = false;
      herald.mode = 'stalk';
      herald.modeTimer = HERALD.fireCooldown;
    }
    return 0;
  }

  return 0;
}

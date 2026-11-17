// The screenshot scenes behind ?shot=title|play|upgrade|boss|win|end. Each
// one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './world.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 300;
const WIN_LIMIT_SECONDS = 900;
const SAMPLE = 1 / 30;

/** Seconds until moving in `direction` runs the player into a threat. */
function timeToThreat(state, dx, dy, horizon) {
  const player = state.player;
  const length = Math.hypot(dx, dy) || 1;
  const vx = (dx / length) * PLAYER.speed;
  const vy = (dy / length) * PLAYER.speed;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = player.x + vx * t;
    const y = player.y + vy * t;
    for (const wisp of state.wisps) {
      const wx = wisp.x + wisp.vx * t;
      const wy = wisp.y + wisp.vy * t;
      if (Math.hypot(wx - x, wy - y) < player.radius + wisp.radius + 6) return t;
    }
    for (const orb of state.orbs) {
      const ox = orb.x + orb.vx * t;
      const oy = orb.y + orb.vy * t;
      if (Math.hypot(ox - x, oy - y) < player.radius + orb.radius + 4) return t;
    }
  }
  return Infinity;
}

/** Steer toward the nearest ember (or a close moonpetal), swerving around
 * wisps and orbs; dash through the Moth King while it rests and glows. */
function autopilot(state, horizon, careless) {
  const player = state.player;
  const boss = state.boss;
  // The king, resting and glowing: dash through it now — but approach on
  // the safest line, not through a wisp.
  if (!careless && boss && boss.active && boss.vulnerable) {
    const distance = Math.hypot(boss.x - player.x, boss.y - player.y);
    const dx = boss.x - player.x;
    const dy = boss.y - player.y;
    const candidates = [
      [dx, dy],
      [dx + 110, dy],
      [dx - 110, dy],
      [dx, dy + 110],
      [dx, dy - 110],
    ];
    let best = candidates[0];
    let bestTime = timeToThreat(state, best[0], best[1], 0.7);
    for (const candidate of candidates.slice(1)) {
      const time = timeToThreat(state, candidate[0], candidate[1], 0.7);
      if (time > bestTime) {
        bestTime = time;
        best = candidate;
      }
    }
    return {
      mouse: { x: player.x + best[0], y: player.y + best[1] },
      keys: { up: false, down: false, left: false, right: false },
      dash: player.dashCooldown <= 0 && distance < 160 && bestTime > 0.2,
      confirm: false,
      pause: false,
      mute: false,
      restart: false,
      pick: null,
      click: null,
    };
  }
  // The king is about to swoop, or swooping: get out of its way — and out
  // of the nearest wisp's way too.
  if (!careless && boss && boss.active && (boss.mode === 'telegraph' || boss.mode === 'swoop')) {
    const awayX = player.x - boss.x;
    const awayY = player.y - boss.y;
    const length = Math.hypot(awayX, awayY) || 1;
    let tx = player.x + (awayX / length) * 240;
    let ty = player.y + (awayY / length) * 240;
    let threat = null;
    let threatDistance = 110;
    for (const wisp of state.wisps) {
      const distance = Math.hypot(wisp.x - player.x, wisp.y - player.y);
      if (distance < threatDistance) {
        threatDistance = distance;
        threat = wisp;
      }
    }
    if (threat) {
      const ax = player.x - threat.x;
      const ay = player.y - threat.y;
      const al = Math.hypot(ax, ay) || 1;
      tx += (ax / al) * 120;
      ty += (ay / al) * 120;
    }
    return {
      mouse: { x: tx, y: ty },
      keys: { up: false, down: false, left: false, right: false },
      dash: false,
      confirm: false,
      pause: false,
      mute: false,
      restart: false,
      pick: null,
      click: null,
    };
  }
  // A moonpetal nearby is worth the detour: a shield for one hit.
  let target = null;
  let targetDistance = 280;
  for (const petal of state.petals) {
    const distance = Math.hypot(petal.x - player.x, petal.y - player.y);
    if (distance < targetDistance) {
      targetDistance = distance;
      target = petal;
    }
  }
  let ember = null;
  if (!target) {
    for (const item of state.embers) {
      const distance = Math.hypot(item.x - player.x, item.y - player.y);
      if (!ember || distance < ember.distance) ember = { ...item, distance };
    }
    target = ember;
  }
  const targetX = target ? target.x : FIELD.width / 2;
  const targetY = target ? target.y : FIELD.height / 2;
  let dx = targetX - player.x;
  let dy = targetY - player.y;
  if (!careless) {
    // A wisp or orb within 130 px: swerve perpendicular to it.
    let threat = null;
    let threatDistance = 130;
    for (const wisp of state.wisps) {
      const distance = Math.hypot(wisp.x - player.x, wisp.y - player.y);
      if (distance < threatDistance) {
        threatDistance = distance;
        threat = wisp;
      }
    }
    for (const orb of state.orbs) {
      const distance = Math.hypot(orb.x - player.x, orb.y - player.y);
      if (distance < threatDistance) {
        threatDistance = distance;
        threat = orb;
      }
    }
    if (threat) {
      const awayX = player.x - threat.x;
      const awayY = player.y - threat.y;
      const length = Math.hypot(awayX, awayY) || 1;
      dx = (awayX / length) * 200 - (dy / (Math.hypot(dx, dy) || 1)) * 60;
      dy = (awayY / length) * 200 + (dx / (Math.hypot(dx, dy) || 1)) * 60;
    }
    // Consider the four diagonal swerves too; keep the safest way to the target.
    const candidates = [
      [dx, dy],
      [dx + 120, dy],
      [dx - 120, dy],
      [dx, dy + 120],
      [dx, dy - 120],
    ];
    let best = candidates[0];
    let bestTime = timeToThreat(state, best[0], best[1], horizon);
    for (const candidate of candidates.slice(1)) {
      const time = timeToThreat(state, candidate[0], candidate[1], horizon);
      if (time > bestTime) {
        bestTime = time;
        best = candidate;
      }
    }
    [dx, dy] = best;
  }
  const dash = !careless && player.dashCooldown <= 0 && (
    state.wisps.some((wisp) => Math.hypot(wisp.x - player.x, wisp.y - player.y) < 62) ||
    state.orbs.some((orb) => Math.hypot(orb.x - player.x, orb.y - player.y) < 55)
  );
  return {
    mouse: { x: player.x + dx, y: player.y + dy },
    keys: { up: false, down: false, left: false, right: false },
    dash,
    confirm: false,
    pause: false,
    mute: false,
    restart: false,
    pick: null,
    click: null,
  };
}

function idleInput() {
  return {
    mouse: null,
    keys: { up: false, down: false, left: false, right: false },
    dash: false,
    confirm: false,
    pause: false,
    mute: false,
    restart: false,
    pick: null,
    click: null,
  };
}

/** Play forward until the given wave starts (auto-picking upgrades). */
function playToWave(world, wave, limitSeconds) {
  for (let i = 0; i < limitSeconds / STEP; i += 1) {
    if (world.state.wave >= wave && world.state.screen === SCREEN_PLAY) return true;
    const events = world.step(STEP, autopilot(world.state, 0.7, false));
    if (world.state.screen === SCREEN_UPGRADE) {
      world.applyUpgrade(world.state.offered[0].id);
      world.nextWave();
    }
    if (events & EVENT_OVER) return false;
    if (world.state.screen === SCREEN_WIN) return false;
  }
  return world.state.wave >= wave;
}

/**
 * Set `world` to the named scene (title, play, upgrade, boss, win or end)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end' && name !== 'boss' && name !== 'win') {
    for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) world.step(STEP, idleInput());
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startGame();
  if (name === 'upgrade') {
    for (let i = 0; i < UPGRADE_LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, 0.7, false));
      if (world.state.screen === SCREEN_UPGRADE || events & EVENT_WAVE_CLEAR) break;
      if (world.state.screen === SCREEN_OVER || events & EVENT_OVER) break;
    }
    return { screen: world.state.screen === SCREEN_UPGRADE ? SCREEN_UPGRADE : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'boss') {
    // Reach the Moth King, then play until it rests and glows: the cover
    // shows the game's biggest moment, the king vulnerable, not its first
    // minute — and not a keeper about to die.
    if (!playToWave(world, 8, 600)) return { screen: SCREEN_PLAY, best: world.state.score };
    for (let i = 0; i < 90 / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, 0.7, false));
      const boss = world.state.boss;
      // Wait for a rest in the open, where the king reads at a glance.
      if (boss && boss.vulnerable && boss.x > 120 && boss.x < 840 && boss.y > 80 && boss.y < 450) break;
      if (events & EVENT_OVER) break;
      if (world.state.screen === SCREEN_WIN) break;
      if (world.state.screen === SCREEN_UPGRADE) {
        world.applyUpgrade(world.state.offered[0].id);
        world.nextWave();
      }
    }
    return { screen: world.state.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    // Play the whole game, boss included, and show the dawn that follows.
    if (!playToWave(world, 8, 600)) return { screen: world.state.screen, best: world.state.score };
    for (let i = 0; i < WIN_LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, 0.7, false));
      if (events & EVENT_OVER) break;
      if (world.state.screen === SCREEN_WIN) break;
      if (world.state.screen === SCREEN_UPGRADE) {
        world.applyUpgrade(world.state.offered[0].id);
        world.nextWave();
      }
    }
    return { screen: world.state.screen, best: world.state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careless = name === 'end';
  const horizon = careless ? 0 : 0.7;
  for (let i = 0; i < limit / STEP; i += 1) {
    // The end scene's pilot plays well for a while, then freezes: the wisps
    // close in on a keeper who has stopped moving, as a tired player does.
    const input = name === 'end' && i * STEP > 15 ? idleInput() : autopilot(world.state, horizon, careless);
    const events = world.step(STEP, input);
    if (events & EVENT_OVER) break;
    if (world.state.screen === SCREEN_WIN) break;
    if (world.state.screen === SCREEN_UPGRADE) {
      // A good pilot clears a wave inside the play window: take the first gift.
      world.applyUpgrade(world.state.offered[0].id);
      world.nextWave();
    }
  }
  const over = world.state.screen === SCREEN_OVER;
  const win = world.state.screen === SCREEN_WIN;
  return { screen: over ? SCREEN_OVER : win ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
}

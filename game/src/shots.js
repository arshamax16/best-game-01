// The screenshot scenes behind ?shot=title|play|upgrade|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './world.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 300;
const SAMPLE = 1 / 30;

/** Seconds until moving in `direction` runs the player into a wisp. */
function timeToWisp(state, dx, dy, horizon) {
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
  }
  return Infinity;
}

/** Steer toward the nearest ember, swerving around wisps; dash when one is close. */
function autopilot(state, horizon, careless) {
  const player = state.player;
  let ember = null;
  for (const item of state.embers) {
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (!ember || distance < ember.distance) ember = { ...item, distance };
  }
  const targetX = ember ? ember.x : FIELD.width / 2;
  const targetY = ember ? ember.y : FIELD.height / 2;
  let dx = targetX - player.x;
  let dy = targetY - player.y;
  if (!careless) {
    // A wisp within 130 px: swerve perpendicular to it.
    let threat = null;
    let threatDistance = 130;
    for (const wisp of state.wisps) {
      const distance = Math.hypot(wisp.x - player.x, wisp.y - player.y);
      if (distance < threatDistance) {
        threatDistance = distance;
        threat = wisp;
      }
    }
    if (threat) {
      const awayX = player.x - threat.x;
      const awayY = player.y - threat.y;
      const length = Math.hypot(awayX, awayY) || 1;
      dx = (awayX / length) * 200 - (dy / (Math.hypot(dx, dy) || 1)) * 60;
      dy = (awayY / length) * 200 + (dx / (Math.hypot(dx, dy) || 1)) * 60;
    }
    // Consider the four diagonal swerves too; keep the safest way to the ember.
    const candidates = [
      [dx, dy],
      [dx + 120, dy],
      [dx - 120, dy],
      [dx, dy + 120],
      [dx, dy - 120],
    ];
    let best = candidates[0];
    let bestTime = timeToWisp(state, best[0], best[1], horizon);
    for (const candidate of candidates.slice(1)) {
      const time = timeToWisp(state, candidate[0], candidate[1], horizon);
      if (time > bestTime) {
        bestTime = time;
        best = candidate;
      }
    }
    [dx, dy] = best;
  }
  const dash = !careless && player.dashCooldown <= 0 && state.wisps.some((wisp) => Math.hypot(wisp.x - player.x, wisp.y - player.y) < 62);
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

/**
 * Set `world` to the named scene (title, play, upgrade or end) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
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

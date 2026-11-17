// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, upgrade, paused, game over and victory.
//
// ?seed=N fixes the garden's pattern. ?shot=title|play|upgrade|boss|win|end
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import {
  EVENT_BOSS_HIT,
  EVENT_DASH,
  EVENT_FIREFLY,
  EVENT_HIT,
  EVENT_OVER,
  EVENT_PETAL,
  EVENT_PICKUP,
  EVENT_SHIELD,
  EVENT_WAVE_CLEAR,
  EVENT_WIN,
  createWorld,
  readBest,
  saveBest,
} from './world.js';
import { MUTE_BUTTON, PAUSE_BUTTON, createRenderer, upgradeCardRects } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;
/** Input is ignored this long after the over/win screens appear, so the click
 * or keypress that ended the run cannot instantly restart it. */
const RESTART_LOCKOUT = 0.7;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
let best = readBest();
world.state.best = best;

function inside(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function playEvents(events) {
  const state = world.state;
  if (events & EVENT_PICKUP) audio.collect(state.combo);
  if (events & EVENT_FIREFLY) audio.firefly(state.combo);
  if (events & EVENT_PETAL) audio.petal();
  if (events & EVENT_SHIELD) audio.shield();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_DASH) audio.dash();
  if (events & EVENT_WAVE_CLEAR) audio.waveClear(state.wave);
  if (events & EVENT_BOSS_HIT) audio.bossHit();
  if (events & EVENT_WIN) {
    audio.victory();
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
  }
  if (events & EVENT_OVER) {
    audio.gameOver();
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.best, audio.muted, world.lightRadius());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = world.state.screen;
  let screenSince = performance.now() / 1000;
  let accumulator = 0;
  let last = performance.now();

  function setScreen(next, announcement) {
    screen = next;
    world.state.screen = next;
    screenSince = performance.now() / 1000;
    announce(announcement);
  }

  function frame(now) {
    const nowSeconds = now / 1000;
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const snapshot = input.read(nowSeconds);

    if (snapshot.mute) audio.toggleMute();

    // The pause and mute buttons answer clicks on the play and paused screens.
    if (snapshot.click && (screen === 'play' || screen === 'paused')) {
      if (inside(MUTE_BUTTON, snapshot.click)) audio.toggleMute();
      else if (inside(PAUSE_BUTTON, snapshot.click)) {
        if (screen === 'play') setScreen('paused', 'Paused. Press P to keep playing.');
        else setScreen('play', 'Playing.');
      }
    }

    if (screen === 'title') {
      if (snapshot.confirm) {
        audio.unlock();
        world.startGame();
        setScreen('play', 'Playing. Gather embers, dodge wisps.');
      }
    } else if (screen === 'play') {
      if (snapshot.pause) {
        setScreen('paused', 'Paused. Press P to keep playing.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const events = world.step(STEP, snapshot);
          playEvents(events);
          if (world.state.screen === 'upgrade') {
            setScreen('upgrade', `Wave ${world.state.wave} clear. Choose an upgrade.`);
            break;
          }
          if (world.state.screen === 'over') {
            setScreen('over', `Game over. Score ${world.state.score}.`);
            break;
          }
          if (world.state.screen === 'win') {
            setScreen('win', `Dawn breaks. Score ${world.state.score}.`);
            break;
          }
        }
      }
    } else if (screen === 'paused') {
      if (snapshot.pause || snapshot.confirm) setScreen('play', 'Playing.');
      else if (snapshot.restart) {
        world.startGame();
        setScreen('play', 'Playing. Gather embers, dodge wisps.');
      }
    } else if (screen === 'upgrade') {
      let choice = snapshot.pick;
      if (snapshot.click) {
        const rects = upgradeCardRects();
        const index = rects.findIndex((rect) => inside(rect, snapshot.click));
        if (index >= 0) choice = index + 1;
      }
      if (choice !== null && world.state.offered[choice - 1]) {
        audio.waveClear(world.state.wave);
        world.applyUpgrade(world.state.offered[choice - 1].id);
        world.nextWave();
        setScreen('play', `Wave ${world.state.wave}.`);
      }
    } else if (screen === 'over' || screen === 'win') {
      if (nowSeconds - screenSince > RESTART_LOCKOUT && (snapshot.restart || snapshot.confirm)) {
        audio.unlock();
        world.startGame();
        setScreen('play', 'Playing. Gather embers, dodge wisps.');
      }
    }

    // The title screen's garden still breathes while nobody plays.
    if (screen === 'title' || screen === 'upgrade' || screen === 'over' || screen === 'win') {
      world.step(STEP, {
        mouse: null,
        keys: { up: false, down: false, left: false, right: false },
        dash: false,
        confirm: false,
        pause: false,
        mute: false,
        restart: false,
        pick: null,
        click: null,
      });
    }

    renderer.draw(world.state, best, audio.muted, world.lightRadius());
    requestAnimationFrame(frame);
  }

  announce('Embergarden. Click or press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// Debug handle for play-testing (read-only view of the world).
window.__ember = world;

// Keep the best score in the page title for the dossier's outline.
document.title = `Embergarden — Keep the Light Alive (best ${best})`;
void BEST_KEY;

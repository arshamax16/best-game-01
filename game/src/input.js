// Input: the mouse steers Luma (she follows the cursor), the keyboard steers
// too, and Space or a click dashes. Actions are edge-triggered: pressing a
// key once fires once, holding it does not repeat.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';
export const ACTION_DASH = 'dash';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_DASH,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = FIELD.width / 2;
  let mouseY = FIELD.height / 2;
  let mouseSeen = false;
  let mouseDown = false;
  let mousePressed = false;
  let lastMouseMove = -100;

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.key);
    const action = KEY_ACTIONS[event.key];
    if (action) {
      pressed.add(action);
      if (action === ACTION_DASH || action === ACTION_CONFIRM) event.preventDefault();
    }
    if (event.key >= '1' && event.key <= '3') pressed.add(`pick-${event.key}`);
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  function onMouseMove(event) {
    const point = toField(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    mouseSeen = true;
    lastMouseMove = performance.now() / 1000;
  }

  function onMouseDown(event) {
    const point = toField(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    mouseSeen = true;
    mouseDown = true;
    mousePressed = true;
    lastMouseMove = performance.now() / 1000;
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onBlur() {
    keys.clear();
    mouseDown = false;
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    /** Snapshot for one fixed step, then clears the edge-triggered presses. */
    read(nowSeconds) {
      const up = keys.has('w') || keys.has('W') || keys.has('ArrowUp');
      const down = keys.has('s') || keys.has('S') || keys.has('ArrowDown');
      const left = keys.has('a') || keys.has('A') || keys.has('ArrowLeft');
      const right = keys.has('d') || keys.has('D') || keys.has('ArrowRight');
      const mouseFresh = mouseSeen && nowSeconds - lastMouseMove < 3;
      const snapshot = {
        keys: { up, down, left, right },
        mouse: mouseFresh ? { x: mouseX, y: mouseY } : null,
        dash: pressed.has(ACTION_DASH) || mousePressed,
        confirm: pressed.has(ACTION_CONFIRM) || mousePressed,
        pause: pressed.has(ACTION_PAUSE),
        mute: pressed.has(ACTION_MUTE),
        restart: pressed.has(ACTION_RESTART),
        pick: [1, 2, 3].find((n) => pressed.has(`pick-${n}`)) ?? null,
        click: mousePressed ? { x: mouseX, y: mouseY } : null,
      };
      pressed.clear();
      mousePressed = false;
      return snapshot;
    },
    destroy() {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}

// Embergarden's look: a dark garden at night, painted with light. Everything
// is procedural canvas — gradients, glow and silhouettes, no image files.
import { FIELD, GLOW, UPGRADES } from './config.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  SCREEN_WIN,
} from './world.js';

const TITLE_FONT = "Georgia, 'Times New Roman', serif";
const UI_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const PAUSE_BUTTON = { x: FIELD.width - 46, y: 10, w: 36, h: 36 };
export const MUTE_BUTTON = { x: FIELD.width - 88, y: 10, w: 36, h: 36 };

/** The three upgrade cards' rectangles, in field coordinates, for click tests. */
export function upgradeCardRects() {
  const w = 224;
  const h = 168;
  const gap = 26;
  const total = w * 3 + gap * 2;
  const x0 = (FIELD.width - total) / 2;
  const y = FIELD.height / 2 - 54;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const decorRandom = mulberry32(1337);
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: decorRandom() * FIELD.width,
      y: decorRandom() * FIELD.height * 0.62,
      size: 0.6 + decorRandom() * 1.6,
      phase: decorRandom() * Math.PI * 2,
      speed: 0.4 + decorRandom() * 1.2,
    });
  }
  const blades = [];
  for (let i = 0; i < 90; i += 1) {
    blades.push({
      x: (i / 90) * FIELD.width + (decorRandom() - 0.5) * 14,
      height: 26 + decorRandom() * 52,
      lean: (decorRandom() - 0.5) * 18,
      phase: decorRandom() * Math.PI * 2,
      flower: decorRandom() < 0.22,
    });
  }

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || FIELD.width;
    const height = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function drawBackground(time, dawn) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    if (dawn > 0) {
      sky.addColorStop(0, '#3a2b63');
      sky.addColorStop(0.55, '#7a4a72');
      sky.addColorStop(1, '#e8a56b');
    } else {
      sky.addColorStop(0, '#0a0e26');
      sky.addColorStop(0.55, '#181344');
      sky.addColorStop(1, '#2a1f58');
    }
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars, twinkling.
    for (const star of stars) {
      const alpha = 0.25 + 0.55 * Math.abs(Math.sin(time * star.speed + star.phase));
      context.globalAlpha = alpha * (1 - dawn * 0.8);
      context.fillStyle = '#dfe8ff';
      context.beginPath();
      context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // The moon, high and watchful.
    const moonX = FIELD.width - 130;
    const moonY = 92;
    const moonGlow = context.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
    moonGlow.addColorStop(0, `rgba(235, 240, 255, ${0.5 * (1 - dawn)})`);
    moonGlow.addColorStop(1, 'rgba(235, 240, 255, 0)');
    context.fillStyle = moonGlow;
    context.fillRect(moonX - 90, moonY - 90, 180, 180);
    context.fillStyle = `rgba(238, 242, 255, ${0.95 * (1 - dawn * 0.7)})`;
    context.beginPath();
    context.arc(moonX, moonY, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(190, 200, 235, ${0.8 * (1 - dawn * 0.7)})`;
    context.beginPath();
    context.arc(moonX - 10, moonY - 6, 7, 0, Math.PI * 2);
    context.arc(moonX + 8, moonY + 10, 5, 0, Math.PI * 2);
    context.fill();

    // Distant hills.
    context.fillStyle = dawn > 0 ? '#4a3560' : '#120d33';
    context.beginPath();
    context.moveTo(0, FIELD.height - 120);
    context.bezierCurveTo(220, FIELD.height - 190, 420, FIELD.height - 110, 640, FIELD.height - 160);
    context.bezierCurveTo(800, FIELD.height - 190, 900, FIELD.height - 130, FIELD.width, FIELD.height - 150);
    context.lineTo(FIELD.width, FIELD.height);
    context.lineTo(0, FIELD.height);
    context.closePath();
    context.fill();

    // The garden floor.
    const ground = context.createLinearGradient(0, FIELD.height - 90, 0, FIELD.height);
    ground.addColorStop(0, dawn > 0 ? '#3d2f52' : '#0a0718');
    ground.addColorStop(1, dawn > 0 ? '#241a33' : '#05030c');
    context.fillStyle = ground;
    context.fillRect(0, FIELD.height - 90, FIELD.width, 90);
  }

  function drawPlants(time) {
    context.strokeStyle = '#1b1440';
    context.lineWidth = 3;
    context.lineCap = 'round';
    for (const blade of blades) {
      const sway = Math.sin(time * 0.7 + blade.phase) * 6;
      const x = blade.x;
      const y = FIELD.height;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + blade.lean * 0.4 + sway * 0.4, y - blade.height * 0.6, x + blade.lean + sway, y - blade.height);
      context.stroke();
      if (blade.flower) {
        context.fillStyle = '#8a6bff';
        context.beginPath();
        context.arc(x + blade.lean + sway, y - blade.height, 4.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ffd76a';
        context.beginPath();
        context.arc(x + blade.lean + sway, y - blade.height, 2, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawMotes(state, time) {
    for (const mote of state.motes) {
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(time * 0.8 + mote.phase));
      context.globalAlpha = alpha;
      context.fillStyle = mote.gold ? '#ffd76a' : '#9fe8ff';
      context.beginPath();
      context.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function glowCircle(x, y, radius, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawEmber(ember, time) {
    const flicker = 0.75 + 0.25 * Math.sin(time * 6 + ember.phase * 3);
    glowCircle(ember.x, ember.y, 36 * flicker, 'rgba(255, 190, 80, 0.55)', 0.9);
    context.fillStyle = '#ffcf5e';
    context.save();
    context.translate(ember.x, ember.y);
    context.rotate(Math.sin(time * 2 + ember.phase) * 0.4);
    context.beginPath();
    context.moveTo(0, -ember.radius);
    context.lineTo(ember.radius * 0.7, 0);
    context.lineTo(0, ember.radius);
    context.lineTo(-ember.radius * 0.7, 0);
    context.closePath();
    context.fill();
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.arc(0, 0, 3.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawFireflyEntity(fly, time) {
    const pulse = 0.6 + 0.4 * Math.sin(time * 5 + fly.phase * 2);
    glowCircle(fly.x, fly.y, 22 * pulse, 'rgba(110, 240, 220, 0.5)', 0.9);
    context.fillStyle = '#a8f5e8';
    context.beginPath();
    context.arc(fly.x, fly.y, fly.radius * 0.75, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e6fffa';
    context.beginPath();
    context.arc(fly.x - 2, fly.y - 2, 2.4, 0, Math.PI * 2);
    context.fill();
  }

  function drawWisp(wisp, time) {
    const breathe = 1 + 0.12 * Math.sin(time * 4 + wisp.phase);
    glowCircle(wisp.x, wisp.y, 46 * breathe, 'rgba(150, 100, 255, 0.4)', 0.9);
    context.fillStyle = '#2a1b52';
    context.beginPath();
    context.arc(wisp.x, wisp.y, wisp.radius * breathe, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#b78cff';
    context.lineWidth = 1.6;
    context.beginPath();
    context.arc(wisp.x, wisp.y, wisp.radius * breathe * 0.82, 0, Math.PI * 2);
    context.stroke();
    // Two hungry eyes.
    const eyeDx = 4.5;
    const eyeDy = -2;
    context.fillStyle = '#ff5d73';
    context.beginPath();
    context.arc(wisp.x - eyeDx, wisp.y + eyeDy, 2.2, 0, Math.PI * 2);
    context.arc(wisp.x + eyeDx, wisp.y + eyeDy, 2.2, 0, Math.PI * 2);
    context.fill();
  }

  function drawBoss(boss, time) {
    if (!boss || !boss.active) return;
    const vulnerable = boss.vulnerable;
    const aura = vulnerable ? 'rgba(255, 215, 106, 0.55)' : 'rgba(150, 100, 255, 0.45)';
    glowCircle(boss.x, boss.y, 130, aura, 0.9);
    const flap = Math.sin(time * (boss.mode === 'swoop' ? 22 : 6)) * 0.5;
    context.save();
    context.translate(boss.x, boss.y);
    // Wings.
    context.fillStyle = '#241a4d';
    context.strokeStyle = vulnerable ? '#ffd76a' : '#8f6bff';
    context.lineWidth = 2;
    for (const side of [-1, 1]) {
      context.save();
      context.scale(side, 1);
      context.rotate(flap * 0.35);
      context.beginPath();
      context.ellipse(34, -6, 34, 20, -0.5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.beginPath();
      context.ellipse(28, 16, 24, 13, 0.5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    }
    // Body.
    context.fillStyle = '#1a1038';
    context.beginPath();
    context.ellipse(0, 0, 16, 26, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = vulnerable ? '#ffd76a' : '#b78cff';
    context.beginPath();
    context.ellipse(0, 0, 16, 26, 0, 0, Math.PI * 2);
    context.stroke();
    // Eyes.
    context.fillStyle = vulnerable ? '#ffd76a' : '#ff5d73';
    context.beginPath();
    context.arc(-6, -12, 3.4, 0, Math.PI * 2);
    context.arc(6, -12, 3.4, 0, Math.PI * 2);
    context.fill();
    // Antennae.
    context.strokeStyle = '#b78cff';
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(-5, -24);
    context.quadraticCurveTo(-12, -38, -18, -40);
    context.moveTo(5, -24);
    context.quadraticCurveTo(12, -38, 18, -40);
    context.stroke();
    context.restore();
    // Banishment pips.
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = i < boss.hits ? '#ffd76a' : 'rgba(255, 255, 255, 0.25)';
      context.beginPath();
      context.arc(boss.x - 18 + i * 18, boss.y - boss.radius - 16, 5, 0, Math.PI * 2);
      context.fill();
    }
    if (vulnerable) {
      context.fillStyle = '#ffd76a';
      context.font = `700 15px ${UI_FONT}`;
      context.textAlign = 'center';
      context.fillText('DASH THROUGH!', boss.x, boss.y + boss.radius + 26);
    }
  }

  function drawPlayer(state, time, lightRadiusValue) {
    const player = state.player;
    const low = player.glow < GLOW.lowFlickerBelow;
    const flicker = low ? 0.82 + 0.18 * Math.sin(time * 23) * Math.sin(time * 7.3) : 1;
    const radius = lightRadiusValue * flicker;

    // The lantern's aura: warm light that pushes the dark back.
    const aura = context.createRadialGradient(player.x, player.y, 6, player.x, player.y, radius);
    aura.addColorStop(0, 'rgba(255, 214, 110, 0.34)');
    aura.addColorStop(0.55, 'rgba(255, 190, 90, 0.12)');
    aura.addColorStop(1, 'rgba(255, 190, 90, 0)');
    context.fillStyle = aura;
    context.beginPath();
    context.arc(player.x, player.y, radius, 0, Math.PI * 2);
    context.fill();

    // Dash trail.
    if (player.dashTime > 0) {
      context.strokeStyle = 'rgba(159, 232, 255, 0.8)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(player.x - player.vx * 0.06, player.y - player.vy * 0.06);
      context.lineTo(player.x, player.y);
      context.stroke();
    }

    // Blink while invulnerable.
    if (player.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;

    // Wings: pale and wide, so the keeper reads as a firefly at a glance.
    const wingFlap = Math.sin(time * 26) * 0.6;
    context.fillStyle = 'rgba(225, 242, 255, 0.95)';
    context.shadowColor = 'rgba(159, 232, 255, 0.8)';
    context.shadowBlur = 8;
    for (const side of [-1, 1]) {
      context.save();
      context.translate(player.x, player.y - 5);
      context.rotate(side * (0.5 + wingFlap * 0.25));
      context.beginPath();
      context.ellipse(side * 13, -5, 12, 6, side * 0.5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.shadowBlur = 0;

    // Body: a bright little lantern.
    glowCircle(player.x, player.y, 40, 'rgba(255, 215, 106, 0.9)', 1);
    context.fillStyle = '#2b1d0a';
    context.beginPath();
    context.arc(player.x, player.y, player.radius * 0.8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffe9a8';
    context.beginPath();
    context.arc(player.x, player.y, player.radius * 0.62, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fffbe8';
    context.beginPath();
    context.arc(player.x - 2, player.y - 2, 3.4, 0, Math.PI * 2);
    context.fill();

    // Glow ring: the light meter, worn on the body.
    const fraction = Math.max(0, player.glow / player.maxGlow);
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = fraction > 0.3 ? '#ffd76a' : '#ff5d73';
    context.beginPath();
    context.arc(player.x, player.y, player.radius + 8, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
    context.stroke();

    // Dash cooldown arc, thin and blue.
    if (player.dashCooldown > 0) {
      const total = 2.5;
      const ready = 1 - Math.min(1, player.dashCooldown / total);
      context.strokeStyle = 'rgba(159, 232, 255, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 13, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
      context.stroke();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    for (const text of state.floats) {
      const alpha = Math.max(0, text.life / text.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = text.color;
      context.font = `700 17px ${UI_FONT}`;
      context.textAlign = 'center';
      context.fillText(text.text, text.x, text.y);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    const player = state.player;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    // Score.
    context.fillStyle = '#fff6d8';
    context.font = `800 34px ${UI_FONT}`;
    context.fillText(String(state.score), 22, 44);
    context.fillStyle = 'rgba(255, 246, 216, 0.65)';
    context.font = `600 14px ${UI_FONT}`;
    context.fillText(`BEST ${Math.max(best, state.score)}`, 22, 66);
    // Combo.
    if (state.multiplier > 1) {
      context.fillStyle = '#7ef0e0';
      context.font = `800 20px ${UI_FONT}`;
      context.fillText(`COMBO x${state.multiplier.toFixed(2).replace(/\.?0+$/, '')}`, 22, 94);
    }
    // Wave and quota, top centre.
    context.textAlign = 'center';
    context.fillStyle = '#fff6d8';
    context.font = `700 20px ${UI_FONT}`;
    if (state.wave === 8) {
      const hits = state.boss ? state.boss.hits : 0;
      context.fillText(`WAVE 8 — THE MOTH KING  ✦ ${hits}/3`, FIELD.width / 2, 34);
    } else {
      context.fillText(`WAVE ${state.wave} / 8`, FIELD.width / 2, 34);
      context.fillStyle = 'rgba(255, 246, 216, 0.7)';
      context.font = `600 14px ${UI_FONT}`;
      context.fillText(`Embers ${Math.min(state.quotaGot, state.quota)} / ${state.quota}`, FIELD.width / 2, 56);
    }
    // Glow bar, bottom centre.
    const barW = 260;
    const barH = 12;
    const barX = (FIELD.width - barW) / 2;
    const barY = FIELD.height - 30;
    const fraction = Math.max(0, player.glow / player.maxGlow);
    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.beginPath();
    context.roundRect(barX - 4, barY - 4, barW + 8, barH + 8, 8);
    context.fill();
    const gradient = context.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, '#ff9d5c');
    gradient.addColorStop(1, '#ffd76a');
    context.fillStyle = fraction > 0.3 ? gradient : '#ff5d73';
    context.beginPath();
    context.roundRect(barX, barY, barW * fraction, barH, 6);
    context.fill();
    context.fillStyle = 'rgba(255, 246, 216, 0.85)';
    context.font = `600 12px ${UI_FONT}`;
    context.textAlign = 'center';
    context.fillText('GLOW', FIELD.width / 2, barY - 10);
    // Pause and mute buttons.
    for (const button of [MUTE_BUTTON, PAUSE_BUTTON]) {
      context.fillStyle = 'rgba(0, 0, 0, 0.4)';
      context.beginPath();
      context.roundRect(button.x, button.y, button.w, button.h, 8);
      context.fill();
      context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      context.lineWidth = 1.5;
      context.stroke();
    }
    context.fillStyle = '#fff6d8';
    context.font = `700 18px ${UI_FONT}`;
    context.textAlign = 'center';
    context.fillText(muted ? '✕' : '♪', MUTE_BUTTON.x + 18, MUTE_BUTTON.y + 25);
    context.fillText('II', PAUSE_BUTTON.x + 18, PAUSE_BUTTON.y + 25);
    // Dash hint, bottom left.
    context.textAlign = 'left';
    context.fillStyle = 'rgba(255, 246, 216, 0.55)';
    context.font = `600 13px ${UI_FONT}`;
    context.fillText(player.dashCooldown > 0 ? 'Dash recharging…' : 'SPACE / CLICK — DASH', 22, FIELD.height - 18);
  }

  function dimScreen(alpha) {
    context.fillStyle = `rgba(4, 6, 18, ${alpha})`;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best, time) {
    dimScreen(0.42);
    const bob = Math.sin(time * 1.4) * 8;
    context.textAlign = 'center';
    glowCircle(FIELD.width / 2, 168 + bob, 150, 'rgba(255, 215, 106, 0.28)', 1);
    context.fillStyle = '#ffe9a8';
    context.font = `700 76px ${TITLE_FONT}`;
    context.fillText('EMBERGARDEN', FIELD.width / 2, 178 + bob);
    context.fillStyle = '#ffd76a';
    context.font = `italic 600 24px ${TITLE_FONT}`;
    context.fillText('Keep the light alive', FIELD.width / 2, 216 + bob);
    context.fillStyle = 'rgba(255, 246, 216, 0.9)';
    context.font = `600 17px ${UI_FONT}`;
    const lines = [
      'Gather golden embers to feed your lantern — its glow is your life.',
      'Chain fireflies for combos. Dodge the shadow wisps.',
      'Dash through the Moth King when it rests, three times, and dawn breaks.',
    ];
    lines.forEach((line, i) => {
      context.fillText(line, FIELD.width / 2, 268 + i * 28 + bob * 0.4);
    });
    context.fillStyle = '#7ef0e0';
    context.font = `700 17px ${UI_FONT}`;
    context.fillText('MOUSE or WASD to move  ·  SPACE or CLICK to dash  ·  P to pause  ·  M to mute', FIELD.width / 2, 372);
    const blink = 0.6 + 0.4 * Math.sin(time * 3.2);
    context.globalAlpha = blink;
    context.fillStyle = '#fff6d8';
    context.font = `800 24px ${UI_FONT}`;
    context.fillText('Click or press Enter to begin', FIELD.width / 2, 436);
    context.globalAlpha = 1;
    if (best > 0) {
      context.fillStyle = 'rgba(255, 246, 216, 0.75)';
      context.font = `600 16px ${UI_FONT}`;
      context.fillText(`Best score: ${best}`, FIELD.width / 2, 478);
    }
  }

  function drawUpgrade(state) {
    dimScreen(0.55);
    context.textAlign = 'center';
    context.fillStyle = '#ffe9a8';
    context.font = `700 40px ${TITLE_FONT}`;
    context.fillText(`Wave ${state.wave} clear!`, FIELD.width / 2, 108);
    context.fillStyle = 'rgba(255, 246, 216, 0.9)';
    context.font = `600 19px ${UI_FONT}`;
    context.fillText('The garden offers you a gift — choose one:', FIELD.width / 2, 146);
    const rects = upgradeCardRects();
    state.offered.forEach((upgrade, i) => {
      const rect = rects[i];
      context.fillStyle = 'rgba(20, 16, 56, 0.92)';
      context.beginPath();
      context.roundRect(rect.x, rect.y, rect.w, rect.h, 14);
      context.fill();
      context.strokeStyle = '#ffd76a';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = '#ffd76a';
      context.font = '44px ' + UI_FONT;
      context.fillText(upgrade.icon, rect.x + rect.w / 2, rect.y + 62);
      context.fillStyle = '#fff6d8';
      context.font = `800 20px ${UI_FONT}`;
      context.fillText(upgrade.name, rect.x + rect.w / 2, rect.y + 102);
      context.fillStyle = 'rgba(255, 246, 216, 0.8)';
      context.font = `600 15px ${UI_FONT}`;
      context.fillText(upgrade.desc, rect.x + rect.w / 2, rect.y + 130);
      context.fillStyle = 'rgba(126, 240, 224, 0.9)';
      context.font = `700 14px ${UI_FONT}`;
      context.fillText(`Press ${i + 1} or click`, rect.x + rect.w / 2, rect.y + 154);
    });
  }

  function drawPaused() {
    dimScreen(0.6);
    context.textAlign = 'center';
    context.fillStyle = '#ffe9a8';
    context.font = `700 52px ${TITLE_FONT}`;
    context.fillText('Paused', FIELD.width / 2, FIELD.height / 2 - 8);
    context.fillStyle = 'rgba(255, 246, 216, 0.85)';
    context.font = `600 18px ${UI_FONT}`;
    context.fillText('Press P or click to keep playing', FIELD.width / 2, FIELD.height / 2 + 34);
  }

  function drawOver(state, best) {
    dimScreen(0.62);
    context.textAlign = 'center';
    context.fillStyle = '#ffb3c0';
    context.font = `700 54px ${TITLE_FONT}`;
    context.fillText('The light went out', FIELD.width / 2, 168);
    context.fillStyle = 'rgba(255, 246, 216, 0.9)';
    context.font = `600 20px ${UI_FONT}`;
    context.fillText(`The garden dims — but embers always return.`, FIELD.width / 2, 210);
    context.fillStyle = '#fff6d8';
    context.font = `800 34px ${UI_FONT}`;
    context.fillText(`Score  ${state.score}`, FIELD.width / 2, 288);
    context.fillStyle = 'rgba(255, 246, 216, 0.75)';
    context.font = `600 18px ${UI_FONT}`;
    context.fillText(`Wave ${state.wave}  ·  ${state.embersEaten} embers  ·  ${state.firefliesEaten} fireflies  ·  Best ${Math.max(best, state.score)}`, FIELD.width / 2, 326);
    const blink = 0.6 + 0.4 * Math.sin(state.time * 3.2);
    context.globalAlpha = blink;
    context.fillStyle = '#ffd76a';
    context.font = `800 22px ${UI_FONT}`;
    context.fillText('Press R or click to try again', FIELD.width / 2, 396);
    context.globalAlpha = 1;
  }

  function drawWin(state, best) {
    const dawn = 1;
    context.textAlign = 'center';
    context.fillStyle = '#fff3c4';
    context.font = `700 62px ${TITLE_FONT}`;
    context.fillText('Dawn breaks!', FIELD.width / 2, 158);
    context.fillStyle = 'rgba(255, 246, 216, 0.95)';
    context.font = `italic 600 22px ${TITLE_FONT}`;
    context.fillText('The Moth King is banished. The garden glows again.', FIELD.width / 2, 200);
    context.fillStyle = '#fff6d8';
    context.font = `800 34px ${UI_FONT}`;
    context.fillText(`Score  ${state.score}`, FIELD.width / 2, 282);
    context.fillStyle = 'rgba(255, 246, 216, 0.85)';
    context.font = `600 18px ${UI_FONT}`;
    const minutes = Math.floor(state.playTime / 60);
    const seconds = Math.floor(state.playTime % 60).toString().padStart(2, '0');
    context.fillText(`Cleared in ${minutes}:${seconds}  ·  ${state.dashCount} dashes  ·  ${state.hitsTaken} hits taken  ·  Best ${Math.max(best, state.score)}`, FIELD.width / 2, 322);
    const blink = 0.6 + 0.4 * Math.sin(state.time * 3.2);
    context.globalAlpha = blink;
    context.fillStyle = '#ffd76a';
    context.font = `800 22px ${UI_FONT}`;
    context.fillText('Press R or click to play again', FIELD.width / 2, 392);
    context.globalAlpha = 1;
    void dawn;
  }

  function drawVignette(state, time) {
    const player = state.player;
    const low = player.glow < GLOW.lowFlickerBelow && state.screen === SCREEN_PLAY;
    const pulse = low ? 0.16 + 0.1 * Math.sin(time * 6) : 0;
    if (pulse <= 0 && state.flash <= 0) return;
    const gradient = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    gradient.addColorStop(0, 'rgba(10, 2, 20, 0)');
    gradient.addColorStop(1, `rgba(10, 2, 20, ${Math.min(0.85, pulse + state.flash * 0.4)})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 60, 90, ${state.flash * 0.14})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return {
    resize,
    draw(state, best, muted, lightRadiusValue) {
      resize();
      const time = state.time;
      const dawn = state.screen === SCREEN_WIN ? 1 : 0;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = '#070b1e';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
      const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 22 : 0;
      context.translate(shakeX, shakeY);
      drawBackground(time, dawn);
      drawMotes(state, time);
      for (const ember of state.embers) drawEmber(ember, time);
      for (const fly of state.fireflies) drawFireflyEntity(fly, time);
      for (const wisp of state.wisps) drawWisp(wisp, time);
      drawBoss(state.boss, time);
      drawPlants(time);
      if (state.screen !== SCREEN_TITLE) drawPlayer(state, time, lightRadiusValue);
      drawParticles(state);
      if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) drawHud(state, best, muted);
      if (state.screen === SCREEN_TITLE) drawTitle(state, best, time);
      if (state.screen === SCREEN_UPGRADE) drawUpgrade(state);
      if (state.screen === SCREEN_PAUSED) drawPaused();
      if (state.screen === SCREEN_OVER) drawOver(state, best);
      if (state.screen === SCREEN_WIN) drawWin(state, best);
      drawVignette(state, time);
    },
  };
}

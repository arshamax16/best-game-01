// Every sound in Embergarden is synthesized with the Web Audio API: no audio
// files, no network, just oscillators, noise and envelopes. The music is a
// slow pentatonic lullaby that plays itself while you play.
import { MUTE_KEY } from './config.js';

// A minor pentatonic ladder the whole soundtrack climbs: A C D E G.
const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
  let musicTimer = null;
  let musicStep = 0;
  let chirpTimer = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      startMusic();
      startChirps();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, gainValue, when = 0, slideTo = null) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, gainValue, filterFreq, when = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
    source.stop(t0 + seconds);
  }

  // The lullaby: one soft pluck every 0.55 s, wandering the scale, with a low
  // root drone underneath every eight steps.
  function startMusic() {
    if (musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const step = musicStep;
      musicStep += 1;
      const degree = [0, 2, 4, 1, 3, 5, 4, 2][step % 8];
      const note = SCALE[degree % SCALE.length];
      const t0 = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + 1.5);
      if (step % 8 === 0) {
        const drone = context.createOscillator();
        const droneGain = context.createGain();
        drone.type = 'triangle';
        drone.frequency.value = 110;
        droneGain.gain.setValueAtTime(0, t0);
        droneGain.gain.linearRampToValueAtTime(0.22, t0 + 0.4);
        droneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2);
        drone.connect(droneGain);
        droneGain.connect(musicGain);
        drone.start(t0);
        drone.stop(t0 + 4.3);
      }
    }, 550);
  }

  // Crickets: a tiny high chirp every few seconds, placed at random.
  function startChirps() {
    if (chirpTimer !== null) return;
    const chirp = () => {
      if (!muted && context) {
        const base = 4200 + Math.random() * 800;
        tone(base, 0.05, 'sine', 0.05);
        tone(base * 1.06, 0.05, 'sine', 0.04, 0.07);
        tone(base, 0.05, 'sine', 0.04, 0.14);
      }
      chirpTimer = window.setTimeout(chirp, 2500 + Math.random() * 5000);
    };
    chirpTimer = window.setTimeout(chirp, 1800);
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
    collect(combo) {
      if (!ensure()) return;
      const degree = Math.min(SCALE.length - 1, 2 + Math.min(combo, 10));
      tone(SCALE[degree], 0.35, 'sine', 0.32);
      tone(SCALE[degree] * 2, 0.22, 'triangle', 0.1);
    },
    firefly(combo) {
      if (!ensure()) return;
      const degree = Math.min(SCALE.length - 1, 4 + Math.min(combo, 8));
      tone(SCALE[degree], 0.3, 'sine', 0.26, 0, SCALE[degree] * 1.5);
    },
    petal() {
      if (!ensure()) return;
      [8, 7, 5].forEach((step, i) => {
        tone(SCALE[step % SCALE.length], 0.5, 'sine', 0.22, i * 0.08);
      });
    },
    shield() {
      if (!ensure()) return;
      tone(660, 0.25, 'triangle', 0.22, 0, 880);
      tone(880, 0.3, 'sine', 0.16, 0.05);
    },
    hit() {
      if (!ensure()) return;
      tone(140, 0.3, 'sawtooth', 0.3, 0, 55);
      noise(0.25, 0.25, 900);
    },
    dash() {
      if (!ensure()) return;
      noise(0.18, 0.16, 3200);
      tone(520, 0.16, 'sine', 0.12, 0, 980);
    },
    waveClear(wave) {
      if (!ensure()) return;
      const base = 3 + Math.min(wave, 5);
      [0, 1, 2, 4].forEach((step, i) => {
        tone(SCALE[(base + step) % SCALE.length], 0.4, 'sine', 0.24, i * 0.09);
      });
    },
    bossHit() {
      if (!ensure()) return;
      tone(98, 0.5, 'sawtooth', 0.32, 0, 49);
      noise(0.4, 0.3, 500);
      tone(SCALE[7], 0.4, 'sine', 0.2, 0.08);
    },
    victory() {
      if (!ensure()) return;
      [0, 2, 4, 5, 7, 8].forEach((step, i) => {
        tone(SCALE[step % SCALE.length], 0.6, 'sine', 0.26, i * 0.13);
        tone(SCALE[step % SCALE.length] * 2, 0.3, 'triangle', 0.08, i * 0.13);
      });
    },
    gameOver() {
      if (!ensure()) return;
      [7, 5, 3, 1].forEach((step, i) => {
        tone(SCALE[step], 0.7, 'sine', 0.24, i * 0.22);
      });
    },
  };
}

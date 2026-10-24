// Browser-only UI sounds and haptics. Sounds are synthesized with Web Audio,
// so there are no files to download, and they stay quiet: a venue full of
// phones should never sound like an arcade. One switch covers both.

import { useSyncExternalStore } from "react";

export type Cue = "tap" | "toggle" | "start" | "stop" | "notify" | "success" | "error";

const STORAGE_KEY = "tg:sound";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  listeners.forEach((l) => l());
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readEnabled,
    () => true,
  );
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { freq: number; at?: number; dur: number; type?: OscillatorType; gain?: number };

function tone(ac: AudioContext, { freq, at = 0, dur, type = "sine", gain = 0.05 }: Tone) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A short filtered noise tick, like a key press on a phone. */
function tick(ac: AudioContext, centre: number, gain = 0.09) {
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.012);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ac.createBufferSource();
  const band = ac.createBiquadFilter();
  const amp = ac.createGain();
  src.buffer = buffer;
  band.type = "bandpass";
  band.frequency.value = centre;
  band.Q.value = 1.4;
  amp.gain.value = gain;
  src.connect(band).connect(amp).connect(ac.destination);
  src.start(t);
}

const SOUNDS: Record<Cue, (ac: AudioContext) => void> = {
  tap: (ac) => tick(ac, 3200),
  toggle: (ac) => tick(ac, 4600, 0.07),
  start: (ac) => {
    tone(ac, { freq: 660, dur: 0.09 });
    tone(ac, { freq: 990, at: 0.07, dur: 0.14 });
  },
  stop: (ac) => {
    tone(ac, { freq: 990, dur: 0.09 });
    tone(ac, { freq: 660, at: 0.07, dur: 0.14 });
  },
  notify: (ac) => tone(ac, { freq: 1046.5, dur: 0.22, type: "triangle", gain: 0.035 }),
  success: (ac) => {
    tone(ac, { freq: 1046.5, dur: 0.18, type: "triangle", gain: 0.035 });
    tone(ac, { freq: 1318.5, at: 0.08, dur: 0.2, type: "triangle", gain: 0.035 });
    tone(ac, { freq: 1568, at: 0.16, dur: 0.32, type: "triangle", gain: 0.035 });
  },
  error: (ac) => {
    tone(ac, { freq: 233, dur: 0.12, type: "triangle", gain: 0.06 });
    tone(ac, { freq: 196, at: 0.1, dur: 0.18, type: "triangle", gain: 0.06 });
  },
};

// Android only: iOS Safari has no vibration API.
const HAPTICS: Record<Cue, number | number[]> = {
  tap: 6,
  toggle: 6,
  start: 14,
  stop: [8, 50, 8],
  notify: 8,
  success: [10, 70, 16],
  error: [24, 50, 24],
};

/** Plays a cue's sound and haptic, unless the person turned them off. Never throws. */
export function cue(name: Cue): void {
  if (typeof window === "undefined" || !readEnabled()) return;
  try {
    const ac = audio();
    if (ac) SOUNDS[name](ac);
    navigator.vibrate?.(HAPTICS[name]);
  } catch {
    // Feedback is decoration; a blocked audio context must never break a tap.
  }
}

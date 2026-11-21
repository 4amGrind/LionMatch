// Easing and small animation helpers. Everything is a pure function of the frame,
// so every render is identical.

import { Easing, interpolate } from "remotion";

/** Fast start, long soft landing. The film's default for things arriving. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** Gentle both ends, for camera moves. */
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** Smooth camera moves with a slightly longer settle. */
export const camera = Easing.bezier(0.45, 0, 0.15, 1);
/** Things leaving: slow start, then away. */
export const easeIn = Easing.bezier(0.55, 0, 0.85, 0.35);
/** A little anticipation and overshoot, used sparingly. */
export const backOut = Easing.bezier(0.34, 1.32, 0.64, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 to 1 over [start, start + duration], eased. */
export function progress(frame: number, start: number, duration: number, easing: (t: number) => number = easeOut) {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing });
}

/** Clamped interpolate with an easing. */
export function lerpRange(
  frame: number,
  input: [number, number],
  output: [number, number],
  easing: (t: number) => number = easeOut,
) {
  return interpolate(frame, input, output, { ...clamp, easing });
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Fade in over `inDur` from `start`, and out over `outDur` ending at `end`. */
export function window(frame: number, start: number, end: number, inDur = 18, outDur = 18) {
  return Math.min(progress(frame, start, inDur, easeOut), 1 - progress(frame, end - outDur, outDur, easeIn));
}

/** Deterministic pseudo random numbers from a seed. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deck motion helpers that reproduce the app's Motion springs, frame by frame.

import type { CardState } from "../components/AppDeckScreen";
import type { DeckItem } from "./appData";
import { FLY, SETTLE, springAt, springProgress } from "./spring";
import { clamp01, easeInOut, easeOut, progress } from "./ease";

/** Cards mounting into the stack: they start at depth 3 (hidden) and spring to their place. */
export function enterStack(items: DeckItem[], start: number, frame: number, count = 3): CardState[] {
  const p = springProgress(frame, start, SETTLE);
  return items.slice(0, count + 1).map((item, i) => ({ item, depth: 3 + (i - 3) * p }));
}

/** Cards removed by the filter: fade and shrink a little, over 0.2s (the app's "fade" exit). */
export function fadeOutStack(items: DeckItem[], start: number, frame: number, count = 3): CardState[] {
  const t = progress(frame, start, 12, easeOut);
  if (t >= 1) return [];
  return items.slice(0, count).map((item, i) => ({ item, depth: i, opacity: 1 - t, scale: 1 - 0.06 * t, z: 200 + (3 - i) }));
}

/** The rest of the stack moving up one place after the top card leaves at `release`. */
export function settleAfter(items: DeckItem[], release: number, frame: number, shifted: number): CardState[] {
  const p = frame < release ? 0 : springProgress(frame, release, SETTLE);
  return items.slice(0, 4).map((item, i) => ({ item, depth: i + 1 - p * shifted }));
}

export type Gesture = "like" | "pass" | "save";

/** Where the finger takes the card before letting go, and where the card flies after. */
const DRAG_TO: Record<Gesture, { x: number; y: number }> = {
  like: { x: 150, y: 18 },
  pass: { x: -150, y: 14 },
  save: { x: 10, y: -165 },
};
const OFFSCREEN: Record<Gesture, { x: number; y: number }> = {
  like: { x: 620, y: 40 },
  pass: { x: -620, y: 40 },
  save: { x: 0, y: -900 },
};

/** The app's stamp rule: fades in from 24px to the swipe line (110px), only in the winning direction. */
export function stampOpacity(x: number, y: number, direction: Gesture) {
  const upward = -y > Math.abs(x);
  const distance = direction === "save" ? (upward ? -y : 0) : upward ? 0 : direction === "like" ? x : -x;
  return clamp01((distance - 24) / (110 - 24));
}

/**
 * A finger drags the top card from `start` for `drag` frames, then lets go.
 * Returns the card's pose and the finger's position (relative to the card's resting centre).
 */
export function swipeGesture(gesture: Gesture, start: number, drag: number, frame: number) {
  const to = DRAG_TO[gesture];
  const release = start + drag;
  let x = 0;
  let y = 0;
  let opacity = 1;
  let lift = 0;
  if (frame >= start && frame < release) {
    // A hand-like drag: slow pickup, faster through the middle, still moving at release.
    const t = (frame - start) / drag;
    const e = easeInOut(Math.min(1, t * 0.92 + 0.04)) * 0.85 + t * 0.15;
    x = to.x * e;
    y = to.y * e;
    lift = clamp01((frame - start) / 8);
  } else if (frame >= release) {
    // The throw: Motion's exit spring, starting from the drag's end with its speed.
    const ts = (frame - release) / 60;
    const vx = (to.x / drag) * 60 * 1.9;
    const vy = (to.y / drag) * 60 * 1.9;
    x = springAt(ts, to.x, OFFSCREEN[gesture].x, vx, FLY);
    y = springAt(ts, to.y, OFFSCREEN[gesture].y, vy, FLY);
    opacity = 1 - progress(frame, release + 10, 13, easeOut);
    lift = 1;
  }
  const rotate = (Math.max(-320, Math.min(320, x)) / 320) * 14;
  const scale = 1 + 0.025 * lift;
  const stamps = {
    like: stampOpacity(x, y, "like"),
    pass: stampOpacity(x, y, "pass"),
    save: stampOpacity(x, y, "save"),
  };
  const finger = frame >= start - 6 && frame < release + 4 ? { x: x, y: y + 120, on: Math.min(clamp01((frame - start + 6) / 8), 1 - clamp01((frame - release) / 4)) } : null;
  return { x, y, rotate, scale, opacity, stamps, release, finger, gone: frame > release + 26 };
}

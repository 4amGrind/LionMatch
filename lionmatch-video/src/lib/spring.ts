// A damped spring solved in closed form, so a card can leave with the speed it was thrown at.
// Same parameters as Motion's springs in the app (stiffness, damping, mass).

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** The app's deck springs, copied from src/components/SwipeDeck.tsx. */
export const SETTLE: SpringConfig = { stiffness: 300, damping: 33, mass: 0.9 };
export const FLY: SpringConfig = { stiffness: 120, damping: 20 };
export const SNAP_BACK: SpringConfig = { stiffness: 520, damping: 28 };
export const PILL: SpringConfig = { stiffness: 380, damping: 20 };

/**
 * Position at time t (seconds) of a spring going from `from` to `to`, starting with velocity v0 (units per second).
 */
export function springAt(t: number, from: number, to: number, v0: number, cfg: SpringConfig): number {
  if (t <= 0) return from;
  const m = cfg.mass ?? 1;
  const k = cfg.stiffness;
  const c = cfg.damping;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const x0 = from - to;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const a = x0;
    const b = (v0 + zeta * w0 * x0) / wd;
    return to + Math.exp(-zeta * w0 * t) * (a * Math.cos(wd * t) + b * Math.sin(wd * t));
  }
  if (zeta === 1) {
    return to + Math.exp(-w0 * t) * (x0 + (v0 + w0 * x0) * t);
  }
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s);
  const r2 = -w0 * (zeta + s);
  const c2 = (v0 - r1 * x0) / (r2 - r1);
  const c1 = x0 - c2;
  return to + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

/** 0 to 1 spring progress from frame `start`, at 60 fps. */
export function springProgress(frame: number, start: number, cfg: SpringConfig = SETTLE, fps = 60) {
  return springAt((frame - start) / fps, 0, 1, 0, cfg);
}

// Keyframed values with an easing per segment. Used for camera and phone moves.

import { easeInOut, mix, progress } from "./ease";

export type Keys<T extends Record<string, number>> = [frame: number, value: T, easing?: (t: number) => number][];

export function keyed<T extends Record<string, number>>(frame: number, keys: Keys<T>): T {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1, ease] = keys[i + 1];
    if (frame <= f1) {
      const t = progress(frame, f0, f1 - f0, ease ?? easeInOut);
      const out = {} as Record<string, number>;
      for (const k of Object.keys(v1)) out[k] = mix(v0[k] ?? v1[k], v1[k], t);
      return out as T;
    }
  }
  return keys[keys.length - 1][1];
}

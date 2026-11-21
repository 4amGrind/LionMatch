// The app fires canvas-confetti on a strong match (80 pieces, spread 70, start velocity 34,
// gravity 0.9, 180 ticks, from the middle of the phone). This is the same burst, simulated
// deterministically per frame so every render matches.

import { rng } from "../lib/ease";

const COLORS = ["#b9d9eb", "#0c2340", "#17845a", "#ffffff", "#c98a06"];

interface Piece {
  angle: number;
  velocity: number;
  color: string;
  wobble: number;
  wobbleSpeed: number;
  tiltAngle: number;
  circle: boolean;
}

function makePieces(seed: number): Piece[] {
  const r = rng(seed);
  return Array.from({ length: 80 }, () => ({
    // canvas-confetti: angle 90 (up), spread 70.
    angle: ((90 + (r() - 0.5) * 70) * Math.PI) / 180,
    velocity: 34 * 0.5 + r() * 34,
    color: COLORS[Math.floor(r() * COLORS.length)],
    wobble: r() * 10,
    wobbleSpeed: Math.min(0.11, r() * 0.1 + 0.05),
    tiltAngle: (r() * 0.5 + 0.25) * Math.PI,
    circle: r() < 0.5,
  }));
}

const cache = new Map<number, Piece[]>();

export function Confetti({ tick, width, height, seed = 7 }: { tick: number; width: number; height: number; seed?: number }) {
  if (tick < 0 || tick > 180) return null;
  const pieces = cache.get(seed) ?? makePieces(seed);
  cache.set(seed, pieces);
  const ox = width * 0.5;
  const oy = height * 0.5;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 400 }}>
      {pieces.map((p, i) => {
        // Step the canvas-confetti physics `tick` times. Cheap: at most 180 steps of 80 pieces.
        let x = ox;
        let y = oy;
        let v = p.velocity;
        let wobble = p.wobble;
        let tilt = p.tiltAngle;
        for (let k = 0; k < tick; k++) {
          x += Math.cos(p.angle) * v;
          y += -Math.sin(p.angle) * v + 3 * 0.9;
          v *= 0.9;
          wobble += p.wobbleSpeed;
          tilt += 0.1;
        }
        const scalar = 0.9;
        const wx = x + 10 * scalar * Math.cos(wobble);
        const wy = y + 10 * scalar * Math.sin(wobble);
        const progress = tick / 180;
        const opacity = 1 - progress;
        const size = 10 * scalar;
        const squash = Math.abs(Math.cos(tilt));
        return p.circle ? (
          <ellipse key={i} cx={wx} cy={wy} rx={size * 0.5} ry={size * 0.5 * Math.max(0.15, squash)} fill={p.color} opacity={opacity} transform={`rotate(${(tilt * 180) / Math.PI} ${wx} ${wy})`} />
        ) : (
          <rect key={i} x={wx - size / 2} y={wy - (size * squash) / 2} width={size} height={Math.max(1, size * squash)} fill={p.color} opacity={opacity} transform={`rotate(${(tilt * 57.3) % 360} ${wx} ${wy})`} />
        );
      })}
    </svg>
  );
}

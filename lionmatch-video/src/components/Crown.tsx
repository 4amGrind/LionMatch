// The app's crown logo (public/brand/crown.png in the app), traced to a vector so it stays sharp at 4K.

import type { CSSProperties } from "react";
import { CROWN_PATH } from "../brand/crownPath";

/** `size` is the square box the app's 300 x 300 crown image fills. `draw` 0..1 strokes the outline in; `fill` 0..1 floods the shape. */
let uid = 0;

export function Crown({ size, color, draw = 1, fill = 1, strokeWidth = 2.2, style, glow = 0, sheen = -1 }: { size: number; color: string; draw?: number; fill?: number; strokeWidth?: number; style?: CSSProperties; glow?: number; sheen?: number }) {
  const id = `crown-${(uid = (uid + 1) % 100000)}`;
  const L = 2400; // generous path length for the dash trick
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} style={{ overflow: "visible", display: "block", ...style }}>
      {glow > 0 ? (
        <path d={CROWN_PATH} fill={color} opacity={glow * 0.55} style={{ filter: `blur(${10 + glow * 8}px)` }} fillRule="evenodd" />
      ) : null}
      <path d={CROWN_PATH} fill={color} fillOpacity={fill} fillRule="evenodd" />
      {sheen > -0.5 && sheen < 1.5 ? (
        <>
          <defs>
            <clipPath id={`${id}-clip`}>
              <path d={CROWN_PATH} fillRule="evenodd" />
            </clipPath>
            <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0.35">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath={`url(#${id}-clip)`}>
            <rect x={-120 + sheen * 420} y={0} width={110} height={300} fill={`url(#${id}-sheen)`} transform="skewX(-18)" />
          </g>
        </>
      ) : null}
      {draw < 1 || fill < 1 ? (
        <path
          d={CROWN_PATH}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={L}
          strokeDashoffset={L * (1 - draw)}
          opacity={1 - fill}
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

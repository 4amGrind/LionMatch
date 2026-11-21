// A phone body for the app's screens: dark bezel, a thin titanium rim, a back plate that gives
// the body thickness when it turns, and a glass reflection that moves with the angle.

import type { CSSProperties, ReactNode } from "react";
import { SCREEN_H, SCREEN_W } from "./AppDeckScreen";

const BEZEL = 12;
const RADIUS = 56;

export interface PhonePose {
  x: number;
  y: number;
  scale: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  opacity?: number;
  blur?: number;
  brightness?: number;
}

export function Phone({ pose, children, style, glare = 1, shadow = 1 }: { pose: PhonePose; children: ReactNode; style?: CSSProperties; glare?: number; shadow?: number }) {
  const W = SCREEN_W + BEZEL * 2;
  const H = SCREEN_H + BEZEL * 2;
  const rx = pose.rotateX ?? 0;
  const ry = pose.rotateY ?? 0;
  const rz = pose.rotateZ ?? 0;
  // The reflection slides across the glass as the phone turns.
  const sheen = 30 + ry * 1.6 - rx * 0.8;
  const filters = [pose.blur ? `blur(${pose.blur}px)` : "", pose.brightness !== undefined && pose.brightness !== 1 ? `brightness(${pose.brightness})` : ""].filter(Boolean).join(" ");
  return (
    <div
      style={{
        position: "absolute",
        left: pose.x - W / 2,
        top: pose.y - H / 2,
        width: W,
        height: H,
        transform: `perspective(2800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${pose.scale})`,
        transformStyle: "preserve-3d",
        opacity: pose.opacity ?? 1,
        filter: filters || undefined,
        ...style,
      }}
    >
      {/* Shadow and ambient blue bounce, behind everything. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          transform: "translateZ(-24px)",
          boxShadow: `0 ${50 + rx}px 110px -20px rgb(0 0 0 / ${0.75 * shadow}), 0 0 140px -10px rgb(60 130 210 / ${0.28 * shadow})`,
        }}
      />
      {/* Back plate: shows as the side of the phone when it is turned. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          transform: "translateZ(-11px)",
          background: "linear-gradient(90deg, #1b2a3f, #0b1626 30%, #0b1626 70%, #1b2a3f)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          transform: "translateZ(-5px)",
          background: "linear-gradient(160deg, #3a4d66, #101c2d 40%, #0b1626 60%, #31445c)",
        }}
      />
      {/* Front: titanium rim and black bezel. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          background: "#04090f",
          boxShadow: "inset 0 0 0 1.5px #4b5f78, inset 0 0 0 3px #0d1726, inset 0 1px 0 4px rgb(255 255 255 / 0.05)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: BEZEL,
          top: BEZEL,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: RADIUS - BEZEL,
          overflow: "hidden",
          background: "#b9cde6",
          transform: "translateZ(0.1px)",
        }}
      >
        {children}
        {/* Glass reflection. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: glare,
            background: `linear-gradient(115deg, transparent ${sheen - 22}%, rgb(255 255 255 / 0.10) ${sheen}%, rgb(255 255 255 / 0.02) ${sheen + 12}%, transparent ${sheen + 26}%)`,
            mixBlendMode: "screen",
          }}
        />
        <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS - BEZEL, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.35)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

/** Screen coordinates (0..402, 0..874) to film coordinates, for a phone that is not rotated. */
export function screenToFilm(pose: PhonePose, sx: number, sy: number) {
  return {
    x: pose.x + (sx - SCREEN_W / 2) * pose.scale,
    y: pose.y + (sy - SCREEN_H / 2) * pose.scale,
  };
}

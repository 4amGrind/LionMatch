// The film's backdrop: deep navy with slow pools of Columbia-blue light, a faint vignette,
// and a fine grain on top so gradients never band.

import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { rng } from "../lib/ease";
import { C } from "../theme";

export interface Light {
  x: number; // percent
  y: number; // percent
  r: number; // px radius
  color: string;
  alpha: number;
}

export function Backdrop({ lights, base = C.night }: { lights: Light[]; base?: string }) {
  const bg = lights
    .map((l) => `radial-gradient(${l.r}px ${l.r * 0.72}px at ${l.x}% ${l.y}%, ${rgba(l.color, l.alpha)} 0%, ${rgba(l.color, l.alpha * 0.45)} 35%, transparent 100%)`)
    .join(", ");
  return <AbsoluteFill style={{ background: `${bg ? bg + ", " : ""}${base}` }} />;
}

export function Vignette({ strength = 0.7 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(ellipse 75% 70% at 50% 48%, transparent 55%, rgb(1 4 10 / ${strength}) 100%)`,
      }}
    />
  );
}

export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  // A new offset every other frame, like real grain, but fixed for a given frame.
  const r = rng(Math.floor(frame / 2) * 9973 + 11);
  const ox = Math.floor(r() * 512);
  const oy = Math.floor(r() * 512);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", mixBlendMode: "overlay", opacity }}>
      <div
        style={{
          position: "absolute",
          left: -ox,
          top: -oy,
          width: 1920 + 1024,
          height: 1080 + 1024,
          backgroundImage: `url(${staticFile("fx/grain.png")})`,
          backgroundSize: "512px 512px",
        }}
      />
    </AbsoluteFill>
  );
}

/** The app's wave wallpaper, sunk into navy, as a quiet brand texture behind the product. */
export function Waves({ opacity, shift = 0, scale = 1.25 }: { opacity: number; shift?: number; scale?: number }) {
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <Img
        src={staticFile("brand/waves.jpg")}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1920 * scale,
          height: 1080 * scale,
          objectFit: "cover",
          transform: `translate(-50%, calc(-50% + ${shift}px))`,
          filter: "brightness(0.35) saturate(1.1)",
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgb(2 7 17 / 0.7), rgb(2 7 17 / 0.2) 45%, rgb(2 7 17 / 0.85))" }} />
    </AbsoluteFill>
  );
}

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${Math.max(0, Math.min(1, a))})`;
}

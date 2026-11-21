// Real app screenshots inside the phone, including the frame-by-frame scroll captures.

import { Img, staticFile } from "remotion";
import { SCREEN_H, SCREEN_W } from "./AppDeckScreen";

export function Screen({ src, opacity = 1, x = 0, filter }: { src: string; opacity?: number; x?: number; filter?: string }) {
  return <Img src={staticFile(src)} style={{ position: "absolute", left: x, top: 0, width: SCREEN_W, height: SCREEN_H, opacity, filter }} />;
}

/** Frame i of a scroll capture (scripts/capture.mjs captureScroll). */
export function scrollFrame(name: string, i: number, count: number) {
  const n = Math.max(0, Math.min(count - 1, Math.round(i)));
  return `screens/${name}/${String(n).padStart(3, "0")}.jpg`;
}

export function Tap({ x, y, t }: { x: number; y: number; t: number }) {
  if (t < 0 || t > 1) return null;
  const r = 22 + 30 * t;
  return (
    <>
      <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: 99, background: "rgb(255 255 255 / 0.32)", opacity: 1 - t, zIndex: 50 }} />
      <div style={{ position: "absolute", left: x - 20, top: y - 20, width: 40, height: 40, borderRadius: 99, background: "radial-gradient(circle, rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.2))", boxShadow: "0 0 0 1.5px rgb(255 255 255 / 0.75)", opacity: Math.min(1, (1 - t) * 2), transform: `scale(${1 - 0.15 * Math.sin(Math.PI * Math.min(1, t * 2))})`, zIndex: 51 }} />
    </>
  );
}

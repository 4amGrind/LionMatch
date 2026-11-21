// Kinetic type. Words rise out of a mask, sharpen from a soft blur, and leave upward.

import { createContext, useContext, type CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { easeIn, easeOut, progress } from "../lib/ease";
import { C, FONT } from "../theme";

/** Scenes set this to their Sequence's start, so every timing in the film is written in global frames. */
export const FrameOffset = createContext(0);
export function useGlobalFrame() {
  return useCurrentFrame() + useContext(FrameOffset);
}

export interface WordsProps {
  text: string;
  /** Frame the first word starts rising. */
  at: number;
  /** Frame the words start leaving. Omit to stay. */
  out?: number;
  stagger?: number;
  duration?: number;
  size?: number;
  weight?: number;
  color?: string;
  style?: CSSProperties;
  tracking?: string;
  align?: "left" | "center" | "right";
  /** Per-word colors, by index. */
  colors?: Record<number, string>;
  lineHeight?: number;
}

export function Words({
  text,
  at,
  out,
  stagger = 4,
  duration = 34,
  size = 84,
  weight = 600,
  color = C.ice,
  style,
  tracking = "-0.035em",
  align = "center",
  colors,
  lineHeight = 1.08,
}: WordsProps) {
  const frame = useGlobalFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        lineHeight,
        color,
        textAlign: align,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = progress(frame, at + i * stagger, duration, easeOut);
        const o = out === undefined ? 0 : progress(frame, out + i * (stagger * 0.6), 22, easeIn);
        const y = (1 - p) * 105 - o * 60;
        const blur = (1 - p) * 10 + o * 8;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", padding: "0.06em 0.02em 0.14em", margin: "-0.06em 0 -0.14em", verticalAlign: "top" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${y}%)`,
                opacity: Math.min(1, p * 1.4) * (1 - o),
                filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
                color: colors?.[i] ?? color,
              }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** A soft fade-and-rise for small captions. */
export function Caption({ children, at, out, style }: { children: React.ReactNode; at: number; out?: number; style?: CSSProperties }) {
  const frame = useGlobalFrame();
  const p = progress(frame, at, 30, easeOut);
  const o = out === undefined ? 0 : progress(frame, out, 20, easeIn);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 500,
        color: C.darkMuted,
        letterSpacing: "-0.01em",
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 14 - o * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

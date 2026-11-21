// The app's Swipe tab, drawn live so the film can move the cards.
// The frame around the cards (wallpaper, header, hints, buttons, nav) is a real screenshot of the app
// with the cards hidden (scripts/capture.mjs, light-deck-chrome.png). The counter, filter chips and
// cards are drawn on top in exactly the places the app puts them (public/screens/deck-layout.json).

import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { type DeckItem } from "../lib/appData";
import { C, FONT } from "../theme";
import { DeckCard, Stamps, display } from "./DeckCard";

export const SCREEN_W = 402;
export const SCREEN_H = 874;
/** Deck area from the app: left 16, top 154, 370 wide; cards fill it minus 36px at the bottom. */
export const DECK = { x: 16, y: 154, w: 370, h: 494 };
const STEP_Y = 12;
const STEP_SCALE = 0.045;

export interface CardState {
  item: DeckItem;
  /** 0 is the top card. Fractional while a card rises into place. */
  depth: number;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  stamps?: { like: number; pass: number; save: number };
  z?: number;
  hidden?: boolean;
}

/** Where a card at `depth` sits in the stack, as in the app's stackPose(). */
export function stackPose(depth: number) {
  return { y: depth * STEP_Y, scale: 1 - depth * STEP_SCALE, opacity: Math.max(0, Math.min(1, 3 - depth)) };
}

export function DeckCardAt({ state }: { state: CardState }) {
  const pose = stackPose(state.depth);
  const style: CSSProperties = {
    position: "absolute",
    left: DECK.x,
    top: DECK.y,
    width: DECK.w,
    height: DECK.h,
    transformOrigin: "50% 100%",
    transform: `translate(${state.x ?? 0}px, ${pose.y + (state.y ?? 0)}px) rotate(${state.rotate ?? 0}deg) scale(${pose.scale * (state.scale ?? 1)})`,
    opacity: pose.opacity * (state.opacity ?? 1),
    zIndex: state.z ?? Math.round(100 - state.depth * 10),
    visibility: state.hidden ? "hidden" : "visible",
  };
  return (
    <div style={style}>
      <DeckCard item={state.item} depth={state.depth} overlay={state.stamps ? <Stamps {...state.stamps} /> : null} />
    </div>
  );
}

const DOT: Record<string, string> = {
  internship: C.catInternship,
  club: C.catClub,
  research: C.catResearch,
  fellowship: C.catFellowship,
  people: C.catPerson,
};

export const CHIP_IDS = ["all", "internship", "club", "research", "fellowship", "people"] as const;
export type ChipId = (typeof CHIP_IDS)[number];
const CHIP_LABEL: Record<ChipId, string> = {
  all: "All",
  internship: "Internship",
  club: "Club",
  research: "Research",
  fellowship: "Fellowship",
  people: "People",
};

/** The app's `glass` utility for small controls, without the backdrop blur (the wallpaper behind is static). */
export const GLASS_SMALL: CSSProperties = {
  background: "linear-gradient(135deg, rgb(255 255 255 / 0.55) 0%, transparent 34%, transparent 72%, rgb(255 255 255 / 0.4) 100%), rgb(226 240 250 / 0.62)",
  boxShadow: [
    "inset 0 1px 0.5px rgb(255 255 255 / 0.9)",
    "inset 0 -1px 0.5px rgb(255 255 255 / 0.45)",
    "inset 0 0 0 0.5px rgb(255 255 255 / 0.4)",
    "inset 0 10px 16px -10px rgb(255 255 255 / 0.55)",
    "inset 0 -12px 18px -12px rgb(12 35 64 / 0.16)",
    "0 2px 4px rgb(12 35 64 / 0.08)",
    "0 16px 36px -14px rgb(12 35 64 / 0.5)",
  ].join(", "),
};

export function Chips({ active, counts, scrollX = 0, activeMix }: { active: ChipId; counts: Record<ChipId, number>; scrollX?: number; activeMix?: Partial<Record<ChipId, number>> }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 116, width: SCREEN_W, height: 30, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 6, paddingLeft: 16, transform: `translateX(${-scrollX}px)` }}>
        {CHIP_IDS.map((id) => {
          const on = activeMix?.[id] ?? (id === active ? 1 : 0);
          return (
            <div
              key={id}
              style={{
                position: "relative",
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                lineHeight: "16px",
                fontWeight: 600,
                fontFamily: FONT,
                color: on > 0.5 ? "#ffffff" : C.navy,
                ...GLASS_SMALL,
              }}
            >
              <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.navy, opacity: on }} />
              {id !== "all" ? <span style={{ position: "relative", width: 8, height: 8, borderRadius: 999, background: DOT[id] }} /> : null}
              <span style={{ position: "relative" }}>{CHIP_LABEL[id]}</span>
              <span style={{ position: "relative", fontVariantNumeric: "tabular-nums", opacity: 0.7 }}>{counts[id]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ToGo({ count, undo = 0, filtered = false }: { count: number; undo?: number; filtered?: boolean }) {
  return (
    <div style={{ position: "absolute", left: 16, right: 16, top: 76, height: 32, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: FONT }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", color: C.muted }}>
        <span style={{ fontWeight: 600, color: C.navy, fontVariantNumeric: "tabular-nums" }}>{count}</span> to go{filtered ? " · filtered" : ""}
      </p>
      <div
        style={{
          ...GLASS_SMALL,
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderRadius: 999,
          padding: "6px 12px",
          fontSize: 14,
          lineHeight: "20px",
          fontWeight: 600,
          color: C.navy,
          opacity: undo,
          transform: `scale(${0.9 + 0.1 * undo})`,
        }}
      >
        <svg viewBox="0 0 20 20" style={{ width: 16, height: 16 }}>
          <path d="M7 4L3.5 7.5 7 11M4 7.5h7.5a4.5 4.5 0 010 9H9" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Undo
      </div>
    </div>
  );
}

/** The "Strong match" pill the app shows when you mark a card Interested at 8 or above. */
export function StrongMatch({ score, t, out }: { score: number; t: number; out: number }) {
  // t: 0 to 1 spring in (from scale .7, rotate -8). out: 0 to 1 leaving (fade, rise 12px).
  const scale = 0.7 + 0.3 * t;
  const rotate = -8 + 4 * t;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: DECK.y + 530 * 0.38,
        display: "flex",
        justifyContent: "center",
        zIndex: 300,
        opacity: Math.min(1, t * 1.5) * (1 - out),
        transform: `translateY(${-12 * out}px) scale(${scale - 0.05 * out}) rotate(${rotate}deg)`,
      }}
    >
      <div style={{ ...GLASS_SMALL, background: "rgb(255 255 255 / 0.78)", borderRadius: 22, padding: "12px 20px", color: C.navy, fontFamily: FONT }}>
        <span style={{ ...display, fontSize: 26 }}>Strong match</span>
        <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{score}/10</span>
      </div>
    </div>
  );
}

export function AppDeckScreen({ children, chrome = "screens/light-deck-chrome.png" }: { children?: ReactNode; chrome?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H, overflow: "hidden", fontFamily: FONT }}>
      <Img src={staticFile(chrome)} style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H }} />
      {children}
    </div>
  );
}

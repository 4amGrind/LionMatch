// A faithful copy of the app's deck card (src/components/DeckCard.tsx and ui.tsx in the app),
// written with inline styles so the film can animate it. Same layout, sizes, colors and wording.

import type { CSSProperties, ReactNode } from "react";
import type { DeckItem } from "../lib/appData";
import { C, FONT } from "../theme";

const CATEGORY_LABELS: Record<string, string> = {
  internship: "Internship",
  club: "Club",
  research: "Research",
  fellowship: "Fellowship",
};
const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  club_lead: "Club lead",
  researcher: "Researcher",
  alum: "Alum",
  recruiter: "Recruiter",
};
const TAB_BG: Record<string, string> = {
  internship: C.catInternship,
  club: C.catClub,
  research: C.catResearch,
  fellowship: C.catFellowship,
};

export const display: CSSProperties = { fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.04 };

const DEPTH_TEXT = [1, 0.4, 0.15, 0];
const DEPTH_TAB = [1, 0.7, 0.35, 0];
const BACK_CARD_FADE = "linear-gradient(to bottom, black calc(100% - 96px), transparent calc(100% - 36px))";

/** "Due Jan 15, 2027 (est.)". Same format as the app's deadlineLabel. */
function dueLabel(deadline: string | null, estimated: boolean) {
  if (!deadline) return null;
  const d = new Date(`${deadline}T12:00:00Z`);
  const label = `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  return estimated ? `${label} (est.)` : label;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const clamp = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export function Check({ color = C.like, size = 14 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" style={{ width: size, height: size, marginTop: 3, flexShrink: 0, color }}>
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScoreBadge({ score, style }: { score: number | string; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 2, color: C.navy, ...style }}>
      <span style={{ ...display, fontSize: 28, fontVariantNumeric: "tabular-nums" }}>{score}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>/10</span>
    </span>
  );
}

/** "Why it fits you" with the score and every reason. `scoreSlot` lets a scene replace the number. */
export function MatchPanel({ score, reasons, scoreSlot, reasonOpacity }: { score: number; reasons: string[]; scoreSlot?: ReactNode; reasonOpacity?: (i: number) => number }) {
  return (
    <div style={{ borderTop: "1px solid rgb(12 35 64 / 0.1)", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600, color: C.navy }}>Why it fits you</span>
        {scoreSlot ?? <ScoreBadge score={score} />}
      </div>
      <ul style={{ margin: 0, marginTop: 6, padding: 0, listStyle: "none", fontSize: 14, lineHeight: "20px", color: C.ink }}>
        {reasons.map((reason, i) => (
          <li key={reason} style={{ display: "flex", gap: 8, marginTop: i === 0 ? 0 : 4, opacity: reasonOpacity ? reasonOpacity(i) : 1 }}>
            <Check />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Tag({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        borderRadius: 999,
        border: "1px solid rgb(12 35 64 / 0.15)",
        padding: "2px 10px",
        fontSize: 12,
        lineHeight: "16px",
        fontWeight: 500,
        color: C.ink,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Facts({ items }: { items: (string | null | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  if (shown.length === 0) return null;
  return (
    <p style={{ margin: 0, marginTop: 6, display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 2, fontSize: 12, lineHeight: "16px", color: C.muted }}>
      {shown.map((f) => (
        <span key={f}>{f}</span>
      ))}
    </p>
  );
}

function DetailLink({ children }: { children: string }) {
  return (
    <span
      style={{
        marginTop: "auto",
        alignSelf: "flex-start",
        fontSize: 14,
        lineHeight: "20px",
        fontWeight: 600,
        color: C.navy,
        textDecoration: "underline",
        textDecorationColor: "rgb(12 35 64 / 0.3)",
        textDecorationThickness: 2,
        textUnderlineOffset: 4,
      }}
    >
      {children}
    </span>
  );
}

export const GLASS_CARD: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f5f9fc 55%, #ebf2f8 100%)",
  boxShadow: [
    "inset 0 1.5px 0.5px #ffffff",
    "inset 0 0 0 1px rgb(185 217 235 / 0.75)",
    "inset 0 0 18px rgb(185 217 235 / 0.35)",
    "inset 0 -18px 28px -18px rgb(12 35 64 / 0.07)",
    "0 2px 4px rgb(12 35 64 / 0.08)",
    "0 16px 36px -14px rgb(12 35 64 / 0.5)",
  ].join(", "),
};

function Shell({
  tab,
  tabBg,
  tabColor,
  depth,
  overlay,
  children,
}: {
  tab: string;
  tabBg: string;
  tabColor: string;
  depth: number;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const level = Math.min(Math.max(depth, 0), 3);
  // Depth can be fractional while a card rises, so blend the two levels it sits between.
  const lo = Math.floor(level);
  const hi = Math.min(3, lo + 1);
  const t = level - lo;
  const textOpacity = DEPTH_TEXT[lo] + (DEPTH_TEXT[hi] - DEPTH_TEXT[lo]) * t;
  const tabOpacity = DEPTH_TAB[lo] + (DEPTH_TAB[hi] - DEPTH_TAB[lo]) * t;
  const fade = level > 0.5;
  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", fontFamily: FONT }}>
      <div
        style={{
          alignSelf: "flex-start",
          borderRadius: "16px 16px 0 0",
          padding: "8px 16px 6px",
          fontSize: 12,
          lineHeight: "16px",
          fontWeight: 600,
          background: tabBg,
          color: tabColor,
          opacity: tabOpacity,
        }}
      >
        {tab}
      </div>
      <div style={{ ...GLASS_CARD, position: "relative", minHeight: 0, flex: 1, overflow: "hidden", borderRadius: 26, borderTopLeftRadius: 0 }}>
        <div
          style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
            gap: 12,
            padding: 20,
            boxSizing: "border-box",
            opacity: textOpacity,
            maskImage: fade ? BACK_CARD_FADE : undefined,
            WebkitMaskImage: fade ? BACK_CARD_FADE : undefined,
          }}
        >
          {children}
        </div>
        {overlay}
      </div>
    </div>
  );
}

export interface CardSlots {
  scoreSlot?: ReactNode;
  reasonOpacity?: (i: number) => number;
  /** Opacity of everything but the score, for the moment the score lifts off. */
  restOpacity?: number;
}

export function DeckCard({ item, depth = 0, overlay, slots = {} }: { item: DeckItem; depth?: number; overlay?: ReactNode; slots?: CardSlots }) {
  const rest = slots.restOpacity ?? 1;
  const panel = (
    <MatchPanel score={item.match.score} reasons={item.match.reasons} scoreSlot={slots.scoreSlot} reasonOpacity={slots.reasonOpacity} />
  );
  if (item.kind === "person") {
    const p = item.person;
    return (
      <Shell tab="Person to meet" tabBg={C.catPerson} tabColor={C.navy} depth={depth} overlay={overlay}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: rest }}>
          <div
            style={{
              ...display,
              display: "flex",
              width: 64,
              height: 64,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: C.columbia,
              color: C.navy,
              fontSize: 24,
            }}
          >
            {initials(p.full_name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...display, ...clamp(2), margin: 0, fontSize: 30, color: C.navy }}>{p.full_name}</h2>
            <p style={{ margin: 0, marginTop: 4, fontSize: 14, lineHeight: "20px", fontWeight: 500, color: C.ink }}>{p.headline}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, opacity: rest }}>
          {p.is_sample ? (
            <span style={{ borderRadius: 999, border: "1px solid rgb(12 35 64 / 0.2)", padding: "2px 8px", fontSize: 12, lineHeight: "16px", fontWeight: 500, color: C.muted }}>
              Sample profile
            </span>
          ) : null}
          {p.open_to_chat ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "rgb(23 132 90 / 0.1)", padding: "2px 8px", fontSize: 12, lineHeight: "16px", fontWeight: 600, color: C.like }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.like }} />
              Open to coffee chats
            </span>
          ) : null}
        </div>
        <div style={{ opacity: rest }}>
          <Facts items={[ROLE_LABELS[p.role], p.school, p.class_year ? `Class of ${p.class_year}` : null]} />
        </div>
        {p.bio ? <p style={{ ...clamp(2), margin: 0, fontSize: 15, lineHeight: 1.625, color: C.ink, opacity: rest }}>{p.bio}</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: rest }}>
          {[...new Set([...p.skills, ...p.interests])].slice(0, 4).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        {panel}
        <div style={{ opacity: rest, marginTop: "auto", display: "flex" }}>
          <DetailLink>See profile</DetailLink>
        </div>
      </Shell>
    );
  }
  const o = item.opportunity;
  return (
    <Shell tab={CATEGORY_LABELS[o.category]} tabBg={TAB_BG[o.category]} tabColor="#fff" depth={depth} overlay={overlay}>
      <div style={{ opacity: rest }}>
        <h2 style={{ ...display, ...clamp(3), margin: 0, fontSize: 30, color: C.navy }}>{o.title}</h2>
        <p style={{ margin: 0, marginTop: 8, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: C.ink }}>{o.organization}</p>
        <Facts items={[dueLabel(o.deadline, o.deadline_estimated), o.location, o.commitment]} />
      </div>
      <p style={{ ...clamp(3), margin: 0, fontSize: 15, lineHeight: 1.625, color: C.ink, opacity: rest }}>{o.description}</p>
      {panel}
      <div style={{ opacity: rest, marginTop: "auto", display: "flex" }}>
        <DetailLink>See full details</DetailLink>
      </div>
    </Shell>
  );
}

/** The drag stamps, same as the app's Stamp in SwipeDeck.tsx. */
export function Stamps({ like, pass, save }: { like: number; pass: number; save: number }) {
  const base: CSSProperties = {
    ...display,
    position: "absolute",
    borderRadius: 12,
    borderWidth: 3,
    borderStyle: "solid",
    background: "rgb(255 255 255 / 0.9)",
    padding: "4px 12px",
    fontSize: 30,
    fontFamily: FONT,
  };
  return (
    <>
      <span style={{ ...base, left: 16, top: 24, transform: "rotate(-10deg)", borderColor: C.like, color: C.like, opacity: like }}>Interested</span>
      <span style={{ ...base, right: 16, top: 24, transform: "rotate(10deg)", borderColor: C.pass, color: C.pass, opacity: pass }}>Pass</span>
      <span style={{ ...base, bottom: 80, left: "50%", transform: "translateX(-50%)", borderColor: C.save, color: C.save, opacity: save }}>Save</span>
    </>
  );
}

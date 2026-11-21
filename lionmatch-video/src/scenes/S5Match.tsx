// 0:37.2 to 0:50.4. The score lifts off Hana Kim's card and the film shows how the app's match.ts
// arrived at it: everyone starts at 3, shared skills, shared interests and the same major add up to 10.
// Then the swipes from scene 4 feed the real recommender, and the cards further back re-rank.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DeckCard, GLASS_CARD, display } from "../components/DeckCard";
import { FrameOffset, Words } from "../components/Type";
import { demoUser, person, simulateDeck, deckKey, type DeckItem } from "../lib/appData";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { springProgress } from "../lib/spring";
import { C, CATEGORY_COLOR, FONT } from "../theme";
import { BREAKOUT, HANA_CARD } from "./S4Swipe";

export const S5_FROM = 2232;
export const S5_TO = 3048;

const hana = person("sample-hana-kim").person;

// --- Layout of the two profiles. Chips are laid out by hand so the connecting lines meet them exactly.
const CHIP_H = 42;
const ROW = 51;
const chipW = (t: string) => Math.round(t.length * 11 + 40);

interface Chip {
  text: string;
  x: number;
  y: number;
  w: number;
  side: "you" | "them";
}
function column(side: "you" | "them", x: number, top: number, groups: [string, string[]][]) {
  const chips: Chip[] = [];
  const labels: { text: string; x: number; y: number }[] = [];
  let y = top;
  for (const [label, items] of groups) {
    labels.push({ text: label, x, y });
    y += 32;
    for (const t of items) {
      const w = chipW(t);
      chips.push({ text: t, x: side === "you" ? x + 430 - w : x, y, w, side });
      y += ROW;
    }
    y += 8;
  }
  return { chips, labels, bottom: y };
}
// The demo profile, shortened to fit: the shared items plus a few others for context.
const YOU = column("you", 370, 408, [
  ["Skills", demoUser.skills.filter((s) => s !== "Data Structures")],
  ["Interests", demoUser.interests.filter((s) => s !== "hackathons")],
  ["Major", [demoUser.major ?? ""]],
]);
const THEM = column("them", 1120, 440, [
  ["Skills", hana.skills],
  ["Interests", hana.interests],
  ["Major", [hana.major ?? ""]],
]);

const find = (col: typeof YOU, text: string, from: number) => col.chips.filter((c) => c.text.toLowerCase() === text.toLowerCase())[from === 0 ? 0 : Math.min(from, 1)];

/** The same rules as matchPerson() in the app's match.ts, one link at a time. */
const LINKS = [
  { a: find(YOU, "Python", 0), b: find(THEM, "Python", 0), at: 2336, group: 0 },
  { a: YOU.chips.find((c) => c.text === "Machine Learning")!, b: THEM.chips.find((c) => c.text === "Machine Learning")!, at: 2354, group: 0 },
  { a: YOU.chips.find((c) => c.text === "machine learning")!, b: THEM.chips.find((c) => c.text === "machine learning")!, at: 2408, group: 1 },
  { a: YOU.chips.find((c) => c.text === "ai")!, b: THEM.chips.find((c) => c.text === "ai")!, at: 2426, group: 1 },
  { a: YOU.chips.find((c) => c.text === "Computer Science")!, b: THEM.chips.find((c) => c.text === "Computer Science")!, at: 2480, group: 2 },
];
const LINK_DUR = 40;
const TERMS = [
  { value: "3", label: "Everyone starts at 3", at: 2304 },
  { value: "+3", label: "Shared skills", at: LINKS[1].at + LINK_DUR },
  { value: "+3", label: "Shared interests", at: LINKS[3].at + LINK_DUR },
  { value: "+1", label: "Same major", at: LINKS[4].at + LINK_DUR },
];
const SUM_AT = 2538;
const PERSONAL_AT = 2556;
const GRAPH_OUT = 2640;

function linkPath(a: Chip, b: Chip) {
  const x1 = a.x + a.w + 10;
  const y1 = a.y + CHIP_H / 2;
  const x2 = b.x - 10;
  const y2 = b.y + CHIP_H / 2;
  const dx = (x2 - x1) * 0.5;
  return { d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, x1, y1, x2, y2, dx };
}
function bezierAt(p: ReturnType<typeof linkPath>, t: number) {
  const mt = 1 - t;
  const x = mt ** 3 * p.x1 + 3 * mt * mt * t * (p.x1 + p.dx) + 3 * mt * t * t * (p.x2 - p.dx) + t ** 3 * p.x2;
  const y = mt ** 3 * p.y1 + 3 * mt * mt * t * p.y1 + 3 * mt * t * t * p.y2 + t ** 3 * p.y2;
  return { x, y };
}

function ProfileHeader({ x, y, name, line, align }: { x: number; y: number; name: string; line: string; align: "left" | "right" }) {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 430, display: "flex", flexDirection: align === "right" ? "row-reverse" : "row", alignItems: "center", gap: 16, fontFamily: FONT, textAlign: align }}>
      <div style={{ ...display, width: 58, height: 58, borderRadius: 99, background: C.columbia, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{initials}</div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", color: C.ice }}>{name}</div>
        <div style={{ fontSize: 18, color: C.darkMuted, marginTop: 2 }}>{line}</div>
      </div>
    </div>
  );
}

// --- The queue that re-ranks.
const SIM = simulateDeck(3);
const SLOTS = 7;
const FIRST = 4; // after the three cards on screen and the one about to show
const beforeKeys = SIM.before.slice(FIRST, FIRST + SLOTS).map(deckKey);
const afterItems = SIM.remaining.slice(FIRST, FIRST + SLOTS);
const QUEUE = afterItems.map((item, to) => {
  const from = beforeKeys.indexOf(deckKey(item));
  return { item, from: from === -1 ? SLOTS + 1 : from, to };
});
const QUEUE_IN = 2770;
const REORDER_AT = 2880;
const SLOT_W = 236;
const ROW_X = 960 - (SLOTS * SLOT_W) / 2 + 6;

function MiniCard({ item, reasonOn, glow }: { item: DeckItem; reasonOn: number; glow: number }) {
  const isPerson = item.kind === "person";
  const title = isPerson ? item.person.full_name : item.opportunity.title;
  const sub = isPerson ? item.person.headline : item.opportunity.organization;
  const cat = isPerson ? "person" : item.opportunity.category;
  const label = isPerson ? "Person to meet" : { internship: "Internship", club: "Club", research: "Research", fellowship: "Fellowship" }[item.opportunity.category];
  const personal = item.match.reasons[0]?.startsWith("Because you liked");
  return (
    <div style={{ width: 222, fontFamily: FONT }}>
      <div style={{ display: "inline-block", borderRadius: "10px 10px 0 0", padding: "5px 10px 4px", fontSize: 11, fontWeight: 600, background: CATEGORY_COLOR[cat], color: isPerson ? C.navy : "#fff" }}>{label}</div>
      <div
        style={{
          ...GLASS_CARD,
          borderRadius: 16,
          borderTopLeftRadius: 0,
          height: 196,
          boxSizing: "border-box",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          boxShadow: `${GLASS_CARD.boxShadow}, 0 0 0 ${2 * glow}px rgb(124 192 255 / ${0.9 * glow}), 0 0 ${40 * glow}px rgb(124 192 255 / ${0.45 * glow})`,
        }}
      >
        <div style={{ ...display, fontSize: 17, color: C.navy, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
          <div style={{ fontSize: 11, lineHeight: "14px", color: C.like, fontWeight: 600, opacity: personal ? reasonOn : 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 140 }}>
            {personal ? item.match.reasons[0] : ""}
          </div>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 1, color: C.navy }}>
            <span style={{ ...display, fontSize: 22 }}>{item.match.score}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>/10</span>
          </span>
        </div>
      </div>
    </div>
  );
}

const SWIPE_CHIPS = [
  { word: "Saved", title: "Join Women in Computer Science", color: "#f0b73e" },
  { word: "Interested", title: "Research with the Natural Language Processing Group", color: "#45c58f" },
  { word: "Passed", title: "Research with the Causal Artificial Intelligence Lab", color: "#f36b5f" },
];

export const S5Match = () => {
  const g = useCurrentFrame() + S5_FROM;

  // --- The card lets go of its score.
  const cardOut = progress(g, S5_FROM + 4, 44, easeInOut);
  const scoreFly = progress(g, S5_FROM + 6, 60, camera);
  const scoreX = mix(1492, 960, scoreFly);
  const scoreY = mix(606, 132, scoreFly);
  const scoreSize = mix(28 * BREAKOUT.scale, 150, scoreFly);
  const sumPulse = progress(g, SUM_AT, 10, easeOut) * (1 - progress(g, SUM_AT + 10, 40, easeOut));

  const graphIn = progress(g, 2270, 40, easeOut);
  const graphOut = progress(g, GRAPH_OUT, 40, easeInOut);
  const graphOpacity = graphIn * (1 - graphOut);

  const litAt = (chip: Chip) => {
    const l = LINKS.find((k) => k.a === chip || k.b === chip);
    return l ? progress(g, l.at + LINK_DUR - 6, 12, easeOut) : 0;
  };

  // --- Personal reason: the swipe from scene 4 also points at Hana.
  const personal = progress(g, PERSONAL_AT, 36, easeOut);
  const pBox = { x: 960, y: 1010 };

  const queueIn = progress(g, QUEUE_IN, 40, easeOut) * (1 - progress(g, 2984, 32, easeIn));
  return (
    <FrameOffset.Provider value={S5_FROM}>
      <AbsoluteFill>
        {/* The card from scene 4, letting go. */}
        {cardOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: BREAKOUT.x - 185,
              top: BREAKOUT.y - 247 + Math.sin((g - 1962) / 50) * 4 * (1 - cardOut),
              width: 370,
              height: 494,
              transform: `scale(${BREAKOUT.scale * mix(1, 0.92, cardOut)})`,
              opacity: 1 - cardOut,
              filter: cardOut > 0.05 ? `blur(${cardOut * 10}px) drop-shadow(0 60px 80px rgb(0 0 0 / 0.5))` : "drop-shadow(0 60px 80px rgb(0 0 0 / 0.6))",
            }}
          >
            <DeckCard item={HANA_CARD} slots={{ scoreSlot: <span style={{ display: "inline-block", width: 48, height: 29 }} /> }} />
          </div>
        ) : null}

        {/* The score, big. */}
        <div
          style={{
            position: "absolute",
            left: scoreX,
            top: scoreY,
            transform: `translate(-50%, -50%) scale(${1 + sumPulse * 0.06})`,
            display: "flex",
            alignItems: "baseline",
            gap: scoreSize * 0.06,
            fontFamily: FONT,
            color: mixColor(C.navy, C.ice, progress(g, S5_FROM + 6, 30, easeOut)),
            opacity: 1 - graphOut,
            filter: graphOut > 0.02 ? `blur(${graphOut * 12}px)` : undefined,
          }}
        >
          <span style={{ ...display, fontSize: scoreSize, fontVariantNumeric: "tabular-nums", textShadow: `0 0 ${60 * sumPulse}px rgb(124 192 255 / 0.8)` }}>10</span>
          <span style={{ fontSize: scoreSize * 0.3, fontWeight: 600, color: C.darkMuted }}>/10</span>
        </div>

        {/* How it adds up. */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 218, display: "flex", justifyContent: "center", gap: 34, fontFamily: FONT, opacity: 1 - graphOut }}>
          {TERMS.map((t, i) => {
            const p = progress(g, t.at, 26, easeOut);
            return (
              <div key={i} style={{ textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 16}px)`, minWidth: 120 }}>
                <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.03em", color: i === 0 ? C.darkMuted : C.ice, fontVariantNumeric: "tabular-nums" }}>{t.value}</div>
                <div style={{ fontSize: 18, color: C.darkMuted, marginTop: 2, whiteSpace: "nowrap" }}>{t.label}</div>
              </div>
            );
          })}
        </div>

        {/* The two profiles and the links between them. */}
        <AbsoluteFill style={{ opacity: graphOpacity, filter: graphOut > 0.02 ? `blur(${graphOut * 10}px)` : undefined }}>
          <div style={{ transform: `translateX(${(1 - graphIn) * -40}px)` }}>
            <ProfileHeader x={370} y={318} name="You" line="Demo Student · First-year, CS and AI" align="right" />
          </div>
          <div style={{ transform: `translateX(${(1 - graphIn) * 40}px)` }}>
            <ProfileHeader x={1120} y={350} name={hana.full_name} line={hana.headline} align="left" />
          </div>
          {[...YOU.labels.map((l) => ({ ...l, side: "you" })), ...THEM.labels.map((l) => ({ ...l, side: "them" }))].map((l, i) => (
            <div key={i} style={{ position: "absolute", left: l.x, top: l.y, width: 430, textAlign: l.side === "you" ? "right" : "left", fontFamily: FONT, fontSize: 17, fontWeight: 600, color: C.darkMuted }}>
              {l.text}
            </div>
          ))}
          {[...YOU.chips, ...THEM.chips].map((c, i) => {
            const lit = litAt(c);
            const appear = progress(g, 2276 + (c.side === "you" ? 0 : 8) + (i % 12) * 2, 30, easeOut);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  width: c.w,
                  height: CHIP_H,
                  boxSizing: "border-box",
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT,
                  fontSize: 20,
                  fontWeight: 500,
                  color: lit > 0.5 ? C.navy : C.ice,
                  background: `rgb(185 217 235 / ${0.06 + 0.94 * lit})`,
                  border: `1px solid rgb(185 217 235 / ${0.22 + 0.5 * lit})`,
                  boxShadow: lit > 0 ? `0 0 ${30 * lit}px rgb(124 192 255 / ${0.45 * lit})` : undefined,
                  opacity: appear * (lit > 0 ? 1 : mix(1, 0.55, progress(g, 2330, 30))),
                  transform: `translateY(${(1 - appear) * 10}px)`,
                }}
              >
                {c.text}
              </div>
            );
          })}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="link" x1="0" x2="1">
                <stop offset="0" stopColor="#b9d9eb" />
                <stop offset="0.5" stopColor="#7cc0ff" />
                <stop offset="1" stopColor="#b9d9eb" />
              </linearGradient>
            </defs>
            {LINKS.map((l, i) => {
              const path = linkPath(l.a, l.b);
              const t = progress(g, l.at, LINK_DUR, easeInOut);
              if (t <= 0) return null;
              const head = bezierAt(path, t);
              const L = 1400;
              return (
                <g key={i}>
                  <path d={path.d} fill="none" stroke="url(#link)" strokeWidth={2} strokeDasharray={L} strokeDashoffset={L * (1 - t)} opacity={0.85} />
                  {t < 1 ? (
                    <>
                      <circle cx={head.x} cy={head.y} r={14} fill="#7cc0ff" opacity={0.25} />
                      <circle cx={head.x} cy={head.y} r={4.5} fill="#eef7ff" />
                    </>
                  ) : null}
                </g>
              );
            })}
            {/* The liked card links to Hana's topics. */}
            {personal > 0
              ? ["nlp", "machine learning", "ai"].map((topic, i) => {
                  const chip = THEM.chips.find((c) => c.text === topic)!;
                  const x1 = pBox.x + 300 + i * 24;
                  const y1 = pBox.y - 22;
                  const x2 = chip.x + chip.w + 10;
                  const y2 = chip.y + CHIP_H / 2;
                  const t = progress(g, PERSONAL_AT + 10 + i * 6, 40, easeInOut);
                  const L = 1200;
                  return (
                    <path key={topic} d={`M ${x1} ${y1} C ${x1 + 160} ${y1 - 80}, ${x2 + 200} ${y2}, ${x2} ${y2}`} fill="none" stroke="#45c58f" strokeWidth={1.6} strokeDasharray={`${L}`} strokeDashoffset={L * (1 - t)} opacity={0.7} />
                  );
                })
              : null}
          </svg>
          {/* The swipe that also counts. */}
          <div style={{ position: "absolute", left: pBox.x, top: pBox.y, transform: `translate(-50%, -50%) translateY(${(1 - personal) * 16}px)`, opacity: personal, fontFamily: FONT, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 99, padding: "10px 18px", background: "rgb(69 197 143 / 0.12)", border: "1px solid rgb(69 197 143 / 0.45)", color: C.ice, fontSize: 21, fontWeight: 500, whiteSpace: "nowrap" }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0112 7a4.4 4.4 0 017.5 2.9C19.5 15.4 12 20 12 20z" fill="#45c58f" />
              </svg>
              Because you liked Research with the Natural Language Processing Group
            </div>
          </div>
        </AbsoluteFill>

        {/* The line. */}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Words text="Not just opportunities." at={2650} out={2752} size={96} color={C.darkMuted} />
          <Words text="Opportunities that fit." at={2690} out={2756} size={96} />
        </AbsoluteFill>

        {/* The deck learns. */}
        {queueIn > 0 ? (
          <AbsoluteFill style={{ opacity: queueIn }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 150 }}>
              <Words text="Every swipe teaches the deck." at={QUEUE_IN} out={2980} size={72} />
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 258, display: "flex", justifyContent: "center", gap: 14 }}>
              {SWIPE_CHIPS.map((s, i) => {
                const p = progress(g, QUEUE_IN + 30 + i * 10, 26, easeOut);
                return (
                  <div key={s.word} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderRadius: 99, border: "1px solid rgb(185 217 235 / 0.2)", background: "rgb(185 217 235 / 0.05)", fontFamily: FONT, fontSize: 18, color: C.ice, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, whiteSpace: "nowrap" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: s.color }} />
                    <span style={{ fontWeight: 600 }}>{s.word}</span>
                    <span style={{ color: C.darkMuted }}>{s.title}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: ROW_X, top: 420, fontFamily: FONT, fontSize: 18, fontWeight: 600, color: C.darkMuted, opacity: progress(g, QUEUE_IN + 40, 30) }}>Further back in your deck</div>
            {QUEUE.map((q, i) => {
              const sp = springProgress(g, REORDER_AT + Math.abs(q.to - q.from) * 2 + i, { stiffness: 140, damping: 20 });
              const slot = mix(q.from, q.to, sp);
              const enter = progress(g, QUEUE_IN + 50 + q.from * 4, 34, easeOut);
              const moved = q.from !== q.to;
              const rise = q.to < q.from;
              const arc = Math.sin(Math.PI * clamp01(sp)) * (rise ? -46 : 26) * (moved ? 1 : 0);
              const reasonOn = progress(g, REORDER_AT + 40, 30, easeOut);
              const glow = rise ? progress(g, REORDER_AT + 30, 20) * (1 - progress(g, REORDER_AT + 90, 40)) : 0;
              return (
                <div key={deckKey(q.item)} style={{ position: "absolute", left: ROW_X + slot * SLOT_W, top: 460 + arc + (1 - enter) * 30, opacity: enter * (q.from > SLOTS ? sp : 1), zIndex: rise ? 10 : 1 }}>
                  <MiniCard item={q.item} reasonOn={reasonOn} glow={glow} />
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 0, right: 0, top: 730, textAlign: "center", fontFamily: FONT, fontSize: 24, color: C.darkMuted, opacity: progress(g, REORDER_AT + 50, 30) }}>
              Your swipes decide {Math.round(SIM.summary.influence * 100)}% of the deck order. The rest is your profile match.
            </div>
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

function mixColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`;
}

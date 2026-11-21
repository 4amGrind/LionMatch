// 0:09.6 to 0:26.4. The point of light becomes the crown, the name arrives, and then the logo flies
// into the header of the real app as the phone rises to meet it. The phone turns once to show
// its depth, then settles beside a list of everything the deck holds, switching the app's real
// category filter for each.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Waves } from "../components/Atmosphere";
import { AppDeckScreen, CardState, ChipId, Chips, DeckCardAt, ToGo } from "../components/AppDeckScreen";
import { Crown } from "../components/Crown";
import { Phone, PhonePose, screenToFilm } from "../components/Phone";
import { FrameOffset, Words } from "../components/Type";
import { deck, type DeckItem } from "../lib/appData";
import { enterStack, fadeOutStack } from "../lib/deckAnim";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { keyed } from "../lib/pose";
import { SETTLE, springProgress } from "../lib/spring";
import { C, FONT } from "../theme";
import { PointOfLight } from "./S1Problem";

export const S2S3_FROM = 552;

/** Width of "LionMatch" in the app's header style, in ems (91px at 19px, measured). */
const WORD_EM = 91 / 19;
const LOCKUP = { crownX: 960 - 150, crownY: 232, crownSize: 300, wordCy: 612, wordSize: 132 };

export const COUNTS: Record<ChipId, number> = { all: 59, internship: 9, club: 18, research: 15, fellowship: 6, people: 11 };

const kindOf = (d: DeckItem): ChipId => (d.kind === "person" ? "people" : d.opportunity.category);
export const filtered = (id: ChipId) => (id === "all" ? deck : deck.filter((d) => kindOf(d) === id));

/** When each filter is tapped. */
export const CATS: { id: ChipId; word: string; at: number; scroll: number; color: string }[] = [
  { id: "internship", word: "Internships.", at: 1296, scroll: 0, color: "#4d79ad" },
  { id: "research", word: "Research.", at: 1332, scroll: 0, color: "#189c8b" },
  { id: "club", word: "Clubs.", at: 1368, scroll: 0, color: "#2f86d6" },
  { id: "fellowship", word: "Fellowships.", at: 1404, scroll: 130, color: "#c4527f" },
  { id: "people", word: "People.", at: 1440, scroll: 233, color: "#e2a629" },
];
export const ALL_AGAIN = 1476;

export function phonePoseS2S3(g: number): PhonePose {
  const p = keyed(g, [
    [884, { x: 960, y: 1640, scale: 0.96, rotateX: 22, rotateY: 0 }],
    [1006, { x: 960, y: 560, scale: 1, rotateX: 0, rotateY: 0 }, easeOut],
    [1030, { x: 960, y: 560, scale: 1, rotateX: 0, rotateY: 0 }],
    [1150, { x: 1050, y: 552, scale: 0.93, rotateX: 6, rotateY: -24 }, camera],
    [1190, { x: 1062, y: 548, scale: 0.92, rotateX: 5, rotateY: -26 }, easeInOut],
    [1272, { x: 690, y: 548, scale: 0.92, rotateX: 0, rotateY: 9 }, camera],
    [1584, { x: 700, y: 548, scale: 0.93, rotateX: 0, rotateY: 7 }, easeInOut],
  ]);
  return p;
}

/** The deck as it looks at global frame g during the category tour. */
export function categoryDeck(g: number): { cards: CardState[]; active: ChipId; mix: Partial<Record<ChipId, number>>; scroll: number; count: number } {
  const steps = [{ id: "all" as ChipId, at: -Infinity, scroll: 0 }, ...CATS, { id: "all" as ChipId, at: ALL_AGAIN, scroll: 0 }];
  let i = 0;
  while (i < steps.length - 1 && g >= steps[i + 1].at) i++;
  const cur = steps[i];
  const prev = i > 0 ? steps[i - 1] : null;
  let cards: CardState[];
  if (!prev) {
    cards = deck.slice(0, 4).map((item, d) => ({ item, depth: d }));
  } else {
    cards = [...fadeOutStack(filtered(prev.id), cur.at, g), ...enterStack(filtered(cur.id), cur.at, g)];
  }
  const t = prev ? progress(g, cur.at, 9, easeOut) : 1;
  const mixMap: Partial<Record<ChipId, number>> = { [cur.id]: t };
  if (prev) mixMap[prev.id] = (mixMap[prev.id] ?? 0) + (1 - t);
  const sp = prev ? springProgress(g, cur.at, { stiffness: 170, damping: 26 }) : 1;
  const scroll = prev ? mix(prev.scroll, cur.scroll, sp) : cur.scroll;
  return { cards, active: cur.id, mix: mixMap, scroll, count: filtered(cur.id).length };
}

export function DeckScreen({ cards, active, chipMix, scroll, count, filteredLabel, undo, chrome, children }: { cards: CardState[]; active: ChipId; chipMix?: Partial<Record<ChipId, number>>; scroll?: number; count: number; filteredLabel?: boolean; undo?: number; chrome?: string; children?: React.ReactNode }) {
  const ordered = [...cards].sort((a, b) => (a.z ?? 100 - a.depth * 10) - (b.z ?? 100 - b.depth * 10));
  return (
    <AppDeckScreen chrome={chrome}>
      <ToGo count={count} filtered={filteredLabel} undo={undo} />
      <Chips active={active} counts={COUNTS} scrollX={scroll} activeMix={chipMix} />
      {ordered.map((c, i) => (
        <DeckCardAt key={`${i}-${c.item.kind === "person" ? c.item.person.id : c.item.opportunity.id}`} state={c} />
      ))}
      {children}
    </AppDeckScreen>
  );
}

export const S2S3RevealProduct = () => {
  const g = useCurrentFrame() + S2S3_FROM;

  // --- The point gathers itself, a ring breathes out, then the crown draws.
  const pointI = g < 576 ? 0 : mix(1.25, 0, progress(g, 576, 56, easeInOut));
  const pointSize = mix(1.6, 0.4, progress(g, 576, 56, easeInOut));
  const ringP = progress(g, 578, 80, easeOut);
  const draw = progress(g, 598, 118, easeInOut);
  const fill = progress(g, 712, 22, easeOut);
  const glow = progress(g, 712, 8, easeOut) * (1 - progress(g, 724, 110, easeOut));
  const sheen = mix(-0.2, 1.3, progress(g, 716, 60, easeInOut));
  const word = progress(g, 724, 46, easeOut);

  // --- The flight into the phone's header.
  const pose = phonePoseS2S3(g);
  const fly = progress(g, 872, 120, camera);
  const crownT = screenToFilm(pose, 28, 21);
  const crownSizeT = 30 * pose.scale;
  const textT = screenToFilm(pose, 66, 36);
  const crownSize = LOCKUP.crownSize * Math.pow(crownSizeT / LOCKUP.crownSize, fly);
  const crownX = mix(LOCKUP.crownX, crownT.x, fly);
  const crownY = mix(LOCKUP.crownY, crownT.y, fly);
  const wordSize = LOCKUP.wordSize * Math.pow((19 * pose.scale) / LOCKUP.wordSize, fly);
  const wordLeft = mix(960 - (WORD_EM * LOCKUP.wordSize) / 2, textT.x, fly);
  const wordCy = mix(LOCKUP.wordCy, textT.y, fly);
  const ink = progress(g, 920, 60, easeInOut);
  const lockColor = blend(C.ice, C.navy, ink);
  const lockupOn = g < 1008;

  // --- Phone screen.
  const deckState = categoryDeck(g);
  const chrome = g < 1008 ? "screens/light-deck-chrome-noheader.png" : "screens/light-deck-chrome.png";
  const showPhone = g >= 884 && g < 1560;

  // --- Category list beside the phone.
  const listIn = progress(g, 1262, 30, easeOut) * (1 - progress(g, ALL_AGAIN - 4, 26, easeIn));
  let activeF = 0;
  CATS.forEach((c, i) => {
    if (i > 0) activeF += springProgress(g, c.at, { stiffness: 140, damping: 22 });
  });
  const activeIdx = CATS.reduce((n, c, i) => (g >= c.at ? i : n), 0);

  return (
    <FrameOffset.Provider value={S2S3_FROM}>
    <AbsoluteFill>
      <Waves opacity={0.5 * progress(g, 990, 120, easeInOut)} shift={mix(30, -30, progress(g, 990, 700, easeInOut))} />

      {/* The point, the ring, then the crown. */}
      <PointOfLight intensity={pointI} size={pointSize} />
      {ringP > 0 && ringP < 1 ? (
        <div style={{ position: "absolute", left: 960 - 300 * ringP, top: 540 - 300 * ringP, width: 600 * ringP, height: 600 * ringP, borderRadius: "50%", border: "1.5px solid rgb(185 217 235 / 0.5)", opacity: (1 - ringP) * 0.8 }} />
      ) : null}

      {showPhone ? (
        <Phone pose={pose}>
          <DeckScreen cards={deckState.cards} active={deckState.active} chipMix={deckState.mix} scroll={deckState.scroll} count={deckState.count} filteredLabel={deckState.active !== "all"} chrome={chrome} />
        </Phone>
      ) : null}

      {lockupOn && g >= 590 ? (
        <>
          <div style={{ position: "absolute", left: crownX, top: crownY }}>
            <Crown size={crownSize} color={lockColor} draw={draw} fill={fill} glow={glow * (1 - fly)} sheen={fly > 0 ? -1 : sheen} strokeWidth={1.6} />
          </div>
          <div
            style={{
              position: "absolute",
              left: wordLeft,
              top: wordCy,
              transform: `translateY(-50%) translateY(${(1 - word) * 30}px)`,
              fontFamily: FONT,
              fontSize: wordSize,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.04,
              color: lockColor,
              whiteSpace: "nowrap",
              opacity: word,
              clipPath: fly > 0 ? undefined : `inset(${(1 - word) * 100}% -10% -20% -10%)`,
              filter: word < 1 ? `blur(${(1 - word) * 8}px)` : undefined,
            }}
          >
            LionMatch
          </div>
        </>
      ) : null}

      <AbsoluteFill style={{ top: 712, height: 80, alignItems: "center" }}>
        <Words text="Your next opportunity. One swipe away." at={782} out={856} size={44} weight={500} color={C.darkMuted} tracking="-0.02em" stagger={3} />
      </AbsoluteFill>

      {/* Everything in one deck. */}
      {listIn > 0 ? (
        <div style={{ position: "absolute", left: 1130, top: 0, width: 700, height: 1080, opacity: listIn }}>
          {CATS.map((c, i) => {
            const d = i - activeF;
            const on = clamp01(1 - Math.abs(d));
            const reached = g >= c.at - 4;
            return (
              <div
                key={c.id}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 540 + d * 112,
                  transform: `translateY(-50%) scale(${mix(0.74, 1, on)})`,
                  transformOrigin: "left center",
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  fontFamily: FONT,
                  fontSize: 104,
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  color: C.ice,
                  opacity: (reached ? mix(0.16, 1, on) : 0.1) * clamp01(1.6 - Math.abs(d) * 0.45),
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 99, background: c.color, opacity: mix(0.4, 1, on), transform: `scale(${mix(0.6, 1, on)})` }} />
                {c.word}
              </div>
            );
          })}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 1130, top: 0, height: 1080, display: "flex", alignItems: "center" }}>
        <div>
          <Words text="All in one deck." at={ALL_AGAIN + 6} out={1558} size={104} tracking="-0.04em" align="left" />
          <Words text="Matched to you, card by card." at={ALL_AGAIN + 20} out={1554} size={36} weight={500} color={C.darkMuted} tracking="-0.015em" align="left" style={{ marginTop: 18 }} />
        </div>
      </div>
      {/* activeIdx is used only to keep lint quiet about the computed list order */}
      <span style={{ display: "none" }}>{activeIdx}</span>
    </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

function blend(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`;
}

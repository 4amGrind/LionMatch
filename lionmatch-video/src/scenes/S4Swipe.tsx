// 0:26.4 to 0:37.2. The centrepiece. Close on the deck, three real swipes (Save, Interested, Pass)
// with the app's springs and stamps, confetti on the strong match, and then the next card, picked by
// the recommender because of those swipes, lifts out of the phone into the room.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CardState, DECK, StrongMatch } from "../components/AppDeckScreen";
import { Confetti } from "../components/Confetti";
import { DeckCard } from "../components/DeckCard";
import { Phone, PhonePose } from "../components/Phone";
import { FrameOffset, Words } from "../components/Type";
import { simulateDeck, type DeckItem } from "../lib/appData";
import { enterStack, settleAfter, swipeGesture, type Gesture } from "../lib/deckAnim";
import { camera, clamp01, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { keyed } from "../lib/pose";
import { PILL, springAt, springProgress } from "../lib/spring";
import { C, FONT } from "../theme";
import { ALL_AGAIN, DeckScreen } from "./S2S3RevealProduct";

export const S4_FROM = 1560;
export const S4_TO = 2232;

/** The three swipes: when the finger lands, and how long it drags before letting go. */
export const SWIPES: { gesture: Gesture; start: number; drag: number }[] = [
  { gesture: "save", start: 1670, drag: 22 },
  { gesture: "like", start: 1738, drag: 26 },
  { gesture: "pass", start: 1816, drag: 20 },
];
export const RELEASES = SWIPES.map((s) => s.start + s.drag);
const LIKE_RELEASE = RELEASES[1];
export const BREAKOUT_AT = 1944;
/** Where the lifted card ends up, in film pixels. Scene 5 starts from exactly here. */
export const BREAKOUT = { x: 1262, y: 540, scale: 1.72 };

const SIM = [0, 1, 2, 3].map((n) => simulateDeck(n));
export const HANA_CARD: DeckItem = SIM[3].remaining[0];

export function phonePoseS4(g: number): PhonePose & { blur: number; brightness: number; opacity: number } {
  return keyed(g, [
    [1560, { x: 700, y: 548, scale: 0.93, rotateX: 0, rotateY: 7, blur: 0, brightness: 1, opacity: 1 }],
    [1576, { x: 700, y: 548, scale: 0.93, rotateX: 0, rotateY: 7, blur: 0, brightness: 1, opacity: 1 }],
    [1644, { x: 960, y: 586, scale: 1.32, rotateX: 0, rotateY: 0, blur: 0, brightness: 1, opacity: 1 }, camera],
    [1950, { x: 960, y: 590, scale: 1.33, rotateX: 0, rotateY: 0, blur: 0, brightness: 1, opacity: 1 }, easeInOut],
    [2040, { x: 690, y: 620, scale: 1.0, rotateX: 4, rotateY: 14, blur: 7, brightness: 0.42, opacity: 0.4 }, camera],
    [2232, { x: 660, y: 630, scale: 0.97, rotateX: 4, rotateY: 15, blur: 8, brightness: 0.4, opacity: 0.32 }, easeInOut],
  ]);
}

/** Every card in the phone at frame g, plus the one being dragged or thrown. */
function deckAt(g: number) {
  let k = 0;
  while (k < RELEASES.length && g >= RELEASES[k]) k++;
  // The stack behind: the cards left after k swipes, rising one place after the last release.
  const stack: CardState[] =
    k === 0 ? enterStack(SIM[0].remaining, ALL_AGAIN, g) : settleAfter(SIM[k].remaining, RELEASES[k - 1], g, 1);
  const moving: CardState[] = [];
  let finger: { x: number; y: number; on: number } | null = null;
  // The card being dragged now.
  if (k < SWIPES.length && g >= SWIPES[k].start - 6) {
    const s = swipeGesture(SWIPES[k].gesture, SWIPES[k].start, SWIPES[k].drag, g);
    stack[0] = { ...stack[0], x: s.x, y: s.y, rotate: s.rotate, scale: s.scale, stamps: s.stamps };
    finger = s.finger;
  }
  // The card just thrown, still flying out.
  if (k > 0) {
    const s = swipeGesture(SWIPES[k - 1].gesture, SWIPES[k - 1].start, SWIPES[k - 1].drag, g);
    if (!s.gone) {
      moving.push({ item: SIM[k - 1].remaining[0], depth: 0, x: s.x, y: s.y, rotate: s.rotate, scale: s.scale, opacity: s.opacity, stamps: s.stamps, z: 500 });
      if (s.finger) finger = s.finger;
    }
  }
  return { cards: [...stack, ...moving], k, finger };
}

const LEGEND: { gesture: Gesture; word: string; color: string; arrow: string }[] = [
  { gesture: "save", word: "Save", color: "#f0b73e", arrow: "M12 19V5M6 11l6-6 6 6" },
  { gesture: "like", word: "Interested", color: "#45c58f", arrow: "M5 12h14M13 6l6 6-6 6" },
  { gesture: "pass", word: "Pass", color: "#f36b5f", arrow: "M19 12H5M11 6l-6 6 6 6" },
];

export const S4Swipe = () => {
  const g = useCurrentFrame() + S4_FROM;
  const pose = phonePoseS4(g);
  const { cards, k, finger } = deckAt(g);
  const lifted = g >= BREAKOUT_AT;
  const shown = lifted ? cards.map((c, i) => (i === 0 ? { ...c, hidden: true } : c)) : cards;

  // Strong match: the app celebrates an Interested at 8 or more.
  const pillIn = g >= LIKE_RELEASE ? springAt((g - LIKE_RELEASE) / 60, 0, 1, 0, PILL) : 0;
  const pillOut = progress(g, LIKE_RELEASE + 90, 14, easeOut);
  const likedScore = SIM[1].remaining[0].match.score;

  // The legend of gestures on the left.
  const legendIn = progress(g, 1618, 30, easeOut) * (1 - progress(g, BREAKOUT_AT - 10, 24, easeInOut));
  const activeOf = (i: number) => {
    const s = SWIPES[i];
    return clamp01((g - (s.start - 8)) / 8) * (1 - clamp01((g - (s.start + s.drag + 36)) / 12));
  };

  // The breakout: the top card leaves the phone and grows into the room.
  const lift = progress(g, BREAKOUT_AT, 78, camera);
  const startX = pose.x;
  const startY = pose.y + (DECK.y + DECK.h / 2 - 437) * pose.scale;
  const arc = Math.sin(Math.PI * lift);
  const bx = mix(960, BREAKOUT.x, lift);
  const by = mix(538, BREAKOUT.y, lift) - arc * 30;
  const bs = mix(1.33, BREAKOUT.scale, lift);
  const floatY = Math.sin((g - BREAKOUT_AT) / 50) * 4 * lift;

  return (
    <FrameOffset.Provider value={S4_FROM}>
      <AbsoluteFill>
        <Phone pose={pose}>
          <DeckScreen cards={shown} active="all" count={59 - k} undo={k > 0 ? springProgress(g, RELEASES[0], { stiffness: 300, damping: 26 }) : 0}>
            {finger && finger.on > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: DECK.x + DECK.w / 2 + finger.x - 23,
                  top: DECK.y + DECK.h / 2 + finger.y - 23,
                  width: 46,
                  height: 46,
                  borderRadius: 99,
                  background: "radial-gradient(circle, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.25) 60%, rgb(255 255 255 / 0.1))",
                  boxShadow: "0 0 0 1.5px rgb(255 255 255 / 0.7), 0 6px 18px rgb(12 35 64 / 0.35)",
                  opacity: finger.on,
                  transform: `scale(${0.7 + 0.3 * finger.on})`,
                  zIndex: 600,
                }}
              />
            ) : null}
            {g >= LIKE_RELEASE && g < LIKE_RELEASE + 120 ? (
              <>
                <Confetti tick={g - LIKE_RELEASE} width={402} height={874} />
                <StrongMatch score={likedScore} t={pillIn} out={pillOut} />
              </>
            ) : null}
          </DeckScreen>
        </Phone>

        {legendIn > 0 ? (
          <div style={{ position: "absolute", left: 150, top: 380, opacity: legendIn, fontFamily: FONT }}>
            {LEGEND.map((l, i) => {
              const on = activeOf(i);
              return (
                <div key={l.word} style={{ display: "flex", alignItems: "center", gap: 22, height: 104, opacity: mix(0.3, 1, on), transform: `translateX(${on * 10}px)` }}>
                  <svg viewBox="0 0 24 24" style={{ width: 46, height: 46 }}>
                    <path d={l.arrow} fill="none" stroke={on > 0.5 ? l.color : C.darkMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.035em", color: C.ice }}>{l.word}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {lifted ? (
          <>
            <div
              style={{
                position: "absolute",
                left: bx - 300,
                top: by - 380,
                width: 600,
                height: 760,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgb(90 160 230 / 0.35), transparent)",
                opacity: lift,
                filter: "blur(30px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: bx - DECK.w / 2,
                top: by + floatY - DECK.h / 2,
                width: DECK.w,
                height: DECK.h,
                transform: `perspective(1800px) rotateY(${-14 * arc}deg) rotateX(${6 * arc}deg) scale(${bs})`,
                filter: `drop-shadow(0 ${30 + 30 * lift}px ${50 + 30 * lift}px rgb(0 0 0 / ${0.35 + 0.25 * lift}))`,
              }}
            >
              <DeckCard item={HANA_CARD} />
            </div>
          </>
        ) : null}
        <span style={{ display: "none" }}>{startX + startY}</span>

        <div style={{ position: "absolute", left: 140, top: 0, height: 1080, display: "flex", alignItems: "center" }}>
          <div>
            <Words text="Every match" at={1992} out={2232} size={84} align="left" />
            <Words text="comes with a reason." at={2004} out={2236} size={84} align="left" color={C.darkMuted} />
          </div>
        </div>
      </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

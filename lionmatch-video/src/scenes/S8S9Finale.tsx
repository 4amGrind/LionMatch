// 1:12 to 1:26.4. The phone steps back to the deck and the rest of the app gathers around it.
// Then everything folds into a point, which becomes the crown and the end card.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Crown } from "../components/Crown";
import { Phone } from "../components/Phone";
import { Screen } from "../components/Screens";
import { FrameOffset, Words } from "../components/Type";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { C, FONT } from "../theme";
import { PointOfLight } from "./S1Problem";
import { DeckScreen } from "./S2S3RevealProduct";
import { S7ScreenContent, phonePoseS7 } from "./S7Connect";
import { simulateDeck } from "../lib/appData";

export const S8_FROM = 4296;
export const S8_TO = 5184;

const FRESH = simulateDeck(0).remaining.slice(0, 4).map((item, depth) => ({ item, depth }));
const COLLAPSE = 4684;
/** Where the montage folds to: the centre of the crown on the end card. */
const END_POINT = { x: 960, y: 412 };

const SIDE = [
  { src: "screens/light-explore-robotics.png", label: "Explore and search", x: 222, scale: 0.56, ry: 24, z: 0, delay: 18 },
  { src: "screens/light-history.png", label: "What the deck learned", x: 578, scale: 0.66, ry: 12, z: 1, delay: 6 },
  { src: "screens/light-person-hana-outreach.png", label: "Coffee chats and outreach", x: 1342, scale: 0.66, ry: -12, z: 1, delay: 10 },
  { src: "screens/light-resume-found.png", label: "Resume import", x: 1698, scale: 0.56, ry: -24, z: 0, delay: 22 },
];

export const S8S9Finale = () => {
  const g = useCurrentFrame() + S8_FROM;

  // --- Montage.
  const pull = mix(1.06, 0.97, progress(g, 4330, 380, easeInOut));
  const collapse = progress(g, COLLAPSE, 56, easeIn);
  const centrePose = g < 4380 ? phonePoseS7(g) : { x: 960, y: 596, scale: 0.8, rotateX: 0, rotateY: 0, opacity: 1 };
  const toDeck = progress(g, 4352, 24, easeInOut);
  const headline = progress(g, 4372, 30) * (1 - progress(g, COLLAPSE - 12, 24, easeIn));
  const toCentre = (x: number, y: number) => ({ x: mix(960 + (x - 960) * pull, 960, collapse), y: mix(540 + (y - 540) * pull, END_POINT.y, collapse) });

  // --- End card.
  const flash = progress(g, COLLAPSE + 30, 26, easeOut) * (1 - progress(g, COLLAPSE + 56, 70, easeInOut));
  const drawC = progress(g, 4742, 56, easeInOut);
  const fillC = progress(g, 4782, 16, easeOut);
  const glowC = progress(g, 4786, 8) * (1 - progress(g, 4794, 120, easeOut));
  const sheen = mix(-0.2, 1.3, progress(g, 4792, 60, easeInOut));
  const word = progress(g, 4796, 50, easeOut);
  const endOut = progress(g, 5132, 50, easeInOut);
  const crownBox = 230;

  return (
    <FrameOffset.Provider value={S8_FROM}>
      <AbsoluteFill>
        {g < COLLAPSE + 60 ? (
          <AbsoluteFill style={{ opacity: 1 - clamp01((collapse - 0.7) / 0.3) }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 56, opacity: headline }}>
              <Words text="Less searching. More finding." at={4372} size={72} />
            </div>
            {SIDE.map((s) => {
              const enter = progress(g, 4344 + s.delay, 70, camera);
              if (enter <= 0) return null;
              const p = toCentre(s.x, 606);
              const sc = s.scale * pull * mix(0.6, 1, enter) * mix(1, 0.1, collapse);
              return (
                <div key={s.src}>
                  <Phone
                    pose={{ x: mix(960, p.x, enter), y: p.y + (1 - enter) * 60, scale: sc, rotateY: s.ry * (1 - collapse), rotateX: 0, opacity: enter, blur: (1 - enter) * 10 + (s.z === 0 ? 0.6 : 0), brightness: s.z === 0 ? 0.82 : 0.92 }}
                    shadow={0.8}
                  >
                    <Screen src={s.src} />
                  </Phone>
                  <div style={{ position: "absolute", left: p.x - 200, width: 400, top: 606 + 460 * s.scale * pull + 18, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.darkMuted, opacity: progress(g, 4400 + s.delay, 30) * (1 - collapse) }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
            {(() => {
              const p = g < 4380 ? { x: centrePose.x, y: centrePose.y } : toCentre(960, 596);
              const sc = (g < 4380 ? centrePose.scale : 0.8 * pull) * mix(1, 0.1, collapse);
              return (
                <>
                  <Phone pose={{ ...centrePose, x: p.x, y: p.y, scale: sc, opacity: 1 }}>
                    {toDeck < 1 ? <S7ScreenContent g={Math.min(g, 4352)} /> : null}
                    <div style={{ position: "absolute", inset: 0, opacity: toDeck }}>
                      <DeckScreen cards={FRESH} active="all" count={59} />
                    </div>
                  </Phone>
                  <div style={{ position: "absolute", left: 760, width: 400, top: 596 + 460 * 0.8 * pull + 18, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.ice, opacity: progress(g, 4400, 30) * (1 - collapse) }}>
                    Swipe
                  </div>
                </>
              );
            })()}
          </AbsoluteFill>
        ) : null}

        {/* The point the app folds into, then the crown. */}
        <PointOfLight intensity={flash * 1.2} size={1 + flash * 0.8} x={END_POINT.x} y={END_POINT.y} />
        {g >= 4740 ? (
          <AbsoluteFill style={{ opacity: 1 - endOut }}>
            <div style={{ position: "absolute", left: 960 - crownBox / 2, top: END_POINT.y - crownBox / 2 }}>
              <Crown size={crownBox} color={C.ice} draw={drawC} fill={fillC} glow={glowC} sheen={sheen} strokeWidth={1.8} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 556,
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 128,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.04,
                color: C.ice,
                opacity: word,
                transform: `translateY(${(1 - word) * 30}px)`,
                filter: word < 1 ? `blur(${(1 - word) * 8}px)` : undefined,
              }}
            >
              LionMatch
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 716 }}>
              <Words text="Find your fit. Find your future." at={4872} size={46} weight={500} color={C.darkMuted} tracking="-0.02em" stagger={4} />
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 976, textAlign: "center", fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "#6f88a2", letterSpacing: "0.005em", opacity: progress(g, 4940, 40) }}>
              Built for Columbia students.
            </div>
          </AbsoluteFill>
        ) : null}
        <AbsoluteFill style={{ background: "#000", opacity: progress(g, 5150, 34, easeInOut) }} />
      </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

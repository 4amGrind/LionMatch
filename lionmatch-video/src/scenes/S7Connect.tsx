// 1:00 to 1:12. From a card you liked to a conversation. The NLP card opens into its real details
// page and scrolls (one captured frame per film frame), "Someone to talk to" leads to Hana Kim,
// her page offers a coffee chat drafted from the app's template, and it is sent into Chats.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DECK, SCREEN_H, SCREEN_W } from "../components/AppDeckScreen";
import { DeckCard } from "../components/DeckCard";
import { Phone, PhonePose } from "../components/Phone";
import { Screen, Tap, scrollFrame } from "../components/Screens";
import { FrameOffset, Words } from "../components/Type";
import { simulateDeck } from "../lib/appData";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { keyed } from "../lib/pose";
import outreach from "../../public/screens/outreach-layout.json";
import { C, FONT } from "../theme";
import { ALL_AGAIN, DeckScreen } from "./S2S3RevealProduct";

export const S7_FROM = 3576;
export const S7_TO = 4344;

const NLP = simulateDeck(1).remaining.slice(0, 4);
const T = {
  tapDetails: 3672,
  morph: 3682,
  detailScroll: 3724,
  tapContact: 3852,
  push: 3864,
  personScroll: 3898,
  sweep: 3990,
  tapSend: 4068,
  pushChat: 4078,
  reply: 4176,
  toMontage: 4290,
};
const DETAIL_FRAMES = 96;
const PERSON_FRAMES = 84;

export function phonePoseS7(g: number): PhonePose & { opacity: number } {
  return keyed(g, [
    [3594, { x: 1560, y: 560, scale: 0.9, rotateX: 0, rotateY: -16, opacity: 0 }],
    [3652, { x: 1270, y: 548, scale: 1.0, rotateX: 0, rotateY: -5, opacity: 1 }, camera],
    [T.reply - 40, { x: 1270, y: 548, scale: 1.0, rotateX: 0, rotateY: -5, opacity: 1 }, easeInOut],
    [T.toMontage, { x: 1262, y: 540, scale: 1.045, rotateX: 0, rotateY: -8, opacity: 1 }, easeInOut],
    [4380, { x: 960, y: 596, scale: 0.8, rotateX: 0, rotateY: 0, opacity: 1 }, camera],
  ]);
}

/** What the phone shows at frame g. */
export function S7ScreenContent({ g }: { g: number }) {
  // 1. The card you were Interested in, then "See full details" opens it.
  if (g < T.morph + 44) {
    const m = progress(g, T.morph, 40, camera);
    const rect = {
      x: mix(DECK.x, 0, m),
      y: mix(DECK.y + 30, 0, m),
      w: mix(DECK.w, SCREEN_W, m),
      h: mix(DECK.h - 30, SCREEN_H, m),
      r: mix(26, 0, m),
    };
    const detailOn = progress(g, T.morph + 14, 24, easeOut);
    return (
      <>
        <DeckScreen cards={NLP.map((item, i) => ({ item, depth: i, opacity: i === 0 ? 1 - m : 1 }))} active="all" count={58} undo={1} />
        <Tap x={86} y={DECK.y + DECK.h - 34} t={progress(g, T.tapDetails, 18, easeOut)} />
        {m > 0 ? (
          <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, overflow: "hidden", background: "#eef4f9", boxShadow: "0 20px 50px rgb(12 35 64 / 0.4)" }}>
            <div style={{ position: "absolute", left: -rect.x, top: -rect.y, width: SCREEN_W, height: SCREEN_H }}>
              <div style={{ position: "absolute", left: rect.x, top: rect.y - 30, width: rect.w, height: rect.h + 30, opacity: 1 - detailOn }}>
                <div style={{ width: DECK.w, height: DECK.h, transform: `scale(${rect.w / DECK.w}, ${(rect.h + 30) / DECK.h})`, transformOrigin: "0 0" }}>
                  <DeckCard item={NLP[0]} />
                </div>
              </div>
              <Screen src={scrollFrame("scroll-detail-nlp", 0, DETAIL_FRAMES)} opacity={detailOn} />
            </div>
          </div>
        ) : null}
      </>
    );
  }
  // 2. The details page scrolls to "Someone to talk to".
  if (g < T.push + 26) {
    const i = g - T.detailScroll;
    const push = progress(g, T.push, 26, camera);
    return (
      <>
        <Screen src={scrollFrame("scroll-detail-nlp", i, DETAIL_FRAMES)} x={-120 * push} filter={push > 0 ? `brightness(${1 - 0.3 * push})` : undefined} />
        {g >= T.tapContact - 30 && g < T.push ? <Highlight x={16} y={683} w={370} h={92} on={progress(g, T.tapContact - 30, 20, easeOut)} /> : null}
        <Tap x={120} y={730} t={progress(g, T.tapContact, 18, easeOut)} />
        {push > 0 ? <Screen src={scrollFrame("scroll-person-hana", 0, PERSON_FRAMES)} x={SCREEN_W * (1 - push)} /> : null}
      </>
    );
  }
  // 3. Hana's page scrolls to "Reach out", the drafted message is read through, then sent.
  if (g < T.pushChat + 26) {
    const i = g - T.personScroll;
    const push = progress(g, T.pushChat, 26, camera);
    const ta = outreach.textarea;
    const lines = 5;
    return (
      <>
        <Screen src={scrollFrame("scroll-person-hana", i, PERSON_FRAMES)} x={-120 * push} filter={push > 0 ? `brightness(${1 - 0.3 * push})` : undefined} />
        {g >= T.sweep && g < T.pushChat ? (
          <>
            <Highlight x={ta.x} y={ta.y} w={ta.w} h={ta.h} on={progress(g, T.sweep, 16, easeOut) * (1 - progress(g, T.tapSend - 10, 14))} />
            {Array.from({ length: lines }, (_, l) => {
              const p = progress(g, T.sweep + 8 + l * 11, 18, easeInOut);
              const y = ta.y + 1 + outreach.padding + l * outreach.lineHeight;
              return p > 0 && p < 1 ? (
                <div key={l} style={{ position: "absolute", left: ta.x + 8, top: y, width: (ta.w - 16) * p, height: outreach.lineHeight, background: "linear-gradient(90deg, transparent 70%, rgb(124 192 255 / 0.35))", borderRadius: 4 }} />
              ) : null;
            })}
          </>
        ) : null}
        <Tap x={outreach.send.x + outreach.send.w / 2} y={outreach.send.y + outreach.send.h / 2} t={progress(g, T.tapSend, 18, easeOut)} />
        {push > 0 ? <Screen src="screens/light-chat-hana-sent.png" x={SCREEN_W * (1 - push)} /> : null}
      </>
    );
  }
  // 4. Chats: sent, then the sample person's scripted reply.
  const reply = progress(g, T.reply, 16, easeOut);
  return (
    <>
      <Screen src="screens/light-chat-hana-sent.png" />
      <Screen src="screens/light-chat-hana.png" opacity={reply} />
    </>
  );
}

function Highlight({ x, y, w, h, on }: { x: number; y: number; w: number; h: number; on: number }) {
  return <div style={{ position: "absolute", left: x - 4, top: y - 4, width: w + 8, height: h + 8, borderRadius: 26, boxShadow: `0 0 0 2.5px rgb(90 169 240 / ${on}), 0 0 30px rgb(90 169 240 / ${0.5 * on})`, zIndex: 40 }} />;
}

const STEPS = [
  { word: "Discover.", at: 3640, caption: "Details, deadlines and prerequisites, all in one place." },
  { word: "Connect.", at: T.push, caption: "Someone to talk to, with a coffee chat drafted for you to edit." },
  { word: "Take the next step.", at: T.pushChat, caption: "Send it, and the conversation continues in Chats." },
];

export const S7Connect = () => {
  const g = useCurrentFrame() + S7_FROM;
  const pose = phonePoseS7(g);
  const textOut = progress(g, T.toMontage - 20, 30, easeIn);
  const active = STEPS.reduce((n, s, i) => (g >= s.at ? i : n), 0);
  return (
    <FrameOffset.Provider value={S7_FROM}>
      <AbsoluteFill>
        <Phone pose={pose} style={{ opacity: pose.opacity }}>
          <S7ScreenContent g={g} />
        </Phone>
        <div style={{ position: "absolute", left: 150, top: 0, height: 1080, display: "flex", alignItems: "center", opacity: 1 - textOut }}>
          <div style={{ width: 760 }}>
            {STEPS.map((s, i) => (
              <Words key={s.word} text={s.word} at={s.at} size={84} align="left" color={i === active ? C.ice : "#3f5873"} style={{ marginTop: i ? 6 : 0 }} />
            ))}
            <div style={{ position: "relative", height: 90, marginTop: 30 }}>
              {STEPS.map((s, i) => {
                const on = progress(g, s.at + 14, 26, easeOut) * (i < STEPS.length - 1 ? 1 - progress(g, STEPS[i + 1].at - 6, 14, easeIn) : 1);
                return (
                  <div key={i} style={{ position: "absolute", left: 0, top: 0, fontFamily: FONT, fontSize: 26, lineHeight: 1.4, color: C.darkMuted, maxWidth: 560, opacity: on, transform: `translateY(${(1 - clamp01(on * 2)) * 10}px)` }}>
                    {s.caption}
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 18, color: "#5f7891", marginTop: 8, opacity: progress(g, T.reply + 10, 30) }}>Hana is a sample profile, so the reply is scripted for the demo.</div>
          </div>
        </div>
        <span style={{ display: "none" }}>{ALL_AGAIN}</span>
      </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

// 0:50.4 to 1:00. A made-up resume is read the way the app reads it (src/lib/resume.ts):
// it looks only for the skills and topics that listings use. Each find lifts off the page and
// lands where the app shows it, "Add 8 to the form" is tapped, and a card's score moves with the profile.

import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { DeckCard, display } from "../components/DeckCard";
import { Phone, PhonePose, screenToFilm } from "../components/Phone";
import { FrameOffset, Words } from "../components/Type";
import { demoUser, matchOpportunity, opp, profileAfterImport, resumeFindings } from "../lib/appData";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress } from "../lib/ease";
import { keyed } from "../lib/pose";
import { springProgress } from "../lib/spring";
import tagRects from "../../public/screens/resume-tags.json";
import { C, FONT } from "../theme";

export const S6_FROM = 3000;
export const S6_TO = 3624;

// --- The resume, the same text as scripts/sample-resume.html.
const PW = 640;
const PH = 828;
const PAD = 48;
const DOC_FONT = "Helvetica, Arial, sans-serif";
type Seg = string | { hl: string; tag: string[] };
type Line = { y: number; size?: number; bold?: boolean; color?: string; segs: Seg[]; right?: string; rule?: boolean };
const LINES: Line[] = [
  { y: 48, size: 30, bold: true, segs: ["Sample Student"] },
  { y: 90, size: 14, color: "#555", segs: ["New York, NY · sample.student@example.com"] },
  { y: 132, size: 16, bold: true, segs: ["Education"], rule: true },
  { y: 164, bold: true, segs: ["Columbia University, Columbia College"], right: "Expected May 2030" },
  { y: 186, segs: ["B.A. in ", { hl: "Computer Science", tag: ["computer science"] }] },
  { y: 228, size: 16, bold: true, segs: ["Projects"], rule: true },
  { y: 260, bold: true, segs: [{ hl: "Robotic", tag: ["robotics"] }, " arm controller"], right: "Fall 2026" },
  { y: 284, segs: ["•  Built a 4-axis arm on an ", { hl: "Arduino", tag: ["Electronics"] }, ", with a ", { hl: "ROS", tag: ["ROS"] }, " bridge for motion planning."] },
  { y: 306, segs: ["•  Trained a small vision model in ", { hl: "PyTorch", tag: ["PyTorch"] }, " to pick up colored blocks."] },
  { y: 338, bold: true, segs: ["HackNY project, campus events finder"], right: "Spring 2026" },
  { y: 362, segs: ["•  Two-day hackathon team of four. Built the data pipeline in Python and SQL."] },
  { y: 404, size: 16, bold: true, segs: ["Experience"], rule: true },
  { y: 436, bold: true, segs: [{ hl: "Research assistant", tag: ["Lab Work", "research"] }, ", student lab"], right: "2026" },
  { y: 460, segs: ["•  Cleaned sensor data and ran ", { hl: "statistical", tag: ["Statistics"] }, " tests for a robotics study."] },
  { y: 502, size: 16, bold: true, segs: ["Skills"], rule: true },
  { y: 534, segs: ["Python, PyTorch, ROS, Arduino, SQL, machine learning"] },
];

/** Text widths for placing highlights, measured with the same font the page uses. */
let ctx: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, bold: boolean) {
  if (typeof document === "undefined") return text.length * size * 0.52;
  ctx ??= document.createElement("canvas").getContext("2d");
  ctx!.font = `${bold ? "700" : "400"} ${size}px ${DOC_FONT}`;
  return ctx!.measureText(text).width;
}

interface Hit {
  word: string;
  tag: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
function hits(): Hit[] {
  const out: Hit[] = [];
  for (const line of LINES) {
    const size = line.size ?? 15;
    let x = PAD;
    for (const seg of line.segs) {
      const text = typeof seg === "string" ? seg : seg.hl;
      const w = measure(text, size, !!line.bold);
      if (typeof seg !== "string") for (const tag of seg.tag) out.push({ word: seg.hl, tag, x, y: line.y, w, h: size * 1.35 });
      x += w;
    }
  }
  return out;
}

const SCAN = { from: 3092, dur: 100 };
const SCAN_Y0 = 150;
const SCAN_Y1 = 560;
const FLY_AT = 3204;
const TAP_ADD = 3348;
const FUTURE_AT = 3420;

function Resume({ g, hitsList }: { g: number; hitsList: Hit[] }) {
  const scanY = mix(SCAN_Y0, SCAN_Y1, progress(g, SCAN.from, SCAN.dur, easeInOut));
  const scanOn = g >= SCAN.from && g <= SCAN.from + SCAN.dur + 10;
  return (
    <div style={{ position: "relative", width: PW, height: PH, background: "linear-gradient(180deg, #ffffff, #f6f8fb)", borderRadius: 6, boxShadow: "0 50px 90px -30px rgb(0 0 0 / 0.75), 0 0 0 1px rgb(255 255 255 / 0.6)", fontFamily: DOC_FONT, color: "#111", overflow: "hidden" }}>
      {hitsList.map((h, i) => {
        const lit = progress(g, SCAN.from + ((h.y - SCAN_Y0) / (SCAN_Y1 - SCAN_Y0)) * SCAN.dur, 12, easeOut);
        return <div key={i} style={{ position: "absolute", left: h.x - 3, top: h.y - 2, width: (h.w + 6) * lit, height: h.h + 2, borderRadius: 4, background: "rgb(124 192 255 / 0.38)" }} />;
      })}
      {LINES.map((line, i) => (
        <div key={i}>
          <div style={{ position: "absolute", left: PAD, top: line.y, fontSize: line.size ?? 15, fontWeight: line.bold ? 700 : 400, color: line.color ?? "#16202c", whiteSpace: "pre" }}>
            {line.segs.map((s) => (typeof s === "string" ? s : s.hl)).join("")}
          </div>
          {line.right ? <div style={{ position: "absolute", right: PAD, top: line.y, fontSize: 15, color: "#444" }}>{line.right}</div> : null}
          {line.rule ? <div style={{ position: "absolute", left: PAD, right: PAD, top: line.y + 24, height: 1, background: "#999" }} /> : null}
        </div>
      ))}
      {scanOn ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: scanY - 60, height: 60, background: "linear-gradient(180deg, transparent, rgb(124 192 255 / 0.16))" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 2, background: "#5aa9f0", boxShadow: "0 0 18px 4px rgb(90 169 240 / 0.6)" }} />
        </>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, textAlign: "center", fontSize: 12, color: "#8a96a4" }}>Sample resume for this demo. Not a real person.</div>
    </div>
  );
}

const PAPER = { x: 900, y: 556, scale: 0.84 };

function phonePose(g: number): PhonePose & { opacity: number } {
  return keyed(g, [
    [3020, { x: 1960, y: 560, scale: 0.98, rotateX: 0, rotateY: -14, opacity: 1 }],
    [3090, { x: 1530, y: 548, scale: 0.98, rotateX: 0, rotateY: 0, opacity: 1 }, camera],
    [FUTURE_AT, { x: 1530, y: 548, scale: 0.98, rotateX: 0, rotateY: 0, opacity: 1 }, easeInOut],
    [FUTURE_AT + 60, { x: 1530, y: 600, scale: 0.86, rotateX: 0, rotateY: 0, opacity: 0 }, easeInOut],
  ]);
}

const robotics = opp("research-robotics");
const before = matchOpportunity(demoUser, robotics.opportunity);
const after = matchOpportunity(profileAfterImport(), robotics.opportunity);

export const S6Profile = () => {
  const g = useCurrentFrame() + S6_FROM;
  const hitsList = hits();
  const pose = phonePose(g);

  const paperIn = progress(g, 3026, 60, camera);
  const paperOut = progress(g, FUTURE_AT, 44, easeInOut);
  const paperX = mix(760, PAPER.x, paperIn) - paperOut * 200;
  const paperY = PAPER.y + (1 - paperIn) * 120 + Math.sin(g / 70) * 3;
  const paperTilt = mix(10, 0, paperIn);

  const FOUND_AT = FLY_AT + 40;
  const screen =
    g < FOUND_AT ? "screens/light-preferences.png" : g < TAP_ADD + 16 ? "screens/light-resume-found.png" : "screens/light-preferences-after.png";
  const prevScreen = g < FOUND_AT ? null : g < TAP_ADD + 16 ? "screens/light-preferences.png" : "screens/light-resume-found.png";
  const swapAt = g < TAP_ADD + 16 ? FOUND_AT : TAP_ADD + 16;
  const swap = progress(g, swapAt, 12, easeOut);

  const tap = g >= TAP_ADD - 8 && g < TAP_ADD + 20 ? progress(g, TAP_ADD - 8, 28, easeOut) : -1;

  // Paper coordinates to film coordinates (the paper is drawn centred at paperX, paperY).
  const paperToFilm = (x: number, y: number) => ({ x: paperX + (x - PW / 2) * PAPER.scale, y: paperY + (y - PH / 2) * PAPER.scale });

  // The card whose score moves with the profile.
  const cardIn = progress(g, FUTURE_AT + 20, 50, camera);
  const scoreRoll = progress(g, FUTURE_AT + 68, 40, easeInOut);
  const shownScore = Math.round(mix(before.score, after.score, scoreRoll));
  const reasonSwap = progress(g, FUTURE_AT + 64, 30, easeInOut);

  const sceneOut = progress(g, 3566, 30, easeIn);

  return (
    <FrameOffset.Provider value={S6_FROM}>
      <AbsoluteFill style={{ opacity: 1 - sceneOut }}>
        {/* The resume. */}
        {paperOut < 1 ? (
          <div style={{ position: "absolute", left: paperX - PW / 2, top: paperY - PH / 2, width: PW, height: PH, transform: `perspective(2000px) rotateY(${paperTilt}deg) scale(${PAPER.scale})`, opacity: paperIn * (1 - paperOut) }}>
            <Resume g={g} hitsList={hitsList} />
          </div>
        ) : null}

        {/* The phone: Preferences, then what the import found, then the form after "Add 8 to the form". */}
        {pose.opacity > 0 ? (
          <Phone pose={pose} style={{ opacity: pose.opacity }}>
            {prevScreen ? <Img src={staticFile(prevScreen)} style={{ position: "absolute", inset: 0, width: 402, height: 874 }} /> : null}
            <Img src={staticFile(screen)} style={{ position: "absolute", inset: 0, width: 402, height: 874, opacity: prevScreen ? swap : 1 }} />
            {tap >= 0 ? <div style={{ position: "absolute", left: 201 - 30 - tap * 30, top: 675 - 30 - tap * 30, width: 60 + tap * 60, height: 60 + tap * 60, borderRadius: 99, background: "rgb(255 255 255 / 0.35)", opacity: 1 - tap }} /> : null}
          </Phone>
        ) : null}

        {/* Finds lift off the page and land where the app lists them. */}
        {hitsList.map((h, i) => {
          const rect = tagRects.find((t) => t.text === h.tag)!;
          const land = FLY_AT + i * 4 + 52;
          const t = progress(g, FLY_AT + i * 4, 52, camera);
          if (t <= 0 || g > land + 8) return null;
          const from = paperToFilm(h.x + h.w / 2, h.y + h.h / 2);
          const to = screenToFilm(pose, rect.x + rect.w / 2, rect.y + rect.h / 2);
          const arc = Math.sin(Math.PI * t) * (-90 - i * 8);
          const x = mix(from.x, to.x, t);
          const y = mix(from.y, to.y, t) + arc;
          const s = mix(1.5, pose.scale, t);
          // Each tag hands over to the same tag in the app's screen as it lands.
          const fade = 1 - progress(g, land, 8, easeOut);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: Math.min(1, t * 4) * fade }}>
              <span style={{ display: "inline-block", borderRadius: 999, border: `1px solid ${C.navy}`, background: C.navy, color: "#fff", padding: "2px 10px", fontSize: 12, lineHeight: "16px", fontWeight: 500, fontFamily: FONT, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgb(0 0 0 / 0.35)" }}>{h.tag}</span>
            </div>
          );
        })}

        {/* The three lines, stacked on the left. */}
        <div style={{ position: "absolute", left: 120, top: 0, height: 1080, display: "flex", alignItems: "center", opacity: 1 - progress(g, FUTURE_AT - 4, 30, easeInOut) }}>
          <div>
            <Words text="Your experience." at={3046} size={64} align="left" color={g > FLY_AT ? C.darkMuted : C.ice} />
            <Words text="Your interests." at={FLY_AT} size={64} align="left" color={g > TAP_ADD + 10 ? C.darkMuted : C.ice} style={{ marginTop: 10 }} />
            <div style={{ fontFamily: FONT, fontSize: 21, color: C.darkMuted, marginTop: 30, maxWidth: 380, lineHeight: 1.45, opacity: progress(g, 3100, 30) }}>
              Resume import reads your PDF in the browser and picks out the skills and topics listings use.
            </div>
          </div>
        </div>

        {/* Your future: the same listing, scored against the updated profile. */}
        {cardIn > 0 ? (
          <>
            <div style={{ position: "absolute", left: 150, top: 0, height: 1080, display: "flex", alignItems: "center" }}>
              <div>
                <Words text="Your future." at={FUTURE_AT + 24} out={3560} size={96} align="left" />
                <div style={{ fontFamily: FONT, fontSize: 24, color: C.darkMuted, marginTop: 20, maxWidth: 520, lineHeight: 1.4, opacity: progress(g, FUTURE_AT + 70, 30) }}>
                  The same listing, scored again with what the import added.
                </div>
              </div>
            </div>
            <div style={{ position: "absolute", left: 1240 - 185, top: 560 - 247 + (1 - cardIn) * 80, width: 370, height: 494, transform: `scale(${1.62})`, opacity: cardIn, filter: "drop-shadow(0 50px 70px rgb(0 0 0 / 0.55))" }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <DeckCard
                  item={{ ...robotics, match: before }}
                  slots={{ scoreSlot: <ScoreRoll score={shownScore} pulse={progress(g, FUTURE_AT + 108, 8) * (1 - progress(g, FUTURE_AT + 116, 30))} />, reasonOpacity: () => 1 - reasonSwap }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, opacity: reasonSwap > 0 ? 1 : 0 }}>
                <DeckCard
                  item={{ ...robotics, match: after }}
                  slots={{ scoreSlot: <ScoreRoll score={shownScore} pulse={progress(g, FUTURE_AT + 108, 8) * (1 - progress(g, FUTURE_AT + 116, 30))} />, reasonOpacity: () => reasonSwap }}
                />
              </div>
            </div>
          </>
        ) : null}
        <span style={{ display: "none" }}>{resumeFindings.skills.length + clamp01(springProgress(g, 0))}</span>
      </AbsoluteFill>
    </FrameOffset.Provider>
  );
};

function ScoreRoll({ score, pulse }: { score: number; pulse: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 2, color: C.navy, transform: `scale(${1 + pulse * 0.25})`, transformOrigin: "right bottom" }}>
      <span style={{ ...display, fontSize: 28, fontVariantNumeric: "tabular-nums", textShadow: pulse > 0 ? `0 0 ${18 * pulse}px rgb(23 132 90 / 0.6)` : undefined }}>{score}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>/10</span>
    </span>
  );
}

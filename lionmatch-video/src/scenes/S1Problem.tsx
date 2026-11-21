// 0:00 to 0:09.6. A point of light, then the noise of opportunity: listings, posts and messages
// float in an orderly wall, drift apart as the camera moves through them, and finally collapse
// back into the point, which becomes the logo in the next scene.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Words } from "../components/Type";
import { opportunities } from "../lib/appData";
import { camera, clamp01, easeIn, easeInOut, easeOut, mix, progress, rng } from "../lib/ease";
import { C, CATEGORY_COLOR, FONT } from "../theme";

interface Frag {
  source: string;
  dot: string;
  title: string;
  meta: string;
  w: number;
}

const LABEL: Record<string, string> = { internship: "Internship", club: "Club", research: "Research", fellowship: "Fellowship" };
const pick = ["internship-google-swe", "club-space-initiative", "research-nlp", "fellowship-laidlaw", "finance-citadel-discover", "club-data-science-society", "research-amgen", "internship-microsoft-explore", "club-wics", "fellowship-kluge", "research-robotics", "club-consulting", "research-dsi-scholars", "law-hrip", "club-formula-racing", "research-surf", "fellowship-mellon-mays", "club-alpha-partners"];

const listingFrags: Frag[] = pick.map((id) => {
  const o = opportunities.find((x) => x.id === id)!;
  return { source: LABEL[o.category], dot: CATEGORY_COLOR[o.category], title: o.title.replace(/^Join (the )?/, ""), meta: o.organization, w: 0 };
});

const messageFrags: Frag[] = [
  { source: "Group chat", dot: "#7f9bb8", title: "Anyone know a lab that takes first-years?", meta: "12 replies", w: 0 },
  { source: "Email", dot: "#7f9bb8", title: "Re: summer research openings", meta: "3 new messages", w: 0 },
  { source: "Newsletter", dot: "#7f9bb8", title: "Fellowship applications are open", meta: "Undergraduate research", w: 0 },
  { source: "Calendar", dot: "#7f9bb8", title: "Deadline reminder", meta: "Due Friday, 11:59 pm", w: 0 },
  { source: "Inbox", dot: "#7f9bb8", title: "14 unread messages", meta: "Career newsletter, club lists", w: 0 },
  { source: "Job board", dot: "#7f9bb8", title: "New posting in your field", meta: "Saved search", w: 0 },
  { source: "Message", dot: "#7f9bb8", title: "Coffee chat sometime?", meta: "Free Thursday after 3?", w: 0 },
  { source: "Club list", dot: "#7f9bb8", title: "Info session this week", meta: "Bring a friend", w: 0 },
];

// Interleave so neighbours differ.
const FRAGS: Frag[] = [];
for (let i = 0; i < Math.max(listingFrags.length, messageFrags.length); i++) {
  if (listingFrags[i]) FRAGS.push(listingFrags[i]);
  if (i % 2 === 0 && messageFrags[i / 2]) FRAGS.push(messageFrags[i / 2]);
}
FRAGS.push(...messageFrags.slice(Math.ceil(listingFrags.length / 2)));

const COLS = 6;
const r = rng(42);
const LAYOUT = FRAGS.map((f, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const rows = Math.ceil(FRAGS.length / COLS);
  const w = 300 + Math.round(r() * 60);
  // Orderly wall.
  const grid = { x: (col - (COLS - 1) / 2) * 410, y: (row - (rows - 1) / 2) * 182, z: -720 };
  // Scattered cloud, keeping the very centre a little clearer for the type.
  const ang = r() * Math.PI * 2;
  const rad = 520 + r() * 900;
  const scatter = {
    x: Math.cos(ang) * rad * 1.35,
    y: Math.sin(ang) * rad * 0.62,
    z: -1700 + r() * 1900,
    rx: (r() - 0.5) * 26,
    ry: (r() - 0.5) * 40,
    rz: (r() - 0.5) * 14,
  };
  return { ...f, w, grid, scatter, seed: r() };
});

function Fragment({ f }: { f: Frag & { w: number } }) {
  return (
    <div
      style={{
        width: f.w,
        boxSizing: "border-box",
        padding: "16px 18px 15px",
        borderRadius: 18,
        fontFamily: FONT,
        background: "linear-gradient(160deg, rgb(52 88 136 / 0.62), rgb(14 33 62 / 0.70) 60%, rgb(10 24 46 / 0.74))",
        boxShadow: "inset 0 1px 0 rgb(220 236 247 / 0.28), inset 0 0 0 1px rgb(185 217 235 / 0.16), 0 30px 60px -30px rgb(0 0 0 / 0.8)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#9db4ca" }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: f.dot }} />
        {f.source}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.015em", color: "#e3eff7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
      <div style={{ marginTop: 5, fontSize: 15, color: "#8ea6be", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.meta}</div>
    </div>
  );
}

export const POINT = { x: 960, y: 540 };

export function PointOfLight({ intensity, size = 1, x = POINT.x, y = POINT.y }: { intensity: number; size?: number; x?: number; y?: number }) {
  if (intensity <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
      <div style={{ position: "absolute", left: -260 * size, top: -260 * size, width: 520 * size, height: 520 * size, borderRadius: "50%", background: "radial-gradient(circle, rgb(124 192 255 / 0.30) 0%, rgb(60 130 210 / 0.10) 35%, transparent 70%)", opacity: intensity }} />
      <div style={{ position: "absolute", left: -40 * size, top: -40 * size, width: 80 * size, height: 80 * size, borderRadius: "50%", background: "radial-gradient(circle, rgb(220 240 255 / 0.95) 0%, rgb(124 192 255 / 0.5) 30%, transparent 70%)", opacity: intensity }} />
      <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#f4fbff", boxShadow: "0 0 12px 3px rgb(180 220 255 / 0.9)", opacity: intensity }} />
    </div>
  );
}

export const S1Problem = () => {
  const f = useCurrentFrame();

  // The point of light: appears, dims while the wall is up, flares as everything collapses into it.
  const point = progress(f, 8, 50, easeOut) * mix(1, 0.35, progress(f, 90, 60, easeInOut)) + progress(f, 470, 90, easeIn) * 0.9;
  const pointSize = 1 + progress(f, 470, 100, easeIn) * 0.6;

  // Camera: a slow dolly forward through the fragments, with a little drift.
  const camZ = mix(0, 820, progress(f, 120, 400, camera));
  const camRY = mix(-4, 3, progress(f, 60, 480, easeInOut));
  const camRX = mix(2, -1.5, progress(f, 60, 480, easeInOut));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ perspective: 1100, perspectiveOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", left: 960, top: 540, transformStyle: "preserve-3d", transform: `rotateX(${camRX}deg) rotateY(${camRY}deg)` }}>
          {LAYOUT.map((l, i) => {
            const emerge = progress(f, 60 + i * 2.2, 70, easeOut);
            const scatter = progress(f, 165 + (i % 9) * 6 + l.seed * 30, 230, easeInOut);
            const collapse = progress(f, 445 + l.seed * 40, 95, easeIn);
            if (emerge <= 0) return null;
            // From the point to the wall, then out into the cloud, then into the point again.
            let x = mix(0, l.grid.x, emerge);
            let y = mix(0, l.grid.y, emerge);
            let z = mix(-2600, l.grid.z, emerge);
            x = mix(x, l.scatter.x, scatter);
            y = mix(y, l.scatter.y, scatter);
            z = mix(z, l.scatter.z, scatter);
            const rx = l.scatter.rx * scatter * (1 - collapse);
            const ry = l.scatter.ry * scatter * (1 - collapse);
            const rz = l.scatter.rz * scatter * (1 - collapse);
            // Collapse toward the point, which sits far ahead of the camera.
            const targetZ = -1800 - camZ;
            x = mix(x, 0, collapse);
            y = mix(y, 0, collapse);
            z = mix(z, targetZ, collapse);
            const zc = z + camZ; // camera space
            if (zc > 900) return null;
            const s = mix(0.4, 1, emerge) * mix(1, 0.15, collapse);
            // Depth of field: sharp near the focal plane, soft far away and very close.
            const focus = -650;
            const blur = Math.min(9, Math.abs(zc - focus) / 170) * (1 - collapse * 0.6);
            const nearFade = clamp01((900 - zc) / 500);
            const opacity = Math.min(1, emerge * 1.3) * nearFade * (1 - clamp01((collapse - 0.75) / 0.25)) * mix(0.55, 0.9, scatter);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${zc}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
                  opacity,
                  filter: blur > 0.6 ? `blur(${blur.toFixed(1)}px)` : undefined,
                }}
              >
                <Fragment f={l} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* A quiet pool of dark behind the type keeps it readable over the fragments. */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 34% 22% at 50% 50%, rgb(2 7 17 / 0.82), rgb(2 7 17 / 0.4) 55%, transparent 100%)", opacity: progress(f, 40, 60) * (1 - progress(f, 480, 60)) }} />

      <PointOfLight intensity={f < 576 ? point : 0} size={pointSize} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Words text="Opportunities are everywhere." at={48} out={262} size={92} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Words text="Finding the right one" at={300} out={470} size={92} />
        <Words text="shouldn’t be this hard." at={316} out={476} size={92} color={C.darkMuted} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

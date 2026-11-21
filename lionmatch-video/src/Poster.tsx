// The presentation thumbnail: the lockup on the left, the real deck on the right.

import { AbsoluteFill } from "remotion";
import { Backdrop, Grain, Vignette, Waves } from "./components/Atmosphere";
import { Crown } from "./components/Crown";
import { Phone } from "./components/Phone";
import { simulateDeck } from "./lib/appData";
import { DeckScreen } from "./scenes/S2S3RevealProduct";
import { C, FONT } from "./theme";

const CARDS = simulateDeck(0).remaining.slice(0, 4).map((item, depth) => ({ item, depth }));

export const Poster = () => (
  <AbsoluteFill style={{ background: C.night }}>
    <Backdrop
      lights={[
        { x: 66, y: 50, r: 1100, color: "#1d4f8f", alpha: 0.6 },
        { x: 50, y: 110, r: 1500, color: "#2f6fb8", alpha: 0.3 },
      ]}
    />
    <Waves opacity={0.45} />
    <div style={{ position: "absolute", left: 150, top: 0, height: 1080, display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: FONT }}>
      <Crown size={150} color={C.ice} />
      <div style={{ fontSize: 136, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.04, color: C.ice, marginTop: 26 }}>LionMatch</div>
      <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", color: C.darkMuted, marginTop: 22 }}>Your next opportunity. One swipe away.</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: "#6f88a2", marginTop: 44 }}>Internships, research, clubs, fellowships and people at Columbia.</div>
    </div>
    <Phone pose={{ x: 1440, y: 560, scale: 1.0, rotateX: 4, rotateY: -20 }}>
      <DeckScreen cards={CARDS} active="all" count={59} />
    </Phone>
    <Vignette strength={0.55} />
    <Grain opacity={0.05} />
  </AbsoluteFill>
);

// Dev only: the live deck next to the real app screenshot, to check they match.
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AppDeckScreen, ChipId, Chips, DeckCardAt, ToGo } from "../components/AppDeckScreen";
import { deck } from "../lib/appData";

const counts: Record<ChipId, number> = { all: 59, internship: 9, club: 18, research: 15, fellowship: 6, people: 11 };

export const FidelityCheck = () => (
  <AbsoluteFill style={{ background: "#333" }}>
    <div style={{ position: "absolute", left: 40, top: 13, width: 402, height: 874, overflow: "hidden" }}>
      <AppDeckScreen>
        <ToGo count={59} />
        <Chips active="all" counts={counts} />
        {[3, 2, 1, 0].map((d) => (
          <DeckCardAt key={d} state={{ item: deck[d], depth: d }} />
        ))}
      </AppDeckScreen>
    </div>
    <Img src={staticFile("screens/light-deck-0.png")} style={{ position: "absolute", left: 520, top: 13, width: 402, height: 874 }} />
  </AbsoluteFill>
);

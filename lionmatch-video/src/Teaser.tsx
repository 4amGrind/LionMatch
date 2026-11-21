// A 20.8 s cut of the film for social posts: the reveal, the swipes, the end card.
// Each piece is three bars of the film (and its music), with a short dip between them.

import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Film } from "./Film";

const PIECES = [
  { from: 576, len: 432 },
  { from: 1584, len: 432 },
  { from: 4752, len: 384 },
];
export const TEASER_DURATION = PIECES.reduce((t, p) => t + p.len, 0);

function Dip({ len }: { len: number }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, len - 8, len], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#000", opacity: o }} />;
}

export const Teaser = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {PIECES.map((p, i) => {
        const start = at;
        at += p.len;
        return (
          <Sequence key={i} from={start} durationInFrames={p.len}>
            <Sequence from={-p.from}>
              <Film audio={false} />
            </Sequence>
            <Audio
              src={staticFile("audio/score.wav")}
              startFrom={p.from}
              endAt={p.from + p.len}
              volume={(f) => interpolate(f, [0, 10, p.len - 14, p.len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
            <Dip len={p.len} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

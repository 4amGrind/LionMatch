// The whole film. Scenes overlap by a few frames at each boundary so every transition is continuous;
// each scene draws its own way in and out.

import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette, type Light } from "./components/Atmosphere";
import { easeInOut, mix, progress } from "./lib/ease";
import { S1Problem } from "./scenes/S1Problem";
import { S2S3_FROM, S2S3RevealProduct } from "./scenes/S2S3RevealProduct";
import { S4_FROM, S4_TO, S4Swipe } from "./scenes/S4Swipe";
import { S5_FROM, S5_TO, S5Match } from "./scenes/S5Match";
import { S6_FROM, S6_TO, S6Profile } from "./scenes/S6Profile";
import { S7_FROM, S7_TO, S7Connect } from "./scenes/S7Connect";
import { S8_FROM, S8_TO, S8S9Finale } from "./scenes/S8S9Finale";
import { C } from "./theme";
import { SCENES } from "./timeline";

/** Global light: how much blue light fills the room, scene by scene. */
function lightsAt(f: number): Light[] {
  // Keyframes: [frame, intensity of the centre pool, intensity of the low wash]
  const keys: [number, number, number][] = [
    [0, 0.0, 0.0],
    [120, 0.25, 0.1],
    [560, 0.15, 0.05],
    [760, 0.45, 0.2],
    [1050, 0.55, 0.45],
    [1600, 0.5, 0.5],
    [2300, 0.35, 0.3],
    [3000, 0.45, 0.4],
    [4300, 0.5, 0.45],
    [4760, 0.6, 0.3],
    [5100, 0.35, 0.15],
    [5184, 0.0, 0.0],
  ];
  let i = 0;
  while (i < keys.length - 2 && f > keys[i + 1][0]) i++;
  const [f0, a0, b0] = keys[i];
  const [f1, a1, b1] = keys[i + 1];
  const t = progress(f, f0, f1 - f0, easeInOut);
  const centre = mix(a0, a1, t);
  const low = mix(b0, b1, t);
  const drift = Math.sin(f / 240) * 4;
  return [
    { x: 50 + drift, y: 46, r: 1100, color: "#1d4f8f", alpha: centre },
    { x: 50 - drift, y: 105, r: 1500, color: "#2f6fb8", alpha: low * 0.6 },
    { x: 12, y: 0, r: 900, color: "#123764", alpha: low * 0.5 },
  ];
}

export const Film = ({ audio = true }: { audio?: boolean }) => {
  const f = useCurrentFrame();
  const seq = (id: keyof typeof SCENES, pre = 0, post = 0) => ({
    from: SCENES[id][0] - pre,
    durationInFrames: SCENES[id][1] - SCENES[id][0] + pre + post,
  });
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {audio ? <Audio src={staticFile("audio/score.wav")} /> : null}
      <Backdrop lights={lightsAt(f)} />
      <Sequence {...seq("problem", 0, 24)} name="1 Problem">
        <S1Problem />
      </Sequence>
      <Sequence from={S2S3_FROM} durationInFrames={SCENES.product[1] + 24 - S2S3_FROM} name="2-3 Reveal and product">
        <S2S3RevealProduct />
      </Sequence>
      <Sequence from={S4_FROM} durationInFrames={S4_TO - S4_FROM} name="4 Swipe">
        <S4Swipe />
      </Sequence>
      <Sequence from={S5_FROM} durationInFrames={S5_TO - S5_FROM} name="5 Match">
        <S5Match />
      </Sequence>
      <Sequence from={S6_FROM} durationInFrames={S6_TO - S6_FROM} name="6 Profile">
        <S6Profile />
      </Sequence>
      <Sequence from={S7_FROM} durationInFrames={4352 - S7_FROM} name="7 Connect">
        <S7Connect />
      </Sequence>
      <Sequence from={S8_FROM} durationInFrames={S8_TO - S8_FROM} name="8-9 Montage and end">
        <S8S9Finale />
      </Sequence>
      <Vignette strength={0.65} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

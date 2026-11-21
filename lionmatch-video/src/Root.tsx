import { Composition, Still } from "remotion";
import { Film } from "./Film";
import { FidelityCheck } from "./dev/FidelityCheck";
import { Poster } from "./Poster";
import { TEASER_DURATION, Teaser } from "./Teaser";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot = () => (
  <>
    <Composition id="LionMatchFilm" component={Film} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="LionMatchTeaser" component={Teaser} durationInFrames={TEASER_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Still id="Poster" component={Poster} width={WIDTH} height={HEIGHT} />
    <Still id="FidelityCheck" component={FidelityCheck} width={1000} height={900} />
  </>
);

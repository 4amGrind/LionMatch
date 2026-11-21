// The film's clock. 60 fps, and the music runs at 100 BPM, so one beat is exactly 36 frames
// and one bar is 144. Scene boundaries sit on bars so cuts and hits land on the music.
// scripts/make-audio.mjs reads the same numbers (via timeline.json) to place its sound cues.

import timeline from "./timeline.json";

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BEAT = timeline.beat;
export const BAR = BEAT * 4;

export type SceneId = keyof typeof timeline.scenes;
export const SCENES = timeline.scenes;
export const DURATION = timeline.duration;

export const sceneStart = (id: SceneId) => SCENES[id][0];
export const sceneEnd = (id: SceneId) => SCENES[id][1];

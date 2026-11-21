# LionMatch launch film

An 86-second product film for LionMatch, made with [Remotion](https://www.remotion.dev) (React and TypeScript). The film is code: every frame is rendered from the files in `src/`, so it can be edited and re-rendered exactly.

| File | What it is |
| --- | --- |
| `renders/lionmatch-demo.mp4` | The film. 3840 × 2160, 60 fps, H.264, 86.4 s, stereo AAC |
| `renders/lionmatch-demo-muted.mp4` | The same picture with no audio track, for rooms without sound |
| `renders/lionmatch-teaser.mp4` | A 20.8 s cut: logo reveal, swipes, end card |
| `renders/lionmatch-poster.png` | 3840 × 2160 thumbnail |
| `lionmatch-storyboard.md` | Timestamped shot list, what each scene shows, and the sound plan |

`renders/` is gitignored because the videos are large. Share the files directly, or run `npm run render:all` to make them again.

## Setup

Needs Node 22 or newer. From this folder (not the app folder):

```bash
npm install
```

This installs Remotion, Playwright (for screen capture) and a static FFmpeg. Nothing is installed globally.

## Preview and edit

```bash
npm run studio
```

This opens Remotion Studio in the browser, with a timeline you can scrub. Pick `LionMatchFilm`. Edits to `src/` show up live.

## Render

```bash
npm run render:all
```

This writes every deliverable to `renders/`. A 4K render of the film takes a few minutes on an M-series Mac. For a fast 1080p check:

```bash
npm run render:draft
```

To look over many frames at once, `npm run review -- out.png 0:5184:96` writes one contact sheet.

## How it stays true to the app

- **Real screens.** `npm run capture` drives a local copy of the app with Playwright and saves real screens to `public/screens/`. It swipes, opens details, imports a resume and sends a coffee chat. The page scrolls in scenes 7 and 8 are captured one screenshot per film frame. Start the app first (`npm run dev` in the app folder, on http://localhost:3000). Capture uses a clean browser profile, fixes the clock to an afternoon, and hides only the Next.js dev badge and the team's dashed "Owner" notes.
- **Real numbers.** `src/lib/appData.ts` imports the app's own `src/data/*.json`, `match.ts`, `recommend.ts` and `resume.ts`. Scores, reasons, deck order, the swipe re-ranking and the resume findings are computed by that code at render time. Change the app's algorithm or data and the film follows.
- **Live cards.** Deck cards are redrawn (`src/components/DeckCard.tsx`) from the app's `DeckCard.tsx` and `ui.tsx` so they can be animated, on top of a real screenshot of the Swipe tab. The `FidelityCheck` still in Studio shows the redrawn deck next to a real screenshot.
- **Logo.** `public/brand/crown.svg` is traced from the app's `public/brand/crown.png` by `scripts/trace-crown.mjs`.
- **Made-up content is labelled.** Hana Kim is one of the app's sample profiles, and the film says her reply is scripted. The resume says on the page that it is a sample.

## Layout

```
src/
  Film.tsx              The whole film: scenes in sequence, light, grain, audio
  timeline.json         Frame rate, tempo (100 BPM = 36 frames a beat) and scene ranges
  scenes/               One file per scene (S2S3 and S8S9 each cover two)
  components/           Phone, the live deck, deck card, type, crown, confetti, backdrop
  lib/appData.ts        The app's data and algorithms
  lib/spring.ts         The app's Motion springs, solved per frame
  Poster.tsx, Teaser.tsx
scripts/
  capture.mjs           Real screens from the running app
  make-audio.mjs        Composes and mixes the score and effects (original, synthesized)
  render-all.mjs        Every deliverable
  review.mjs            Contact sheets of chosen frames
  trace-crown.mjs, make-grain.mjs, sample-resume.html
public/
  screens/              Captured app screens (about 80 MB, including the scroll frames)
  audio/score.wav       The mixed soundtrack
```

## Changing things

- **Timing.** Each scene file starts with its frame constants. Most cues sit on the beat (multiples of 36 frames from a scene's start), and `scripts/make-audio.mjs` lists its cues with the same frame numbers. If you move a moment, move its sound too and run `npm run audio`.
- **Words.** On-screen text lives in the scene files, mostly in `<Words text="…">`.
- **New app screens.** Re-run `npm run capture` after the app changes. Scenes that use the deck layout read `public/screens/deck-layout.json`, so small layout changes carry over.
- **Sound.** `npm run audio` rebuilds `public/audio/score.wav`: same input, same file. It is set to −16 LUFS with peaks under −1.5 dBTP.

## Credits and licenses

Music and sound effects are synthesized by `scripts/make-audio.mjs` for this film, so there is nothing to license. Instrument Sans (the app's font) is under the SIL Open Font License and is loaded through `@remotion/google-fonts`. The crown and the wave wallpaper come from the LionMatch repo. Remotion is free for individuals and small teams; see remotion.dev/license.

// Renders chosen frames of the film as stills and tiles them into one contact sheet.
//   node scripts/review.mjs out.png 30 110 200 ...     (frames)
//   node scripts/review.mjs out.png 0:5184:48          (start:end:step)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const [out, ...args] = process.argv.slice(2);
const frames = args.flatMap((a) => {
  if (!a.includes(":")) return [Number(a)];
  const [s, e, st] = a.split(":").map(Number);
  const list = [];
  for (let f = s; f < e; f += st) list.push(f);
  return list;
});
const cols = Number(process.env.COLS ?? 4);
const scale = Number(process.env.SCALE ?? 0.5);
const dir = path.resolve("renders/review/tmp");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "LionMatchFilm" });
const files = [];
const chunks = [];
const N = 6;
for (let i = 0; i < frames.length; i += N) chunks.push(frames.slice(i, i + N));
for (const chunk of chunks) {
  await Promise.all(
    chunk.map(async (frame) => {
      const file = path.join(dir, `${String(frame).padStart(5, "0")}.png`);
      await renderStill({ serveUrl, composition, frame, output: file, scale, chromiumOptions: { gl: "angle" } });
      files.push(file);
    }),
  );
}
files.sort();
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ["-i", f]);
const w = Math.round(1920 * scale);
const h = Math.round(1080 * scale);
const labels = files.map((f, i) => `[${i}]drawtext=text='${Number(path.basename(f, ".png"))}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(";");
const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join("|");
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${labels};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`, out]);
console.log("sheet", out, files.length, "frames", rows, "rows");

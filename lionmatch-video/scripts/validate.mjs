// Checks a rendered film: format, duration, frame count, black frames, frozen stretches, loudness.
//   node scripts/validate.mjs renders/lionmatch-demo.mp4
import { execFileSync, spawnSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const file = process.argv[2] ?? "renders/lionmatch-demo.mp4";
const probe = execFileSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,pix_fmt,bit_rate,sample_rate,channels:format=duration,size,bit_rate", "-of", "json", file], { encoding: "utf8" });
const info = JSON.parse(probe);
const v = info.streams.find((s) => s.codec_type === "video");
const a = info.streams.find((s) => s.codec_type === "audio");
console.log(`video   ${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} fps, ${v.nb_frames} frames, ${v.pix_fmt}, ${(Number(v.bit_rate) / 1e6).toFixed(1)} Mb/s`);
console.log(`audio   ${a ? `${a.codec_name} ${a.sample_rate} Hz, ${a.channels} ch` : "none"}`);
console.log(`length  ${Number(info.format.duration).toFixed(3)} s, ${(Number(info.format.size) / 1e6).toFixed(0)} MB`);

const filters = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-vf", "scale=480:-1,blackdetect=d=0.05:pix_th=0.04,freezedetect=n=0.0008:d=1.5", "-an", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const black = filters.split("\n").filter((l) => l.includes("black_start"));
const frozen = filters.split("\n").filter((l) => l.includes("freeze_start") || l.includes("freeze_duration"));
console.log(`black   ${black.length ? black.map((l) => l.replace(/.*black_start/, "black_start")).join(" | ") : "no black stretches"}`);
console.log(`frozen  ${frozen.length ? frozen.map((l) => l.replace(/.*lavfi\./, "")).join(" ") : "no stretch over 1.5 s without motion"}`);
if (a) {
  const loud = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = loud.match(/I:\s+(-?[\d.]+) LUFS/g)?.at(-1);
  const P = loud.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.at(-1);
  console.log(`loud    ${I}, true ${P}`);
}

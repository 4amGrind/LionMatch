// Renders every deliverable into renders/:
//   lionmatch-demo.mp4        the film, 3840 x 2160, 60 fps, H.264, with sound
//   lionmatch-demo-muted.mp4  the same picture with no audio track (stream copy, no re-encode)
//   lionmatch-teaser.mp4      20.8 s cut, 3840 x 2160
//   lionmatch-poster.png      3840 x 2160 thumbnail
// Set SCALE=1 for a quicker 1920 x 1080 pass.
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const scale = process.env.SCALE ?? "2";
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
const remotion = (args) => run("npx", ["remotion", ...args, `--scale=${scale}`]);

remotion(["render", "LionMatchFilm", "renders/lionmatch-demo.mp4"]);
run(ffmpeg, ["-y", "-loglevel", "error", "-i", "renders/lionmatch-demo.mp4", "-map", "0:v", "-c:v", "copy", "-movflags", "+faststart", "renders/lionmatch-demo-muted.mp4"]);
remotion(["still", "Poster", "renders/lionmatch-poster.png"]);
remotion(["render", "LionMatchTeaser", "renders/lionmatch-teaser.mp4"]);
console.log("All deliverables are in renders/.");

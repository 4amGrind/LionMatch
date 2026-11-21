// Traces the app's crown logo (public/brand/crown.png from the app repo) into a vector path,
// so it stays sharp at 4K. The shape is the repo asset; only the format changes.
import potrace from "potrace";
import fs from "node:fs";
potrace.trace("public/brand/crown.png", { threshold: 160, turdSize: 4, optTolerance: 0.2, color: "#000", background: "transparent" }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync("public/brand/crown.svg", svg);
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");
  fs.writeFileSync("src/brand/crownPath.ts", `// Traced from public/brand/crown.png by scripts/trace-crown.mjs. 300 x 300 viewBox.\nexport const CROWN_PATH = ${JSON.stringify(d)};\n`);
  console.log("ok", d.length);
});

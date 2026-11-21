// The app icon: the Columbia crown on Columbia blue. Shared by icon.tsx (browser tab and home screen)
// and apple-icon.tsx (iPhone home screen). Drawn as a PNG by Next at build time.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Read once when the module loads, not on every request.
const crown = await readFile(join(process.cwd(), "public/brand/crown.png"));
const crownSrc = `data:image/png;base64,${crown.toString("base64")}`;

export function crownIcon(size: number, { rounded }: { rounded: boolean }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b9d9eb",
          // The iPhone rounds the corners itself, so its icon stays square.
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <img src={crownSrc} width={size * 0.78} height={size * 0.78} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

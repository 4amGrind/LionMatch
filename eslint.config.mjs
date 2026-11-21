import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The pdf.js worker is minified vendor code, copied in on install by
    // scripts/copy-pdf-worker.mjs. Not ours to lint.
    "public/pdf.worker.min.mjs",
    // The launch film is its own Remotion project with its own config.
    "lionmatch-video/**",
  ]),
]);

export default eslintConfig;

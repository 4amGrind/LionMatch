// Puts the pdf.js worker where the browser can fetch it. OWNER: Jun.
//
// Reading a PDF in the browser needs pdf.js to start a worker, and the worker
// has to be a real file at a real URL. Bundlers each have their own way of
// resolving one out of node_modules, and none of them is worth the trouble, so
// we copy the file into public/ on install and point pdf.js at "/<name>".
//
// Runs from "postinstall", so teammates get it from `npm install` alone.
// The copy is generated, so it is gitignored. See src/lib/readDocument.ts.

import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const WORKER = "pdf.worker.min.mjs";

async function main() {
  const require = createRequire(import.meta.url);

  let source;
  try {
    source = join(dirname(require.resolve("pdfjs-dist/package.json")), "build", WORKER);
  } catch {
    // Dependencies are not installed yet, or pdfjs-dist was dropped on purpose.
    // Either way this is not a reason to fail the install.
    console.warn(`[copy-pdf-worker] pdfjs-dist not found. Skipping. PDF import will not work.`);
    return;
  }

  const target = join(process.cwd(), "public", WORKER);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`[copy-pdf-worker] public/${WORKER}`);
}

main().catch((error) => {
  // A missing worker costs you PDF import, not the whole app. Never fail install.
  console.warn(`[copy-pdf-worker] Could not copy the worker: ${error.message}`);
});

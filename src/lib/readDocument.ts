"use client";

// Turning a file into plain text, in the browser. OWNER: Jun.
//
// Nothing is uploaded. The file is read in the tab, the text is scanned by
// readResume(), and then both are dropped. A resume is a pile of personal
// detail we have no reason to keep, and no server here is worth trusting with
// one while there is still no login.
//
// pdf.js is loaded only when someone actually picks a PDF, so the 1MB of it
// stays out of everyone else's page. Its worker is served from /public; see
// scripts/copy-pdf-worker.mjs for why it lives there.

/** What the file picker offers. */
export const ACCEPTED_FILE_TYPES = ".pdf,.txt,.md,.markdown";

/** Big enough for any resume. A 20MB PDF is a scanned book, not a CV. */
const MAX_BYTES = 10 * 1024 * 1024;

/** Enough for a long CV. Stops a 400-page PDF from locking up the tab. */
const MAX_PAGES = 15;

export class DocumentReadError extends Error {}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    // The whole file is already in hand, so there is nothing to go and fetch.
    disableAutoFetch: true,
  });

  const pdf = await task.promise;
  try {
    const pages: string[] = [];
    const count = Math.min(pdf.numPages, MAX_PAGES);
    for (let number = 1; number <= count; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      // Text comes back as scattered runs. Joining with spaces is enough:
      // we are looking for words, not rebuilding the layout.
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return pages.join("\n");
  } finally {
    // Shuts down the worker too, so a long session does not stack them up.
    await task.destroy();
  }
}

/**
 * The text of a resume, LinkedIn PDF export, or plain text file.
 * Throws DocumentReadError with something worth showing the person.
 */
export async function readDocument(file: File): Promise<string> {
  if (file.size === 0) throw new DocumentReadError("That file is empty.");
  if (file.size > MAX_BYTES) throw new DocumentReadError("That file is over 10MB. Try exporting it again.");

  if (!isPdf(file)) {
    try {
      return await file.text();
    } catch {
      throw new DocumentReadError("Could not read that file.");
    }
  }

  let text: string;
  try {
    text = await readPdf(file);
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new DocumentReadError("That PDF is password protected.");
    }
    throw new DocumentReadError("Could not read that PDF. You can paste the text instead.");
  }

  // A scanned resume is a picture of words, and pdf.js finds nothing in it.
  if (text.trim().length < 20) {
    throw new DocumentReadError(
      "That PDF has no text in it, so it is probably a scan. You can paste the text instead.",
    );
  }
  return text;
}

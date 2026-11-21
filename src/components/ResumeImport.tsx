"use client";

// Fill in Preferences from a resume. OWNER: Jun.
// Paste the text or pick a .txt file. Nothing is uploaded: the text is read in the
// browser, matched against words the app already knows, and offered back as additions
// to the form. The person still presses Save, so they can drop anything wrong first.

import { useState } from "react";
import { readResume, type ResumeFindings, type Vocabulary } from "@/lib/resume";
import { Card } from "./ui";

/** Longer than any resume, short enough that a stray giant paste cannot hang the page. */
const MAX_LENGTH = 20000;

export default function ResumeImport({
  vocabulary,
  onImport,
}: {
  vocabulary: Vocabulary;
  onImport: (findings: ResumeFindings) => void;
}) {
  const [text, setText] = useState("");
  const [found, setFound] = useState<ResumeFindings | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function read(source: string) {
    const findings = readResume(source.slice(0, MAX_LENGTH), vocabulary);
    const count = findings.skills.length + findings.interests.length + (findings.major ? 1 : 0);
    setFound(count > 0 ? findings : null);
    setNote(count > 0 ? null : "Nothing we recognise yet. Add skills and interests by hand above.");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setNote("Pick a .txt file, or open your PDF, copy the text, and paste it here.");
      return;
    }
    const contents = (await file.text()).slice(0, MAX_LENGTH);
    setText(contents);
    read(contents);
  }

  return (
    <Card className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ct-muted">Import from your resume</h2>
      <p className="text-xs text-ct-muted">
        Paste your resume and we will pick out the skills, interests, and major the match score knows about. It stays on
        your phone.
      </p>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value.slice(0, MAX_LENGTH));
          setFound(null);
          setNote(null);
        }}
        rows={4}
        placeholder="Paste your resume text"
        aria-label="Resume text"
        className="w-full rounded-xl border border-ct-line bg-ct-card px-4 py-3 text-sm leading-relaxed text-ct-ink placeholder:text-ct-muted"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => read(text)}
          disabled={!text.trim()}
          className="flex-1 rounded-xl bg-ct-navy px-4 py-2.5 text-sm font-semibold text-ct-on-navy transition-opacity disabled:opacity-40"
        >
          Find skills
        </button>
        <label className="cursor-pointer rounded-xl border border-ct-line px-3.5 py-2.5 text-sm font-medium text-ct-ink hover:bg-ct-blue-deep">
          Choose file
          <input
            type="file"
            accept=".txt,.md,text/plain"
            className="sr-only"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {note ? (
        <p role="status" className="text-xs text-ct-muted">
          {note}
        </p>
      ) : null}

      {found ? (
        <div role="status" className="space-y-2 rounded-xl border border-ct-line p-3">
          {found.major ? (
            <p className="text-sm text-ct-ink">
              Major: <span className="font-semibold">{found.major}</span>
            </p>
          ) : null}
          {found.skills.length > 0 ? <Found label="Skills" items={found.skills} /> : null}
          {found.interests.length > 0 ? <Found label="Interests" items={found.interests} /> : null}
          <button
            type="button"
            onClick={() => {
              onImport(found);
              setFound(null);
              setNote("Added to the form. Check it, then save.");
            }}
            className="w-full rounded-xl border border-ct-navy px-4 py-2.5 text-sm font-semibold text-ct-navy hover:bg-ct-blue-deep"
          >
            Add these to my preferences
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function Found({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs text-ct-muted">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-full border border-ct-navy/15 px-2.5 py-0.5 text-xs font-medium text-ct-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

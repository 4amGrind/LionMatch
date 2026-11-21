"use client";

// Filling in preferences from a resume. OWNER: Jun.
//
// Takes a PDF, a text file, or pasted text, scans it for the skills and topics
// the match score knows about (src/lib/resume.ts), and shows everything it
// found so you can drop what you do not want before any of it is kept.
//
// Nothing is uploaded and nothing is saved here. The text is read in the tab
// and thrown away; tapping "Add" hands the picks to the form above, and the
// usual Save button is still what writes them.
//
// LinkedIn: there is no honest way to read someone's profile off the site. It
// needs a login, the terms say not to, and it blocks you anyway. The export
// LinkedIn gives you is a PDF, so it comes through this same door.

import { motion } from "motion/react";
import { useRef, useState } from "react";
import { ACCEPTED_FILE_TYPES, DocumentReadError, readDocument } from "@/lib/readDocument";
import type { Preferences } from "@/lib/preferences";
import { hasFindings, readResume, type ResumeFindings, type Vocabulary } from "@/lib/resume";
import { Card } from "./ui";

export interface ResumeImportProps {
  vocabulary: Vocabulary;
  /** What the form already has, so we only offer what is new. */
  current: Preferences;
  onApply: (picked: { skills: string[]; interests: string[]; major: string | null }) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "error"; message: string }
  | { kind: "done"; findings: ResumeFindings; known: number };

export default function ResumeImport({ vocabulary, current, onApply }: ResumeImportProps) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [picked, setPicked] = useState<{ skills: Set<string>; interests: Set<string>; major: boolean }>({
    skills: new Set(),
    interests: new Set(),
    major: false,
  });
  const fileInput = useRef<HTMLInputElement>(null);

  function scan(text: string) {
    const found = readResume(text, vocabulary);

    // Only offer what is not already on the list.
    const haveSkills = new Set(current.skills.map((s) => s.toLowerCase()));
    const haveInterests = new Set(current.interests.map((s) => s.toLowerCase()));
    const skills = found.skills.filter((s) => !haveSkills.has(s.toLowerCase()));
    const interests = found.interests.filter((s) => !haveInterests.has(s.toLowerCase()));
    const major = found.major && found.major !== current.major ? found.major : null;
    const known = found.skills.length + found.interests.length - skills.length - interests.length;

    setPicked({ skills: new Set(skills), interests: new Set(interests), major: major !== null });
    setPhase({ kind: "done", findings: { skills, interests, major }, known });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPhase({ kind: "reading" });
    try {
      scan(await readDocument(file));
    } catch (error) {
      setPhase({
        kind: "error",
        message: error instanceof DocumentReadError ? error.message : "Could not read that file.",
      });
    } finally {
      // Let the same file be picked again after a failure.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function toggle(group: "skills" | "interests", value: string) {
    setPicked((p) => {
      const next = new Set(p[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...p, [group]: next };
    });
  }

  function apply() {
    if (phase.kind !== "done") return;
    onApply({
      skills: phase.findings.skills.filter((s) => picked.skills.has(s)),
      interests: phase.findings.interests.filter((s) => picked.interests.has(s)),
      major: picked.major ? phase.findings.major : null,
    });
    setPhase({ kind: "idle" });
    setPaste("");
  }

  const pickedCount = picked.skills.size + picked.interests.size + (picked.major ? 1 : 0);

  if (!open) {
    return (
      <Card>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-ct-navy">Import from your resume</span>
            <span className="block text-xs text-ct-muted">
              Or a LinkedIn PDF. Fills in the fields below in one go.
            </span>
          </span>
          <span aria-hidden="true" className="text-lg leading-none text-ct-muted">
            +
          </span>
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ct-navy">Import from your resume</h2>
          <p className="text-xs text-ct-muted">
            Read in your browser. The file is never uploaded and nothing is kept.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPhase({ kind: "idle" });
          }}
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-ct-muted hover:bg-ct-blue-deep"
        >
          Close
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={phase.kind === "reading"}
          onClick={() => fileInput.current?.click()}
          className="rounded-xl bg-ct-navy px-4 py-2.5 text-sm font-semibold text-ct-on-navy disabled:opacity-50"
        >
          {phase.kind === "reading" ? "Reading…" : "Choose a PDF"}
        </motion.button>
        <button
          type="button"
          disabled={!paste.trim() || phase.kind === "reading"}
          onClick={() => scan(paste)}
          className="rounded-xl border border-ct-line px-3.5 py-2.5 text-sm font-medium text-ct-ink transition-opacity disabled:opacity-40"
        >
          Scan pasted text
        </button>
      </div>

      <label className="block">
        <span className="sr-only">Paste your resume text</span>
        <textarea
          value={paste}
          rows={3}
          onChange={(event) => setPaste(event.target.value)}
          placeholder="…or paste your resume text here"
          className="w-full resize-y rounded-xl border border-ct-line bg-ct-card px-4 py-2.5 text-sm text-ct-ink placeholder:text-ct-muted"
        />
      </label>

      <p className="text-xs text-ct-muted">
        For LinkedIn: open your profile, press More, then Save to PDF, and choose that file. The site
        itself cannot be read without your login, and its terms say not to.
      </p>

      {phase.kind === "error" ? (
        <p role="status" className="text-xs text-ct-pass">
          {phase.message}
        </p>
      ) : null}

      {phase.kind === "done" ? (
        hasFindings(phase.findings) ? (
          <div className="space-y-2.5 border-t border-ct-navy/10 pt-3">
            <p className="text-xs text-ct-muted">
              Tap anything you do not want.
              {phase.known > 0 ? ` ${phase.known} more were already on your list.` : ""}
            </p>

            {phase.findings.major ? (
              <Found
                label="Major"
                items={[phase.findings.major]}
                isPicked={() => picked.major}
                onToggle={() => setPicked((p) => ({ ...p, major: !p.major }))}
              />
            ) : null}

            {phase.findings.skills.length > 0 ? (
              <Found
                label="Skills"
                items={phase.findings.skills}
                isPicked={(item) => picked.skills.has(item)}
                onToggle={(item) => toggle("skills", item)}
              />
            ) : null}

            {phase.findings.interests.length > 0 ? (
              <Found
                label="Interests"
                items={phase.findings.interests}
                isPicked={(item) => picked.interests.has(item)}
                onToggle={(item) => toggle("interests", item)}
              />
            ) : null}

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={pickedCount === 0}
              onClick={apply}
              className="w-full rounded-xl bg-ct-navy px-4 py-2.5 text-sm font-semibold text-ct-on-navy transition-opacity disabled:opacity-40"
            >
              {pickedCount === 0 ? "Nothing selected" : `Add ${pickedCount} to the form`}
            </motion.button>
          </div>
        ) : (
          <p role="status" className="border-t border-ct-navy/10 pt-3 text-xs text-ct-muted">
            {phase.known > 0
              ? `Everything it recognised is already on your list.`
              : `Nothing in there matched the skills or topics on the listings. Add what you want by hand below.`}
          </p>
        )
      ) : null}
    </Card>
  );
}

interface FoundProps {
  label: string;
  items: string[];
  isPicked: (item: string) => boolean;
  onToggle: (item: string) => void;
}

function Found({ label, items, isPicked, onToggle }: FoundProps) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold text-ct-muted">{label}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const on = isPicked(item);
          return (
            <li key={item}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(item)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-ct-navy bg-ct-navy text-ct-on-navy"
                    : "border-ct-line bg-ct-card text-ct-muted line-through"
                }`}
              >
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

// The form behind the Preferences screen. OWNER: Jun.
// Everything here feeds matchOpportunity and matchPerson in src/lib/match.ts:
// categories decide what shows up in the deck, skills and interests decide the
// score, and the major is worth a point when a listing names it.
//
// Saving writes a cookie and then asks Next to re-render the server components,
// which is what re-ranks the deck and Explore. See src/lib/preferences.ts.

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MAX_ITEMS,
  MAX_ITEM_LENGTH,
  cleanList,
  preferencesFromProfile,
  samePreferences,
  type Preferences,
} from "@/lib/preferences";
import type { Vocabulary } from "@/lib/resume";
import { usePreferences } from "@/lib/usePreferences";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Profile } from "@/lib/types";
import ResumeImport from "./ResumeImport";
import { Card, PageTitle } from "./ui";

type Status = { kind: "saved" | "reset" | "error"; message: string } | null;

export interface PreferencesFormProps {
  /** The profile the rest of the app is using right now, preferences included. */
  user: Profile;
  /** The untouched sample profile, so "Start over" has something to go back to. */
  sample: Profile;
  /** Common skills across the listings, offered as one-tap additions. */
  skillSuggestions: string[];
  /** Common topics across the listings. */
  interestSuggestions: string[];
  /** Everything the listings mention, which is all the resume import can look for. */
  vocabulary: Vocabulary;
}

export default function PreferencesForm({
  user,
  sample,
  skillSuggestions,
  interestSuggestions,
  vocabulary,
}: PreferencesFormProps) {
  const router = useRouter();
  const { save, clear } = usePreferences();
  const [draft, setDraft] = useState<Preferences>(() => preferencesFromProfile(user));
  const [status, setStatus] = useState<Status>(null);

  const saved = preferencesFromProfile(user);
  const dirty = !samePreferences(draft, saved);
  const usingSample = samePreferences(saved, preferencesFromProfile(sample));

  function update(changes: Partial<Preferences>) {
    setDraft((current) => ({ ...current, ...changes }));
    setStatus(null);
  }

  function toggleCategory(category: Category) {
    const has = draft.looking_for.includes(category);
    // Keep the stored order the same as CATEGORIES so the saved value is predictable.
    update({
      looking_for: has
        ? draft.looking_for.filter((c) => c !== category)
        : CATEGORIES.filter((c) => c === category || draft.looking_for.includes(c)),
    });
  }

  function onSave() {
    const next: Preferences = {
      looking_for: draft.looking_for,
      skills: cleanList(draft.skills),
      interests: cleanList(draft.interests),
      major: draft.major?.trim() ? draft.major.trim() : null,
    };
    if (!save(next)) {
      setStatus({ kind: "error", message: "Your browser would not keep this. Try fewer skills and interests." });
      return;
    }
    setDraft(next);
    setStatus({ kind: "saved", message: "Saved. Your deck and Explore are re-ranked." });
    router.refresh();
  }

  function onReset() {
    if (!clear()) {
      setStatus({ kind: "error", message: "Could not clear your preferences. Check that cookies are on." });
      return;
    }
    setDraft(preferencesFromProfile(sample));
    setStatus({ kind: "reset", message: "Back to the sample profile." });
    router.refresh();
  }

  return (
    <>
      <PageTitle title="Preferences" subtitle="What the match score uses about you." />

      <div className="space-y-3">
        <ResumeImport
          vocabulary={vocabulary}
          current={draft}
          onApply={(picked) =>
            update({
              // cleanList drops the repeats, so importing twice is harmless.
              skills: cleanList([...draft.skills, ...picked.skills]),
              interests: cleanList([...draft.interests, ...picked.interests]),
              major: picked.major ?? draft.major,
            })
          }
        />

        <Card className="space-y-2">
          <FieldLabel>Looking for</FieldLabel>
          <p className="text-xs text-ct-muted">
            Picking a kind of listing adds a point to everything in it. Pick none to see everything evenly.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5" role="group" aria-label="Kinds of listing you want">
            {CATEGORIES.map((category) => {
              const active = draft.looking_for.includes(category);
              return (
                <motion.button
                  key={category}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={active}
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-ct-navy bg-ct-navy text-ct-on-navy"
                      : "border-ct-line bg-ct-card text-ct-ink hover:bg-ct-blue-deep"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </motion.button>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-2">
          <label htmlFor="major" className="block">
            <FieldLabel>Major</FieldLabel>
          </label>
          <input
            id="major"
            type="text"
            value={draft.major ?? ""}
            maxLength={MAX_ITEM_LENGTH}
            onChange={(event) => update({ major: event.target.value })}
            placeholder="Computer Science"
            className="w-full rounded-xl border border-ct-line bg-ct-card px-4 py-3 text-sm text-ct-ink placeholder:text-ct-muted"
          />
          <p className="text-xs text-ct-muted">
            Worth a point and a half when a listing names your major. Listings open to everyone score for everyone.
          </p>
        </Card>

        <ChipField
          label="Skills"
          hint="The biggest part of the score. Shared skills are worth up to three points."
          items={draft.skills}
          suggestions={skillSuggestions}
          placeholder="Python"
          onChange={(skills) => update({ skills })}
        />

        <ChipField
          label="Interests"
          hint="Matched against the topic tags on each listing, for up to two points."
          items={draft.interests}
          suggestions={interestSuggestions}
          placeholder="robotics"
          onChange={(interests) => update({ interests })}
        />
      </div>

      {/* The bar stays put at the bottom of the scroller so Save is always in reach. */}
      <div className="sticky bottom-20 z-10 mt-4">
        <div className="glass-surface flex items-center gap-2 rounded-[22px] p-2.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onSave}
            disabled={!dirty}
            className="flex-1 rounded-xl bg-ct-navy px-4 py-3 text-sm font-semibold text-ct-on-navy transition-opacity disabled:opacity-40"
          >
            {dirty ? "Save preferences" : "Saved"}
          </motion.button>
          <button
            type="button"
            onClick={onReset}
            disabled={usingSample && !dirty}
            className="rounded-xl border border-ct-line px-3.5 py-3 text-sm font-medium text-ct-ink transition-opacity disabled:opacity-40"
          >
            Start over
          </button>
        </div>
        {status ? (
          <p
            role="status"
            className={`mt-2 px-1 text-xs ${status.kind === "error" ? "text-ct-pass" : "text-ct-muted"}`}
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-medium uppercase tracking-wide text-ct-muted">{children}</h2>;
}

interface ChipFieldProps {
  label: string;
  hint: string;
  items: string[];
  suggestions: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}

/** A list you add to by typing, and remove from by tapping a chip. */
function ChipField({ label, hint, items, suggestions, placeholder, onChange }: ChipFieldProps) {
  const [entry, setEntry] = useState("");
  const inputId = `chip-${label.toLowerCase()}`;
  const full = items.length >= MAX_ITEMS;

  // Only suggest what is not already on the list.
  const chosen = new Set(items.map((item) => item.toLowerCase()));
  const open = suggestions.filter((s) => !chosen.has(s.toLowerCase())).slice(0, 8);

  function add(value: string) {
    const next = cleanList([...items, value]);
    if (next.length !== items.length) onChange(next);
    setEntry("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Enter or comma adds. Backspace on an empty box takes the last one off.
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (entry.trim()) add(entry);
    } else if (event.key === "Backspace" && !entry && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  }

  return (
    <Card className="space-y-2">
      <label htmlFor={inputId} className="block">
        <FieldLabel>{label}</FieldLabel>
      </label>

      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={`Remove ${item}`}
                className="flex items-center gap-1 rounded-full border border-ct-navy/15 bg-ct-card py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-ct-ink hover:bg-ct-blue-deep"
              >
                {item}
                <svg viewBox="0 0 16 16" className="size-3 text-ct-muted" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ct-muted">Nothing yet. Add a few and the scores get sharper.</p>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={entry}
          disabled={full}
          maxLength={MAX_ITEM_LENGTH}
          onChange={(event) => setEntry(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={full ? `That is the ${MAX_ITEMS} you get` : placeholder}
          className="min-w-0 flex-1 rounded-xl border border-ct-line bg-ct-card px-4 py-2.5 text-sm text-ct-ink placeholder:text-ct-muted disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => entry.trim() && add(entry)}
          disabled={!entry.trim() || full}
          className="rounded-xl border border-ct-line px-3.5 py-2.5 text-sm font-medium text-ct-ink transition-opacity disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {open.length > 0 && !full ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="text-xs text-ct-muted">Common:</span>
          {open.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="rounded-full border border-dashed border-ct-navy/25 px-2.5 py-0.5 text-xs font-medium text-ct-muted hover:bg-ct-blue-deep hover:text-ct-ink"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-ct-muted">{hint}</p>
    </Card>
  );
}

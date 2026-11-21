"use client";

// A list of short tags you can add to and remove from, like skills or interests.
// Suggestions come from the words already used in the data, because the match score
// only counts a skill or interest when it matches one of those words.

import { useId, useState } from "react";

export default function TagInput({
  label,
  value,
  onChange,
  suggestions,
  max,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  max: number;
  maxLength: number;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase());
  const full = value.length >= max;

  function add(raw: string) {
    const tag = raw.replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (!tag || has(tag) || full) return;
    onChange([...value, tag]);
    setDraft("");
  }

  const query = draft.trim().toLowerCase();
  const shown = suggestions
    .filter((s) => !has(s) && (query === "" || s.toLowerCase().includes(query)))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-wide text-ct-muted">
          {label}
        </label>
        <span className="text-xs tabular-nums text-ct-muted">
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                aria-label={`Remove ${tag}`}
                className="flex items-center gap-1 rounded-full bg-ct-navy py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-ct-on-navy"
              >
                {tag}
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                  <path d="M3 3l6 6M9 3L3 9" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        id={inputId}
        value={draft}
        disabled={full}
        maxLength={maxLength}
        placeholder={full ? "Remove one to add another" : placeholder}
        onChange={(event) => setDraft(event.target.value.replace(",", ""))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        className="w-full rounded-xl border border-ct-line bg-ct-card px-3 py-2.5 text-sm placeholder:text-ct-muted disabled:opacity-60"
      />

      {shown.length > 0 && !full ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Suggested ${label.toLowerCase()}`}>
          {shown.map((s) => (
            <li key={s}>
              <button
                type="button"
                // Keeps the input from losing focus (and adding half-typed text) before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-ct-navy/30 px-2.5 py-0.5 text-xs font-medium text-ct-ink hover:border-ct-navy"
              >
                + {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

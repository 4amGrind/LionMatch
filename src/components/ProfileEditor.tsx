"use client";

// The form that edits a profile. OWNER: Ayan (shared with Jun's Preferences screen).
// `fields="all"` is the Profile screen. `fields="match"` is Preferences, which shows only
// what the match score uses. Saving writes a cookie (see profile-edits.ts), then refreshes the
// page so every score on screen is recomputed from the new profile.

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  CLASS_YEARS,
  LIMITS,
  clearEditsInBrowser,
  readEditsInBrowser,
  saveEditsInBrowser,
  type ProfileEdits,
} from "@/lib/profile-edits";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Profile } from "@/lib/types";
import TagInput from "./TagInput";

const INPUT = "w-full rounded-xl border border-ct-line bg-ct-card px-3 py-2.5 text-sm placeholder:text-ct-muted";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium uppercase tracking-wide text-ct-muted">
        {label}
        {hint ? <span className="font-normal normal-case tracking-normal tabular-nums">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function ProfileEditor({
  user,
  suggestions,
  fields,
  onDone,
}: {
  user: Profile;
  suggestions: { skills: string[]; interests: string[] };
  fields: "all" | "match";
  /** Called after a save or cancel, so the Profile screen can close the form. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: user.full_name,
    headline: user.headline,
    school: user.school ?? "",
    major: user.major ?? "",
    class_year: user.class_year,
    bio: user.bio,
    open_to_chat: user.open_to_chat,
    skills: user.skills,
    interests: user.interests,
    looking_for: user.looking_for,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function toggleCategory(category: Category) {
    const next = form.looking_for.includes(category)
      ? form.looking_for.filter((c) => c !== category)
      : CATEGORIES.filter((c) => c === category || form.looking_for.includes(c));
    set("looking_for", next);
  }

  function save() {
    if (!form.full_name.trim()) {
      setError("Your name cannot be empty.");
      return;
    }
    // Keep edits from other screens, and change only what this form shows.
    const changes: ProfileEdits =
      fields === "all"
        ? { ...form, school: form.school || null, major: form.major || null }
        : { skills: form.skills, interests: form.interests, looking_for: form.looking_for };
    if (!saveEditsInBrowser({ ...readEditsInBrowser(), ...changes })) {
      setError("That is too long to save. Shorten the bio or remove a few tags.");
      return;
    }
    setSaved(true);
    startTransition(() => {
      router.refresh();
      onDone?.();
    });
  }

  function reset() {
    clearEditsInBrowser();
    startTransition(() => {
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {fields === "all" ? (
        <>
          <Field label="Name">
            <input
              value={form.full_name}
              maxLength={LIMITS.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              className={INPUT}
              autoComplete="off"
            />
          </Field>
          <Field label="Headline">
            <input
              value={form.headline}
              maxLength={LIMITS.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="First-year, CS and AI"
              className={INPUT}
            />
          </Field>
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Field label="Major">
              <input
                value={form.major}
                maxLength={LIMITS.major}
                onChange={(e) => set("major", e.target.value)}
                placeholder="Computer Science"
                className={INPUT}
              />
            </Field>
            <Field label="Class of">
              <select
                value={form.class_year ?? ""}
                onChange={(e) => set("class_year", e.target.value ? Number(e.target.value) : null)}
                className={INPUT}
              >
                <option value="">None</option>
                {CLASS_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="School">
            <input
              value={form.school}
              maxLength={LIMITS.school}
              onChange={(e) => set("school", e.target.value)}
              placeholder="Columbia College"
              className={INPUT}
            />
          </Field>
          <Field label="Bio" hint={`${form.bio.length}/${LIMITS.bio}`}>
            <textarea
              value={form.bio}
              maxLength={LIMITS.bio}
              rows={3}
              onChange={(e) => set("bio", e.target.value)}
              className={`${INPUT} leading-relaxed`}
            />
          </Field>
        </>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Looking for</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((category) => {
            const on = form.looking_for.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(category)}
                className={`rounded-xl border py-2.5 text-sm font-semibold ${
                  on ? "border-ct-navy bg-ct-navy text-ct-on-navy" : "border-ct-line bg-ct-card text-ct-navy"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TagInput
        label="Skills"
        value={form.skills}
        onChange={(next) => set("skills", next)}
        suggestions={suggestions.skills}
        max={LIMITS.tags}
        maxLength={LIMITS.tag}
        placeholder="Add a skill, like Python"
      />
      <TagInput
        label="Interests"
        value={form.interests}
        onChange={(next) => set("interests", next)}
        suggestions={suggestions.interests}
        max={LIMITS.tags}
        maxLength={LIMITS.tag}
        placeholder="Add an interest, like robotics"
      />

      {fields === "all" ? (
        <label className="flex items-center gap-3 text-sm text-ct-ink">
          <input
            type="checkbox"
            checked={form.open_to_chat}
            onChange={(e) => set("open_to_chat", e.target.checked)}
            className="size-4 accent-[var(--ct-navy)]"
          />
          Open to coffee chats
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-ct-pass">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-ct-navy py-3 text-sm font-bold text-ct-on-navy disabled:opacity-60"
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="glass-surface rounded-xl px-4 py-3 text-sm font-semibold text-ct-navy">
            Cancel
          </button>
        ) : null}
      </div>
      <button type="button" onClick={reset} className="w-full text-center text-xs font-semibold text-ct-muted hover:text-ct-navy">
        Reset to the demo profile
      </button>
    </form>
  );
}

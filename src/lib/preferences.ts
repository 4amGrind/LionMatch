// What you tell the app about yourself. OWNER: Jun.
// These four fields are the only ones the match score in match.ts reads,
// so this file and that one move together.
//
// Preferences are saved in a cookie rather than localStorage on purpose.
// Scores are worked out on the server (see src/app/page.tsx), so the server
// has to know your preferences before it renders the deck. A cookie rides
// along with the request. localStorage does not, and the deck would come back
// ranked for the sample profile.
//
// When login arrives: read these four columns off the profile row in
// getCurrentUser() and drop the cookie. applyPreferences stays as it is.

import { CATEGORIES, type Category, type Profile } from "./types";

export const PREFERENCES_COOKIE = "ct.preferences.v1";

/** Browsers drop cookies over about 4KB, and the limit counts the name too. */
export const MAX_COOKIE_LENGTH = 3000;
/** Caps so one long paste cannot fill the cookie. */
export const MAX_ITEMS = 20;
export const MAX_ITEM_LENGTH = 40;

export interface Preferences {
  looking_for: Category[];
  skills: string[];
  interests: string[];
  major: string | null;
}

/** Trim, drop blanks, drop repeats ignoring case, and cap the length and the count. */
export function cleanList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const value = item.trim().slice(0, MAX_ITEM_LENGTH);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function cleanCategories(values: unknown): Category[] {
  if (!Array.isArray(values)) return [];
  return CATEGORIES.filter((category) => values.includes(category));
}

function cleanMajor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const major = value.trim().slice(0, MAX_ITEM_LENGTH);
  return major || null;
}

/** The preferences a profile already carries. Where the form starts. */
export function preferencesFromProfile(profile: Profile): Preferences {
  return {
    looking_for: [...profile.looking_for],
    skills: [...profile.skills],
    interests: [...profile.interests],
    major: profile.major,
  };
}

/** A profile with saved preferences laid over it. Every other field is left alone. */
export function applyPreferences(profile: Profile, saved: Preferences | null): Profile {
  if (!saved) return profile;
  return {
    ...profile,
    looking_for: saved.looking_for,
    skills: saved.skills,
    interests: saved.interests,
    major: saved.major,
  };
}

export function samePreferences(a: Preferences, b: Preferences): boolean {
  const sameList = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return (
    a.major === b.major &&
    sameList(a.looking_for, b.looking_for) &&
    sameList(a.skills, b.skills) &&
    sameList(a.interests, b.interests)
  );
}

export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}

/**
 * Read preferences back out of a cookie value.
 * Anyone can edit their own cookie, so nothing in here is trusted:
 * a value that is missing, truncated, or the wrong shape returns null and
 * the app falls back to the sample profile.
 */
export function parsePreferences(raw: string | null | undefined): Preferences | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  return {
    looking_for: cleanCategories(source.looking_for),
    skills: cleanList(source.skills),
    interests: cleanList(source.interests),
    major: cleanMajor(source.major),
  };
}

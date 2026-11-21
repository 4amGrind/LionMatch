// What you tell the app about yourself for matching. OWNER: Jun.
// These four fields are the only ones the match score in match.ts reads,
// so this file and that one move together.
//
// Storage is shared with the Profile screen: both write the same cookie
// (see profile-edits.ts), so changing your skills on either screen changes
// them on both, and getCurrentUser() in data.ts has one place to read from.
// When login arrives, profile-edits.ts swaps the cookie for the `profiles` row
// and nothing here changes.

import { LIMITS, readEditsInBrowser, saveEditsInBrowser, type ProfileEdits } from "./profile-edits";
import type { Category, Profile } from "./types";

export interface Preferences {
  looking_for: Category[];
  skills: string[];
  interests: string[];
  major: string | null;
}

/** The longest a skill, interest, or major can be, and how many skills or interests you get. Same caps as the Profile screen. */
export const MAX_ITEM_LENGTH = LIMITS.tag;
export const MAX_ITEMS = LIMITS.tags;
export const MAX_MAJOR_LENGTH = LIMITS.major;

/** Trim, drop blanks, drop repeats ignoring case, and cap the length and the count. */
export function cleanList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const value = item.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
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

export function samePreferences(a: Preferences, b: Preferences): boolean {
  const sameList = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return (
    (a.major ?? null) === (b.major ?? null) &&
    sameList(a.looking_for, b.looking_for) &&
    sameList(a.skills, b.skills) &&
    sameList(a.interests, b.interests)
  );
}

// --- Browser side -----------------------------------------------------------

/**
 * Save preferences, keeping anything else edited on the Profile screen (name, bio, and so on).
 * Returns false when the browser will not keep it.
 */
export function savePreferencesInBrowser(next: Preferences): boolean {
  return saveEditsInBrowser({ ...readEditsInBrowser(), ...next });
}

/**
 * Go back to the sample profile's preferences, again leaving the Profile screen's edits alone.
 * Returns false when the browser will not keep it.
 */
export function resetPreferencesInBrowser(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { looking_for, skills, interests, major, ...rest }: ProfileEdits = readEditsInBrowser();
  return saveEditsInBrowser(rest);
}

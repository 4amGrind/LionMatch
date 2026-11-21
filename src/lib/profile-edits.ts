// Edits to the demo profile, kept in a cookie until login exists. OWNER: Ayan.
//
// Why a cookie and not localStorage: the pages that show match scores run on the server
// (getCurrentUser() in data.ts), and a server can read a cookie. So one edit here changes the
// score on the deck, Explore, and every detail page, with no other code touching it.
// When login arrives, replace the cookie with an update to the `profiles` row. The form does not change.
//
// The cookie comes from the browser, so everything read from it is checked and trimmed here.

import { CATEGORIES, type Profile } from "./types";

export const PROFILE_COOKIE = "ct_profile";

/** The fields a person can edit. */
export type ProfileEdits = Partial<
  Pick<
    Profile,
    "full_name" | "headline" | "school" | "major" | "class_year" | "bio" | "skills" | "interests" | "looking_for" | "open_to_chat"
  >
>;

export const LIMITS = { full_name: 60, headline: 80, school: 60, major: 60, bio: 280, tag: 28, tags: 12 } as const;
export const CLASS_YEARS = [2026, 2027, 2028, 2029, 2030, 2031] as const;
/** Browsers drop cookies over about 4 KB. Stay under it. */
const MAX_COOKIE_LENGTH = 3800;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function tags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const tag = text(item, LIMITS.tag);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length === LIMITS.tags) break;
  }
  return out;
}

/** Keep only known fields with valid values. Anything else is dropped, never trusted. */
export function sanitizeProfileEdits(raw: unknown): ProfileEdits {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const edits: ProfileEdits = {};

  const name = text(input.full_name, LIMITS.full_name);
  if (name) edits.full_name = name; // A profile always has a name.
  const headline = text(input.headline, LIMITS.headline);
  if (headline !== undefined) edits.headline = headline;
  const bio = text(input.bio, LIMITS.bio);
  if (bio !== undefined) edits.bio = bio;
  if ("school" in input) edits.school = text(input.school, LIMITS.school) || null;
  if ("major" in input) edits.major = text(input.major, LIMITS.major) || null;
  if ("class_year" in input) {
    const year = input.class_year;
    edits.class_year = typeof year === "number" && (CLASS_YEARS as readonly number[]).includes(year) ? year : null;
  }
  const skills = tags(input.skills);
  if (skills) edits.skills = skills;
  const interests = tags(input.interests);
  if (interests) edits.interests = interests;
  if (Array.isArray(input.looking_for)) {
    edits.looking_for = CATEGORIES.filter((category) => (input.looking_for as unknown[]).includes(category));
  }
  if (typeof input.open_to_chat === "boolean") edits.open_to_chat = input.open_to_chat;
  return edits;
}

export function applyProfileEdits(base: Profile, edits: ProfileEdits): Profile {
  return { ...base, ...edits };
}

export function serializeProfileEdits(edits: ProfileEdits): string {
  return encodeURIComponent(JSON.stringify(sanitizeProfileEdits(edits)));
}

/** For the server: the raw cookie value in, safe edits out. A bad or missing cookie means no edits. */
export function parseProfileCookie(value: string | undefined): ProfileEdits {
  if (!value) return {};
  try {
    return sanitizeProfileEdits(JSON.parse(decodeURIComponent(value)));
  } catch {
    return {};
  }
}

// --- Browser side -----------------------------------------------------------

export function readEditsInBrowser(): ProfileEdits {
  if (typeof document === "undefined") return {};
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${PROFILE_COOKIE}=`));
  return parseProfileCookie(match?.slice(PROFILE_COOKIE.length + 1));
}

/** Returns false when the profile is too long to store. */
export function saveEditsInBrowser(edits: ProfileEdits): boolean {
  const value = serializeProfileEdits(edits);
  if (value.length > MAX_COOKIE_LENGTH) return false;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${PROFILE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  return true;
}

export function clearEditsInBrowser() {
  document.cookie = `${PROFILE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

"use client";

// Reading and saving preferences from the browser. OWNER: Jun.
// Same shape as swipes.ts, so the two feel alike: one cached read, one write,
// and a custom event so every component on the page updates together.
//
// The difference is where it is kept. Swipes go to localStorage. Preferences
// go to a cookie, because the server works out the match scores and needs them
// on the request. See the note at the top of preferences.ts.

import { useCallback, useSyncExternalStore } from "react";
import {
  MAX_COOKIE_LENGTH,
  PREFERENCES_COOKIE,
  parsePreferences,
  serializePreferences,
  type Preferences,
} from "./preferences";

const EVENT = "ct:preferences-changed";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

let cachedRaw: string | null = null;
let cachedPreferences: Preferences | null = null;

function readCookie(): string | null {
  const prefix = `${PREFERENCES_COOKIE}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

function readPreferences(): Preferences | null {
  const raw = readCookie();
  if (raw === cachedRaw) return cachedPreferences;
  cachedRaw = raw;
  cachedPreferences = parsePreferences(raw);
  return cachedPreferences;
}

/** Nothing is saved until the browser says otherwise, so the server render stays put. */
function serverSnapshot(): Preferences | null {
  return null;
}

/** Returns false when the value will not fit in a cookie, so the form can say so. */
function writePreferences(next: Preferences | null): boolean {
  if (next === null) {
    document.cookie = `${PREFERENCES_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    const value = serializePreferences(next);
    if (value.length > MAX_COOKIE_LENGTH) return false;
    document.cookie = `${PREFERENCES_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }
  // Read it back rather than trusting the write. Cookies can be turned off.
  cachedRaw = null;
  readPreferences();
  window.dispatchEvent(new Event(EVENT));
  return true;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/**
 * The saved preferences, or null when nothing has been saved and the app is
 * still using the sample profile.
 *
 * save() and clear() return false when the browser refused to keep the cookie.
 */
export function usePreferences() {
  const preferences = useSyncExternalStore(subscribe, readPreferences, serverSnapshot);

  const save = useCallback((next: Preferences) => writePreferences(next), []);
  const clear = useCallback(() => writePreferences(null), []);

  return { preferences, save, clear };
}

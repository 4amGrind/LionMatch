"use client";

// Swipe storage shared by the deck (Max) and the history screen (Ayan).
// Right now swipes are saved in this browser only (localStorage).
// When login is added, save to the Supabase `swipes` table inside
// writeSwipes() and readSwipes() and nothing else has to change.

import { useCallback, useSyncExternalStore } from "react";
import type { Swipe, SwipeDirection, TargetType } from "./types";

const KEY = "ct.swipes.v1";
const EVENT = "ct:swipes-changed";
const EMPTY: Swipe[] = [];

let cachedRaw: string | null = null;
let cachedSwipes: Swipe[] = EMPTY;

function readSwipes(): Swipe[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cachedSwipes; // Storage blocked, such as in private mode.
  }
  if (raw === cachedRaw) return cachedSwipes;
  cachedRaw = raw;
  try {
    cachedSwipes = raw ? (JSON.parse(raw) as Swipe[]) : EMPTY;
  } catch {
    cachedSwipes = EMPTY;
  }
  return cachedSwipes;
}

function writeSwipes(next: Swipe[]) {
  cachedSwipes = next;
  cachedRaw = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, cachedRaw);
  } catch {
    // Storage blocked. Swipes still work until the page reloads.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Read and change the current user's swipes.
 * A new swipe on the same target replaces the old one.
 */
export function useSwipes() {
  const swipes = useSyncExternalStore(subscribe, readSwipes, () => EMPTY);

  const recordSwipe = useCallback(
    (target_type: TargetType, target_id: string, direction: SwipeDirection) => {
      const rest = readSwipes().filter(
        (s) => !(s.target_type === target_type && s.target_id === target_id),
      );
      writeSwipes([
        { target_type, target_id, direction, created_at: new Date().toISOString() },
        ...rest,
      ]);
    },
    [],
  );

  const removeSwipe = useCallback((target_type: TargetType, target_id: string) => {
    writeSwipes(
      readSwipes().filter((s) => !(s.target_type === target_type && s.target_id === target_id)),
    );
  }, []);

  const clearSwipes = useCallback(() => writeSwipes([]), []);

  return { swipes, recordSwipe, removeSwipe, clearSwipes };
}

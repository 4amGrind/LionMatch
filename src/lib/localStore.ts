"use client";

// A tiny browser-storage store that React can subscribe to.
// Used for swipes, chats, and outreach until login moves them to Supabase.
// Each store keeps one JSON value under one localStorage key.

import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  /** Current value. Safe to call from event handlers. Returns `initial` when storage is blocked. */
  read(): T;
  /** Replace the value, save it, and tell every subscribed component. */
  write(next: T): void;
  /** React hook. Server render and first paint use `initial`, so there is no hydration mismatch. */
  use(): T;
}

/** `initial` must be a stable value (a module constant), because React compares snapshots by identity. */
export function createLocalStore<T>(key: string, initial: T): LocalStore<T> {
  const changeEvent = `ct:store:${key}`;
  let cachedRaw: string | null = null;
  let cached: T = initial;

  function read(): T {
    if (typeof window === "undefined") return initial;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cached; // Storage blocked, such as in private mode.
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      cached = initial;
    }
    return cached;
  }

  function write(next: T) {
    cached = next;
    cachedRaw = JSON.stringify(next);
    try {
      window.localStorage.setItem(key, cachedRaw);
    } catch {
      // Storage blocked or full. The value still works until the page reloads.
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(onChange: () => void) {
    window.addEventListener(changeEvent, onChange);
    window.addEventListener("storage", onChange); // Another tab changed something.
    return () => {
      window.removeEventListener(changeEvent, onChange);
      window.removeEventListener("storage", onChange);
    };
  }

  return {
    read,
    write,
    use: () => useSyncExternalStore(subscribe, read, () => initial),
  };
}

/** A unique id for rows created in the browser. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

"use client";

// Swipe storage shared by the deck (Max) and the history screen (Ayan).
// Right now swipes are saved in this browser only (localStorage).
// When login is added, save to the Supabase `swipes` and `swipe_events` tables inside
// the two stores below and nothing else has to change.
//
// Two stores, on purpose:
//   swipes        The latest choice per card. Re-swiping replaces it and Undo removes it.
//                 The deck and the history list read this.
//   swipe events  An append-only log of everything that happened, with the score on the card
//                 and where it came from. The recommender (recommend.ts) reads this too.

import { useCallback } from "react";
import { createLocalStore, newId } from "./localStore";
import type { Swipe, SwipeDirection, SwipeEvent, SwipeSource, TargetType } from "./types";

const EMPTY_SWIPES: Swipe[] = [];
const EMPTY_EVENTS: SwipeEvent[] = [];
/** The log keeps this many events. Older ones drop off, so browser storage never fills up. */
const MAX_EVENTS = 2000;

const swipeStore = createLocalStore<Swipe[]>("ct.swipes.v1", EMPTY_SWIPES);
const eventStore = createLocalStore<SwipeEvent[]>("ct.swipe-events.v1", EMPTY_EVENTS);

/** Extra facts saved with a swipe. All optional. */
export interface SwipeContext {
  /** The score on the card. When missing, the last known score for this card is reused. */
  match_score?: number | null;
  /** How many cards into the deck this was. */
  position?: number | null;
  /** Where the swipe happened. Defaults to "deck". */
  source?: SwipeSource;
}

function sameTarget(s: { target_type: TargetType; target_id: string }, type: TargetType, id: string) {
  return s.target_type === type && s.target_id === id;
}

function lastKnownScore(type: TargetType, id: string): number | null {
  const events = eventStore.read();
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (sameTarget(e, type, id) && e.match_score != null) return e.match_score;
  }
  return null;
}

function logEvent(
  type: TargetType,
  id: string,
  action: SwipeEvent["action"],
  context: SwipeContext,
  createdAt: string,
) {
  const event: SwipeEvent = {
    id: newId(),
    target_type: type,
    target_id: id,
    action,
    created_at: createdAt,
    match_score: context.match_score ?? lastKnownScore(type, id),
    position: context.position ?? null,
    source: context.source ?? "deck",
  };
  eventStore.write([...eventStore.read(), event].slice(-MAX_EVENTS));
}

/**
 * Read and change the current user's swipes.
 * A new swipe on the same target replaces the old one, but the event log keeps both.
 */
export function useSwipes() {
  const swipes = swipeStore.use();
  const events = eventStore.use();

  const recordSwipe = useCallback(
    (target_type: TargetType, target_id: string, direction: SwipeDirection, context: SwipeContext = {}) => {
      const createdAt = new Date().toISOString();
      logEvent(target_type, target_id, direction, context, createdAt);
      const rest = swipeStore.read().filter((s) => !sameTarget(s, target_type, target_id));
      swipeStore.write([{ target_type, target_id, direction, created_at: createdAt }, ...rest]);
    },
    [],
  );

  const removeSwipe = useCallback((target_type: TargetType, target_id: string, context: SwipeContext = {}) => {
    const current = swipeStore.read();
    if (!current.some((s) => sameTarget(s, target_type, target_id))) return;
    logEvent(target_type, target_id, "undo", context, new Date().toISOString());
    swipeStore.write(current.filter((s) => !sameTarget(s, target_type, target_id)));
  }, []);

  /** Wipes swipes and the event log. This also resets what the recommender has learned. */
  const clearSwipes = useCallback(() => {
    swipeStore.write(EMPTY_SWIPES);
    eventStore.write(EMPTY_EVENTS);
  }, []);

  /** Replace everything at once. Used to load a sample taste for demos. */
  const loadHistory = useCallback((nextSwipes: Swipe[], nextEvents: SwipeEvent[]) => {
    swipeStore.write(nextSwipes);
    eventStore.write(nextEvents.slice(-MAX_EVENTS));
  }, []);

  return { swipes, events, recordSwipe, removeSwipe, clearSwipes, loadHistory };
}

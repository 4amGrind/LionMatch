"use client";

// Which kinds of cards the swipe deck shows. OWNER: Max (deck), added by Ayan.
// The choice is saved in this browser. We save what is hidden, not what is shown,
// so a kind of card added later shows up by default.

import { useCallback, useMemo } from "react";
import { createLocalStore } from "./localStore";
import type { RankableItem } from "./recommend";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "./types";

/** Each listing category, plus people. */
export type DeckFilterId = Category | "people";

export const DECK_FILTERS: { id: DeckFilterId; label: string }[] = [
  ...CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] })),
  { id: "people", label: "People" },
];

const KNOWN = new Set<string>(DECK_FILTERS.map((f) => f.id));
const NONE_HIDDEN: DeckFilterId[] = [];
const store = createLocalStore<DeckFilterId[]>("ct.deck-hidden.v1", NONE_HIDDEN);

export function filterIdOf(item: RankableItem): DeckFilterId {
  return item.kind === "person" ? "people" : item.opportunity.category;
}

/** How many cards are in each kind. */
export function countByFilter(items: RankableItem[]): Record<DeckFilterId, number> {
  const counts = Object.fromEntries(DECK_FILTERS.map((f) => [f.id, 0])) as Record<DeckFilterId, number>;
  for (const item of items) counts[filterIdOf(item)]++;
  return counts;
}

/**
 * What a tap on a chip does.
 * With everything showing, a tap picks just that kind. Otherwise it adds or removes that kind.
 * Tapping the only kind left clears the filter, so the deck is never switched off by accident.
 */
function afterTap(hidden: DeckFilterId[], id: DeckFilterId): DeckFilterId[] {
  if (hidden.length === 0) return DECK_FILTERS.filter((f) => f.id !== id).map((f) => f.id);
  if (hidden.includes(id)) return hidden.filter((h) => h !== id);
  return hidden.length === DECK_FILTERS.length - 1 ? NONE_HIDDEN : [...hidden, id];
}

export function useDeckFilter() {
  const stored = store.use();
  // Storage can hold anything, so keep only known kinds. If that would hide every kind, show every kind.
  const hidden = useMemo(() => {
    const known = stored.filter((id) => KNOWN.has(id));
    return known.length >= DECK_FILTERS.length ? NONE_HIDDEN : known;
  }, [stored]);

  const toggle = useCallback((id: DeckFilterId) => store.write(afterTap(store.read(), id)), []);
  const showAll = useCallback(() => store.write(NONE_HIDDEN), []);
  /** Make sure one kind is showing, without changing the others. */
  const reveal = useCallback((id: DeckFilterId) => {
    const current = store.read();
    if (current.includes(id)) store.write(current.filter((h) => h !== id));
  }, []);

  return { hidden, toggle, showAll, reveal };
}

"use client";

// The row of chips above the swipe deck that picks which kinds of cards show.
// With everything showing, tapping a chip shows just that kind. After that, chips add and remove kinds.

import { useEffect, useRef } from "react";
import { DECK_FILTERS, type DeckFilterId } from "@/lib/deckFilter";
import { CATEGORY_BG } from "./ui";

const DOT: Record<DeckFilterId, string> = { ...CATEGORY_BG, people: "bg-ct-cat-person" };

function Chip({
  active,
  onClick,
  count,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  dot?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-ct-navy text-ct-on-navy" : "glass text-ct-navy"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {dot ? <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" /> : null}
      {children}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

/** `counts` is how many cards are left to swipe in each kind. `hidden` is the kinds that are switched off. */
export default function DeckFilter({
  counts,
  hidden,
  onToggle,
  onShowAll,
}: {
  counts: Record<DeckFilterId, number>;
  hidden: DeckFilterId[];
  onToggle: (id: DeckFilterId) => void;
  onShowAll: () => void;
}) {
  const everything = hidden.length === 0;
  const total = DECK_FILTERS.reduce((sum, f) => sum + counts[f.id], 0);

  // The row scrolls sideways on a phone. If the chip that is on sits out of view (for example after a
  // reload), bring it into view so you can always see what the filter is.
  const rowRef = useRef<HTMLDivElement>(null);
  const hiddenKey = hidden.join(",");
  useEffect(() => {
    const row = rowRef.current;
    const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !on) return;
    const rowBox = row.getBoundingClientRect();
    const box = on.getBoundingClientRect();
    if (box.left < rowBox.left) row.scrollBy({ left: box.left - rowBox.left - 16, behavior: "smooth" });
    else if (box.right > rowBox.right) row.scrollBy({ left: box.right - rowBox.right + 16, behavior: "smooth" });
  }, [hiddenKey]);

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label="Kinds of cards to show"
      className="-mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Chip active={everything} onClick={onShowAll} count={total}>
        All
      </Chip>
      {DECK_FILTERS.map((filter) => (
        <Chip
          key={filter.id}
          active={!everything && !hidden.includes(filter.id)}
          onClick={() => onToggle(filter.id)}
          count={counts[filter.id]}
          dot={DOT[filter.id]}
        >
          {filter.label}
        </Chip>
      ))}
    </div>
  );
}

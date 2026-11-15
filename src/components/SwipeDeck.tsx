"use client";

// The swipe deck. OWNER: Max.
// This version shows one card with three buttons. Still to build:
// drag gestures, card animation, undo, and people cards.

import Link from "next/link";
import { useSwipes } from "@/lib/swipes";
import type { MatchResult, Opportunity, SwipeDirection } from "@/lib/types";
import { CategoryBadge, EmptyState, MatchPanel, TagList } from "./ui";

export interface DeckItem {
  opportunity: Opportunity;
  match: MatchResult;
}

const ACTIONS: { direction: SwipeDirection; label: string; className: string }[] = [
  { direction: "pass", label: "Pass", className: "border-ct-pass text-ct-pass" },
  { direction: "save", label: "Save", className: "border-ct-save text-ct-save" },
  { direction: "like", label: "Interested", className: "border-ct-like bg-ct-like text-white" },
];

export default function SwipeDeck({ items }: { items: DeckItem[] }) {
  const { swipes, recordSwipe, clearSwipes } = useSwipes();

  const seen = new Set(swipes.filter((s) => s.target_type === "opportunity").map((s) => s.target_id));
  const remaining = items.filter((item) => !seen.has(item.opportunity.id));
  const current = remaining[0];

  if (!current) {
    return (
      <div className="space-y-3">
        <EmptyState>You have seen every card. Check Explore for more, or start over.</EmptyState>
        <button
          type="button"
          onClick={clearSwipes}
          className="w-full rounded-xl border border-ct-navy py-3 text-sm font-semibold text-ct-navy"
        >
          Start over
        </button>
      </div>
    );
  }

  const { opportunity, match } = current;

  return (
    <div className="flex flex-1 flex-col">
      <article className="flex flex-1 flex-col gap-4 rounded-3xl border border-ct-line bg-ct-card p-5 shadow-md">
        <div className="flex items-center justify-between">
          <CategoryBadge category={opportunity.category} />
          <span className="text-xs text-ct-muted">{remaining.length} left</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold leading-tight text-ct-navy">{opportunity.title}</h2>
          <p className="mt-1 text-sm font-medium text-ct-muted">{opportunity.organization}</p>
        </div>

        <p className="text-sm leading-relaxed">{opportunity.description}</p>
        <TagList items={opportunity.tags} max={4} />
        <MatchPanel match={match} />

        <Link
          href={`/opportunities/${opportunity.id}`}
          className="mt-auto text-sm font-semibold text-ct-navy underline underline-offset-4"
        >
          See full details
        </Link>
      </article>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.direction}
            type="button"
            onClick={() => recordSwipe("opportunity", opportunity.id, action.direction)}
            className={`rounded-xl border-2 py-3 text-sm font-bold ${action.className}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

// Swipe history. OWNER: Ayan.
// This version lists every swipe with an undo. Still to build:
// tabs per direction and a way to change a swipe.

import Link from "next/link";
import { useSwipes } from "@/lib/swipes";
import type { SwipeDirection } from "@/lib/types";
import { EmptyState } from "./ui";

const LABELS: Record<SwipeDirection, { text: string; className: string }> = {
  like: { text: "Interested", className: "bg-ct-like text-white" },
  save: { text: "Saved", className: "bg-ct-save text-white" },
  pass: { text: "Passed", className: "bg-ct-line text-ct-ink" },
};

/** `names` maps "opportunity:id" or "person:id" to a display name. */
export default function HistoryList({ names }: { names: Record<string, string> }) {
  const { swipes, removeSwipe } = useSwipes();

  if (swipes.length === 0) {
    return <EmptyState>No swipes yet. Head to the Swipe tab to start.</EmptyState>;
  }

  return (
    <ul className="space-y-2">
      {swipes.map((swipe) => {
        const key = `${swipe.target_type}:${swipe.target_id}`;
        const href =
          swipe.target_type === "opportunity" ? `/opportunities/${swipe.target_id}` : `/people/${swipe.target_id}`;
        const label = LABELS[swipe.direction];
        return (
          <li key={key} className="flex items-center gap-3 rounded-2xl border border-ct-line bg-ct-card p-3 shadow-sm">
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${label.className}`}>
              {label.text}
            </span>
            <Link href={href} className="min-w-0 flex-1 truncate text-sm font-medium text-ct-navy">
              {names[key] ?? swipe.target_id}
            </Link>
            <button
              type="button"
              onClick={() => removeSwipe(swipe.target_type, swipe.target_id)}
              className="shrink-0 text-xs font-semibold text-ct-muted underline underline-offset-2"
            >
              Undo
            </button>
          </li>
        );
      })}
    </ul>
  );
}

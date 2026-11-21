"use client";

import { useSwipes } from "@/lib/swipes";
import type { SwipeDirection, TargetType } from "@/lib/types";

const OPTIONS: { direction: SwipeDirection; label: string; done: string; activeClass: string }[] = [
  { direction: "pass", label: "Pass", done: "Passed", activeClass: "bg-ct-pass text-white" },
  { direction: "save", label: "Save", done: "Saved", activeClass: "bg-ct-save text-white" },
  { direction: "like", label: "Interested", done: "Interested", activeClass: "bg-ct-like text-white" },
];

/** Pass, Save, and Interested buttons for a detail page. Shows the current choice. */
export default function SwipeButtons({
  targetType,
  targetId,
  matchScore,
}: {
  targetType: TargetType;
  targetId: string;
  /** The score shown on the page. Saved with the swipe so the recommender knows what the user saw. */
  matchScore?: number;
}) {
  const { swipes, recordSwipe, removeSwipe } = useSwipes();
  const current = swipes.find((s) => s.target_type === targetType && s.target_id === targetId)?.direction;

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const active = current === option.direction;
        return (
          <button
            key={option.direction}
            type="button"
            aria-pressed={active}
            onClick={() =>
              active
                ? removeSwipe(targetType, targetId, { source: "detail" })
                : recordSwipe(targetType, targetId, option.direction, { source: "detail", match_score: matchScore })
            }
            className={`rounded-full py-3 text-sm font-semibold transition-colors active:scale-[0.97] ${
              active ? option.activeClass : "glass-surface text-ct-navy"
            }`}
          >
            {active ? option.done : option.label}
          </button>
        );
      })}
    </div>
  );
}

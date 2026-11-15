"use client";

import { useSwipes } from "@/lib/swipes";
import type { SwipeDirection, TargetType } from "@/lib/types";

const OPTIONS: { direction: SwipeDirection; label: string; done: string }[] = [
  { direction: "pass", label: "Pass", done: "Passed" },
  { direction: "save", label: "Save", done: "Saved" },
  { direction: "like", label: "Interested", done: "Interested" },
];

/** Pass, Save, and Interested buttons for a detail page. Shows the current choice. */
export default function SwipeButtons({ targetType, targetId }: { targetType: TargetType; targetId: string }) {
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
              active ? removeSwipe(targetType, targetId) : recordSwipe(targetType, targetId, option.direction)
            }
            className={`rounded-xl border-2 py-3 text-sm font-bold ${
              active ? "border-ct-navy bg-ct-navy text-white" : "border-ct-line bg-ct-card text-ct-navy"
            }`}
          >
            {active ? option.done : option.label}
          </button>
        );
      })}
    </div>
  );
}

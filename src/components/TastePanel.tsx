"use client";

// "Your taste": what the deck has learned from your swipes, in plain words. OWNER: Ayan.
// Shown at the top of History. It also holds the sample tastes (so a demo has something to show)
// and the reset button.

import Link from "next/link";
import { useState } from "react";
import { MAX_INFLUENCE, PERSONAS, type TasteSummary } from "@/lib/recommend";
import { CATEGORY_LABELS } from "@/lib/types";
import { CATEGORY_BG, Card, TagList } from "./ui";

const CONFIDENCE_LABEL: Record<TasteSummary["confidence"], string> = {
  none: "No swipes yet",
  "warming up": "Warming up",
  learning: "Learning",
  confident: "Confident",
};

function Group({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold text-ct-muted">{label}</h3>
      <TagList items={items} max={8} />
    </div>
  );
}

export default function TastePanel({
  summary,
  profileTerms,
  onLoadPersona,
  onReset,
}: {
  summary: TasteSummary;
  /** Lowercase skills and interests from the profile, to spot when swipes and profile disagree. */
  profileTerms: string[];
  onLoadPersona: (personaId: string) => void;
  onReset: () => void;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const empty = summary.swipeCount === 0;
  const biggest = Math.max(1, ...summary.categories.map((c) => c.count));
  // Swipes say one thing and the profile says another: the match score (40 to 60 percent of the deck order) follows the profile.
  const disagree =
    summary.confidence !== "none" &&
    summary.confidence !== "warming up" &&
    summary.likes.length > 0 &&
    !summary.likes.some((like) => profileTerms.includes(like));

  return (
    <Card className="mb-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ct-navy">Your taste</h2>
        <span className="rounded-full border border-ct-navy/15 px-2.5 py-0.5 text-xs font-semibold text-ct-ink">
          {CONFIDENCE_LABEL[summary.confidence]}
        </span>
      </div>

      {empty ? (
        <p className="text-sm text-ct-muted">
          Swipe a few cards and the deck starts to learn what you like. Or load a sample taste below to see it work.
        </p>
      ) : (
        <>
          <div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-ct-line"
              role="progressbar"
              aria-label="How much your swipes steer the deck"
              aria-valuemin={0}
              aria-valuemax={Math.round(MAX_INFLUENCE * 100)}
              aria-valuenow={Math.round(summary.influence * 100)}
            >
              <div
                className="h-full rounded-full bg-ct-navy transition-[width] duration-500"
                style={{ width: `${(summary.influence / MAX_INFLUENCE) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ct-muted">
              Your swipes decide {Math.round(summary.influence * 100)}% of the deck order. The rest is your profile match.
            </p>
          </div>

          <Group label="Leaning toward" items={summary.likes} />
          {disagree ? (
            <p className="rounded-xl border border-dashed border-ct-navy/30 px-3 py-2 text-xs leading-relaxed text-ct-muted">
              None of these are in your profile, and your profile still sets part of the deck order.{" "}
              <Link href="/preferences" className="font-semibold text-ct-navy underline underline-offset-4">
                Update your preferences
              </Link>{" "}
              so the match score agrees with your swipes.
            </p>
          ) : null}
          <Group label="Leaning away from" items={summary.avoids} />

          {summary.categories.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold text-ct-muted">Listings you liked</h3>
              <ul className="space-y-1.5">
                {summary.categories.map(({ category, count }) => (
                  <li key={category} className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 text-ct-ink">{CATEGORY_LABELS[category]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ct-line">
                      <span
                        className={`block h-full rounded-full ${CATEGORY_BG[category]}`}
                        style={{ width: `${(count / biggest) * 100}%` }}
                      />
                    </span>
                    <span className="w-5 text-right tabular-nums text-ct-muted">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-ct-muted">
            {summary.likeCount} interested · {summary.saveCount} saved · {summary.passCount} passed
            {summary.changedMind > 0
              ? ` · changed your mind on ${summary.changedMind} ${summary.changedMind === 1 ? "card" : "cards"}`
              : ""}
          </p>
        </>
      )}

      <div className="space-y-2 border-t border-ct-navy/10 pt-3">
        <h3 className="text-xs font-semibold text-ct-muted">
          Try a sample taste{empty ? "" : " (replaces your history)"}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              onClick={() => onLoadPersona(persona.id)}
              className="glass-surface rounded-xl px-2 py-2 text-left"
            >
              <span className="block text-xs font-semibold leading-tight text-ct-navy">{persona.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-ct-muted">{persona.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {empty ? null : (
        <button
          type="button"
          onClick={() => {
            if (!confirmingReset) {
              setConfirmingReset(true);
              return;
            }
            setConfirmingReset(false);
            onReset();
          }}
          onBlur={() => setConfirmingReset(false)}
          className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            confirmingReset ? "bg-ct-pass text-white" : "glass-surface text-ct-navy"
          }`}
        >
          {confirmingReset ? "Tap again to erase all history" : "Reset personalization"}
        </button>
      )}
    </Card>
  );
}

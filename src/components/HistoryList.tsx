"use client";

// Swipe history. OWNER: Ayan.
// Your taste summary on top, then every swipe, newest first. Filter by what you did,
// change a swipe to another choice, or remove it. Changes feed the recommender straight away.

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildTaste, personaHistory, PERSONAS, summarizeTaste, type Candidate } from "@/lib/recommend";
import { useSwipes } from "@/lib/swipes";
import type { Category, SwipeDirection, SwipeEvent, SwipeSource, TargetType } from "@/lib/types";
import TastePanel from "./TastePanel";
import { EmptyState } from "./ui";

/** What the list needs to show one card. Built on the server so the browser does not need all the data. */
export interface HistoryEntry {
  title: string;
  subtitle: string;
  href: string;
  kind: TargetType;
  category?: Category;
}

const LABELS: Record<SwipeDirection, { text: string; className: string }> = {
  like: { text: "Interested", className: "bg-ct-like text-white" },
  save: { text: "Saved", className: "bg-ct-save text-white" },
  pass: { text: "Passed", className: "bg-ct-line text-ct-ink" },
};
const MOVE_LABEL: Record<SwipeDirection, string> = { like: "Interested", save: "Save", pass: "Pass" };
const ORDER: SwipeDirection[] = ["like", "save", "pass"];
const SOURCE_LABEL: Record<SwipeSource, string> = {
  deck: "From the deck",
  detail: "From a detail page",
  history: "Changed here",
  demo: "Sample taste",
};

type Filter = "all" | SwipeDirection;

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** `entries` maps "opportunity:id" or "person:id" to what to show. `candidates` is what the recommender learns from. */
export default function HistoryList({
  entries,
  candidates,
  profileTerms,
}: {
  entries: Record<string, HistoryEntry>;
  candidates: Candidate[];
  profileTerms: string[];
}) {
  const { swipes, events, recordSwipe, removeSwipe, clearSwipes, loadHistory } = useSwipes();
  const [filter, setFilter] = useState<Filter>("all");

  const summary = useMemo(() => summarizeTaste(buildTaste(candidates, swipes, events)), [candidates, swipes, events]);

  // The latest thing that happened to each card, for "From the deck, score 7/10".
  const lastEvent = useMemo(() => {
    const map = new Map<string, SwipeEvent>();
    for (const e of events) if (e.action !== "undo") map.set(`${e.target_type}:${e.target_id}`, e);
    return map;
  }, [events]);

  const counts: Record<Filter, number> = {
    all: swipes.length,
    like: swipes.filter((s) => s.direction === "like").length,
    save: swipes.filter((s) => s.direction === "save").length,
    pass: swipes.filter((s) => s.direction === "pass").length,
  };
  const visible = filter === "all" ? swipes : swipes.filter((s) => s.direction === filter);

  function loadPersona(personaId: string) {
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    const history = personaHistory(persona, candidates, Date.now());
    loadHistory(history.swipes, history.events);
    setFilter("all");
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "like", label: "Interested" },
    { id: "save", label: "Saved" },
    { id: "pass", label: "Passed" },
  ];

  return (
    <>
      <TastePanel summary={summary} profileTerms={profileTerms} onLoadPersona={loadPersona} onReset={clearSwipes} />

      {swipes.length === 0 ? (
        <EmptyState>No swipes yet. Head to the Swipe tab to start.</EmptyState>
      ) : (
        <>
          <div role="tablist" aria-label="Filter history" className="glass mb-3 grid grid-cols-4 gap-1 rounded-2xl p-1">
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-xl px-1 py-2 text-xs font-semibold transition-colors ${
                    active ? "bg-ct-navy text-ct-on-navy" : "text-ct-muted hover:text-ct-navy"
                  }`}
                >
                  {tab.label} <span className="tabular-nums opacity-70">{counts[tab.id]}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState>Nothing here yet.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {visible.map((swipe) => {
                const key = `${swipe.target_type}:${swipe.target_id}`;
                const entry = entries[key];
                const href =
                  entry?.href ??
                  (swipe.target_type === "opportunity" ? `/opportunities/${swipe.target_id}` : `/people/${swipe.target_id}`);
                const label = LABELS[swipe.direction];
                const event = lastEvent.get(key);
                const meta = [
                  when(swipe.created_at),
                  event ? SOURCE_LABEL[event.source] : null,
                  event?.match_score != null ? `score ${event.match_score}/10` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={key} className="glass-surface rounded-[22px] p-3">
                    <div className="flex items-start gap-3">
                      <Link href={href} className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ct-navy">{entry?.title ?? swipe.target_id}</span>
                        {entry ? <span className="block truncate text-sm text-ct-muted">{entry.subtitle}</span> : null}
                        <span className="mt-0.5 block text-xs text-ct-muted">{meta}</span>
                      </Link>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${label.className}`}>
                        {label.text}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-ct-muted">Change to</span>
                      {ORDER.filter((d) => d !== swipe.direction).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => recordSwipe(swipe.target_type, swipe.target_id, d, { source: "history" })}
                          className="glass-surface rounded-full px-3 py-1 text-xs font-semibold text-ct-navy"
                        >
                          {MOVE_LABEL[d]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => removeSwipe(swipe.target_type, swipe.target_id, { source: "history" })}
                        className="ml-auto rounded-full px-3 py-1 text-xs font-semibold text-ct-muted hover:text-ct-pass"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

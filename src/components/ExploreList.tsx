"use client";

// Explore and search. OWNER: Peter.
// This version filters in the browser. Still to build: sort options,
// a prerequisites filter, deadline filter, and a people tab.

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category, type MatchResult, type Opportunity } from "@/lib/types";
import { CategoryBadge, EmptyState, ScoreBadge, TagList } from "./ui";

export interface ExploreItem {
  opportunity: Opportunity;
  match: MatchResult;
}

export default function ExploreList({ items }: { items: ExploreItem[] }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = items.filter(({ opportunity: o }) => {
    if (category !== "all" && o.category !== category) return false;
    const haystack = [o.title, o.organization, o.description, ...o.tags, ...o.skills].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Search opportunities</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, skill, or topic"
          className="w-full rounded-xl border border-ct-line bg-ct-card px-4 py-3 text-sm placeholder:text-ct-muted"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
        {(["all", ...CATEGORIES] as const).map((option) => {
          const active = category === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(option)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                active ? "border-ct-navy bg-ct-navy text-white" : "border-ct-line bg-ct-card text-ct-ink"
              }`}
            >
              {option === "all" ? "All" : CATEGORY_LABELS[option]}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-ct-muted">
        {visible.length} {visible.length === 1 ? "result" : "results"}
      </p>

      {visible.length === 0 ? (
        <EmptyState>Nothing matches that search. Try a different word or filter.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map(({ opportunity: o, match }) => (
            <li key={o.id}>
              <Link
                href={`/opportunities/${o.id}`}
                className="block rounded-2xl border border-ct-line bg-ct-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <CategoryBadge category={o.category} />
                  <ScoreBadge score={match.score} />
                </div>
                <h2 className="mt-2 font-semibold leading-snug text-ct-navy">{o.title}</h2>
                <p className="text-sm text-ct-muted">{o.organization}</p>
                <div className="mt-2">
                  <TagList items={o.tags} max={3} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

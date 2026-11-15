// Small shared pieces. Use these so every screen looks the same.

import type { ReactNode } from "react";
import { CATEGORY_LABELS, type Category, type MatchResult } from "@/lib/types";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight text-ct-navy">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-ct-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-ct-line bg-ct-card p-4 shadow-sm ${className}`}>{children}</div>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="rounded-full bg-ct-navy px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-ct-blue-soft px-2.5 py-1 text-xs font-medium text-ct-navy">{children}</span>
  );
}

export function TagList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </div>
  );
}

/** The match score out of 10. */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-0.5 rounded-xl bg-ct-blue px-2.5 py-1 font-mono font-bold text-ct-navy"
      aria-label={`Match score ${score} out of 10`}
    >
      <span className="text-lg leading-none">{score}</span>
      <span className="text-xs">/10</span>
    </span>
  );
}

/** The score with its reasons. Reasons are always shown so the number never feels random. */
export function MatchPanel({ match }: { match: MatchResult }) {
  return (
    <div className="rounded-xl bg-ct-blue-soft p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ct-navy">Why this match?</span>
        <ScoreBadge score={match.score} />
      </div>
      <ul className="mt-2 space-y-1 text-sm text-ct-ink">
        {match.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span aria-hidden="true" className="text-ct-like">
              +
            </span>
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A note for the team that says who builds this screen next. Delete it when the screen is done. */
export function OwnerNote({ owner, children }: { owner: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-ct-muted p-3 text-sm text-ct-muted">
      <span className="font-semibold text-ct-ink">Owner: {owner}.</span> {children}
    </div>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded-full border border-ct-line px-2 py-0.5 text-xs font-medium text-ct-muted">
      Sample profile
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-ct-line bg-ct-card p-6 text-center text-sm text-ct-muted">{children}</p>;
}

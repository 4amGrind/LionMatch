// Small shared pieces. Use these so every screen looks the same.

import type { ReactNode } from "react";
import { CATEGORY_LABELS, type Category, type MatchResult } from "@/lib/types";

/** Background color for each category. Written out in full so Tailwind can find the class names. */
export const CATEGORY_BG: Record<Category, string> = {
  internship: "bg-ct-cat-internship",
  club: "bg-ct-cat-club",
  research: "bg-ct-cat-research",
  fellowship: "bg-ct-cat-fellowship",
};

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="display text-[38px] text-ct-navy">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-ct-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-surface rounded-[22px] p-4 ${className}`}>{children}</div>;
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-ct-deep ${CATEGORY_BG[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-ct-navy/15 px-2.5 py-0.5 text-xs font-medium text-ct-ink">
      {children}
    </span>
  );
}

export function TagList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length === 0) return null;
  // A word can be in two lists (a skill and an interest), so show each once. Also keeps React keys unique.
  const shown = [...new Set(items)];
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.slice(0, max).map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </div>
  );
}

/** The match score out of 10. */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 text-ct-navy" aria-label={`Match score ${score} out of 10`}>
      <span className="display text-[28px] tabular-nums">{score}</span>
      <span className="text-xs font-semibold text-ct-muted">/10</span>
    </span>
  );
}

/** The score with its reasons. Reasons are always shown so the number never feels random. */
export function MatchPanel({ match }: { match: MatchResult }) {
  return (
    <div className="border-t border-ct-navy/10 pt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ct-navy">Why it fits you</span>
        <ScoreBadge score={match.score} />
      </div>
      <ul className="mt-1.5 space-y-1 text-sm text-ct-ink">
        {match.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <svg viewBox="0 0 16 16" className="mt-[3px] size-3.5 shrink-0 text-ct-like" aria-hidden="true">
              <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
    <div className="glass-surface mt-6 rounded-2xl border border-dashed border-ct-navy/30 p-3 text-sm text-ct-muted">
      <span className="font-semibold text-ct-navy">Owner: {owner}.</span> {children}
    </div>
  );
}

/** A round avatar with the person's initials. Decorative: the name always sits next to it. */
export function Avatar({ name, className = "size-11 text-base" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-ct-blue font-bold text-ct-deep ${className}`}
    >
      {initials}
    </span>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded-full border border-ct-navy/20 px-2 py-0.5 text-xs font-medium text-ct-muted">
      Sample profile
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="glass-surface rounded-[22px] p-6 text-center text-sm text-ct-muted">{children}</p>;
}

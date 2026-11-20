// Prerequisites and deadlines. OWNER: Peter.
// Checks each prerequisite on an opportunity against the user's courses and skills.

import type { Opportunity, Profile } from "./types";

export interface PrerequisiteCheck {
  requirement: string;
  /** True when the user's courses or skills cover this requirement. */
  met: boolean;
}

export interface PrerequisiteStatus {
  checks: PrerequisiteCheck[];
  metCount: number;
  total: number;
  /** True when every prerequisite is met, or there are none. */
  allMet: boolean;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Turns a Columbia course code into a simple key so different spellings match.
 * "COMS W3134", "COMS 3134", and "coms un3134" all become "coms 3134".
 */
function courseKey(text: string): string | null {
  const m = text.match(/\b([a-z]{4})\s*(?:[a-z]{1,2})?\s*(\d{4})\b/i);
  return m ? `${m[1].toLowerCase()} ${m[2]}` : null;
}

function covers(have: string, requirement: string): boolean {
  const a = courseKey(have);
  const b = courseKey(requirement);
  if (a && b) return a === b;
  return normalize(have) === normalize(requirement);
}

export function checkPrerequisites(user: Profile, opportunity: Opportunity): PrerequisiteStatus {
  // `courses` can be missing on rows saved before the column existed.
  const have = [...(user.courses ?? []), ...user.skills];
  const checks = opportunity.prerequisites.map((requirement) => ({
    requirement,
    met: have.some((item) => covers(item, requirement)),
  }));
  const metCount = checks.filter((c) => c.met).length;
  return { checks, metCount, total: checks.length, allMet: metCount === checks.length };
}

/** Today as an ISO date, like "2026-11-20". Pass it from the server so the page and browser agree. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Days from today until the deadline. Negative once it has passed. */
export function daysUntil(deadline: string, today: string): number {
  return Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
}

/** "2027-02-01" becomes "Feb 1, 2027". */
export function formatDeadline(deadline: string): string {
  return new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A short label like "Due in 5 days" or "Closed", or null when there is no deadline. */
export function deadlineLabel(deadline: string | null, today: string): string | null {
  if (!deadline) return null;
  const days = daysUntil(deadline, today);
  if (days < 0) return `Closed ${formatDeadline(deadline)}`;
  if (days === 0) return "Due today";
  if (days <= 30) return `Due in ${days} ${days === 1 ? "day" : "days"}`;
  return `Due ${formatDeadline(deadline)}`;
}

// Prerequisites and deadlines. OWNER: Peter.
// Checks each prerequisite on an opportunity against the user's courses and skills.

import type { Opportunity, Profile } from "./types";

/**
 * "met": the user's courses or skills cover it.
 * "missing": a course or skill the user does not have yet.
 * "check": a rule the app cannot check, like class year or GPA. The user checks it themselves.
 */
export type PrerequisiteState = "met" | "missing" | "check";

export interface PrerequisiteCheck {
  requirement: string;
  state: PrerequisiteState;
}

export interface PrerequisiteStatus {
  checks: PrerequisiteCheck[];
  metCount: number;
  missingCount: number;
  checkCount: number;
  total: number;
  /** True when nothing is missing. Rules the user has to check themselves do not count against them. */
  allMet: boolean;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Turns a Columbia course code into a simple key so different spellings match.
 * "COMS W3134", "COMS 3134", and "COMS UN3134" all become "coms 3134".
 * Codes must be in capitals, so text like "June 2030" is not mistaken for a course.
 */
function courseKey(text: string): string | null {
  const m = text.match(/\b([A-Z]{4})\s*(?:[A-Z]{1,2})?\s*(\d{4})\b/);
  return m ? `${m[1].toLowerCase()} ${m[2]}` : null;
}

function covers(have: string, requirement: string): boolean {
  const a = courseKey(have);
  const b = courseKey(requirement);
  if (a && b) return a === b;
  return normalize(have) === normalize(requirement);
}

/** True when the app can check this requirement: a course code, or a skill name the app knows. */
function isCheckable(requirement: string, knownSkills: Set<string>): boolean {
  return courseKey(requirement) !== null || knownSkills.has(normalize(requirement));
}

/**
 * @param knownSkills Every skill name used across opportunities, so a prerequisite like "Python"
 * counts as checkable even when this user does not list it.
 */
export function checkPrerequisites(
  user: Profile,
  opportunity: Opportunity,
  knownSkills: Set<string> = new Set(opportunity.skills.map(normalize)),
): PrerequisiteStatus {
  // `courses` can be missing on rows saved before the column existed.
  // Courses are upper-cased so "coms w3134" typed by a user still reads as a course code.
  const have = [...(user.courses ?? []).map((c) => c.toUpperCase()), ...user.skills];
  const checks: PrerequisiteCheck[] = opportunity.prerequisites.map((requirement) => {
    if (have.some((item) => covers(item, requirement))) return { requirement, state: "met" };
    return { requirement, state: isCheckable(requirement, knownSkills) ? "missing" : "check" };
  });
  const count = (state: PrerequisiteState) => checks.filter((c) => c.state === state).length;
  const missingCount = count("missing");
  return {
    checks,
    metCount: count("met"),
    missingCount,
    checkCount: count("check"),
    total: checks.length,
    allMet: missingCount === 0,
  };
}

/** All skill names used across a list of opportunities, for checkPrerequisites. */
export function skillNames(opportunities: Opportunity[]): Set<string> {
  return new Set(opportunities.flatMap((o) => o.skills).map(normalize));
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

/**
 * A short label like "Due in 5 days" or "Closed", or null when there is no deadline.
 * Pass `estimated` for a date that is our best guess, not from an official page, and the label says so.
 */
export function deadlineLabel(deadline: string | null, today: string, estimated = false): string | null {
  if (!deadline) return null;
  const days = daysUntil(deadline, today);
  const label =
    days < 0
      ? `Closed ${formatDeadline(deadline)}`
      : days === 0
        ? "Due today"
        : days <= 30
          ? `Due in ${days} ${days === 1 ? "day" : "days"}`
          : `Due ${formatDeadline(deadline)}`;
  return estimated ? `${label} (estimated)` : label;
}

// Match score out of 10, with the reasons behind it.
// OWNER: Jun. This is a simple first version so cards have something to show.
// Keep the function name and return shape the same and every screen keeps working.

import { CATEGORY_LABELS, type MatchResult, type Opportunity, type Profile } from "./types";

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => set.has(s.toLowerCase()));
}

function list(items: string[], max = 3): string {
  return items.slice(0, max).join(", ");
}

export function matchOpportunity(user: Profile, opportunity: Opportunity): MatchResult {
  const reasons: string[] = [];
  let points = 3; // Everyone starts at 3 so no card looks hopeless.

  const sharedSkills = overlap(opportunity.skills, user.skills);
  if (sharedSkills.length > 0) {
    points += Math.min(3, sharedSkills.length * 1.5);
    reasons.push(`Shared skills: ${list(sharedSkills)}`);
  }

  const sharedInterests = overlap(opportunity.tags, user.interests);
  if (sharedInterests.length > 0) {
    points += Math.min(2, sharedInterests.length);
    reasons.push(`Shared interests: ${list(sharedInterests)}`);
  }

  if (opportunity.majors.length === 0) {
    points += 0.5;
    reasons.push("Open to all majors");
  } else if (user.major && overlap(opportunity.majors, [user.major]).length > 0) {
    points += 1.5;
    reasons.push(`Fits your major: ${user.major}`);
  }

  if (user.looking_for.includes(opportunity.category)) {
    points += 1;
    reasons.push(`You are looking for: ${CATEGORY_LABELS[opportunity.category].toLowerCase()}`);
  }

  const score = Math.max(1, Math.min(10, Math.round(points)));
  if (reasons.length === 0) reasons.push("No strong overlap yet. Add skills and interests to your profile.");
  return { score, reasons };
}

export function matchPerson(user: Profile, person: Profile): MatchResult {
  const reasons: string[] = [];
  let points = 3;

  const sharedSkills = overlap(person.skills, user.skills);
  if (sharedSkills.length > 0) {
    points += Math.min(3, sharedSkills.length * 1.5);
    reasons.push(`Shared skills: ${list(sharedSkills)}`);
  }

  const sharedInterests = overlap(person.interests, user.interests);
  if (sharedInterests.length > 0) {
    points += Math.min(3, sharedInterests.length * 1.5);
    reasons.push(`Shared interests: ${list(sharedInterests)}`);
  }

  if (user.major && person.major && user.major.toLowerCase() === person.major.toLowerCase()) {
    points += 1;
    reasons.push(`Same major: ${person.major}`);
  }

  const score = Math.max(1, Math.min(10, Math.round(points)));
  if (reasons.length === 0) reasons.push("No strong overlap yet.");
  return { score, reasons };
}

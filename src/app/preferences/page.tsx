import PreferencesForm from "@/components/PreferencesForm";
import { DEMO_USER_ID, getCurrentUser, getOpportunities, getProfile } from "@/lib/data";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The values that come up most across the listings, so the form can offer them. */
function common(opportunities: Opportunity[], field: "skills" | "tags", limit: number): string[] {
  const counts = new Map<string, number>();
  for (const opportunity of opportunities) {
    for (const value of opportunity[field]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

/** Every value the listings use. The resume import can only look for these. */
function allValues(opportunities: Opportunity[], field: "skills" | "tags" | "majors"): string[] {
  return [...new Set(opportunities.flatMap((opportunity) => opportunity[field]))].sort();
}

export default async function PreferencesPage() {
  const [user, sample, opportunities] = await Promise.all([
    getCurrentUser(),
    getProfile(DEMO_USER_ID),
    getOpportunities(),
  ]);

  return (
    <>
      <PreferencesForm
        user={user}
        // getCurrentUser already threw if the demo profile is missing, so by here it exists.
        sample={sample ?? user}
        skillSuggestions={common(opportunities, "skills", 16)}
        interestSuggestions={common(opportunities, "tags", 16)}
        vocabulary={{
          skills: allValues(opportunities, "skills"),
          interests: allValues(opportunities, "tags"),
          majors: allValues(opportunities, "majors"),
        }}
      />
    </>
  );
}

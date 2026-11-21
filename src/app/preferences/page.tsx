import PreferencesForm from "@/components/PreferencesForm";
import { DEMO_USER_ID, getCurrentUser, getOpportunities, getPeople, getProfile, getVocabulary } from "@/lib/data";
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

export default async function PreferencesPage() {
  const [user, sample, opportunities, people, vocabulary] = await Promise.all([
    getCurrentUser(),
    getProfile(DEMO_USER_ID),
    getOpportunities(),
    getPeople(),
    getVocabulary(),
  ]);

  // Every major a listing or person names, so resume import can recognise yours.
  const majors = [
    ...new Set([...opportunities.flatMap((o) => o.majors), ...people.map((p) => p.major).filter((m): m is string => !!m)]),
  ];

  return (
    <PreferencesForm
      user={user}
      // getCurrentUser already threw if the demo profile is missing, so by here it exists.
      sample={sample ?? user}
      skillSuggestions={common(opportunities, "skills", 16)}
      interestSuggestions={common(opportunities, "tags", 16)}
      vocabulary={{ skills: vocabulary.skills, interests: vocabulary.interests, majors }}
    />
  );
}

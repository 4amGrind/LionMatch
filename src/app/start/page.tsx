import StartFlow from "@/components/StartFlow";
import { getOpportunities } from "@/lib/data";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The values that come up most across the listings, so the flow offers real ones. */
function common(opportunities: Opportunity[], field: "skills" | "tags" | "majors", limit: number): string[] {
  const counts = new Map<string, number>();
  for (const opportunity of opportunities) {
    for (const value of opportunity[field]) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

export default async function StartPage() {
  const opportunities = await getOpportunities();
  return (
    <StartFlow
      skillChoices={common(opportunities, "skills", 18)}
      interestChoices={common(opportunities, "tags", 18)}
      majorChoices={common(opportunities, "majors", 10)}
    />
  );
}

import ExploreList, { type ExploreItem } from "@/components/ExploreList";
import { PageTitle } from "@/components/ui";
import { getCurrentUser, getOpportunities } from "@/lib/data";
import { matchOpportunity } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [user, opportunities] = await Promise.all([getCurrentUser(), getOpportunities()]);
  const items: ExploreItem[] = opportunities.map((opportunity) => ({
    opportunity,
    match: matchOpportunity(user, opportunity),
  }));

  return (
    <>
      <PageTitle title="Explore" subtitle="Browse everything without swiping." />
      <ExploreList items={items} />
    </>
  );
}

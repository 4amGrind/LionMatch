import ExploreList, { type ExploreItem, type ExplorePerson, type ExploreTab } from "@/components/ExploreList";
import { PageTitle } from "@/components/ui";
import { getCurrentUser, getOpportunities, getPeople } from "@/lib/data";
import { matchOpportunity, matchPerson } from "@/lib/match";
import { checkPrerequisites, todayIso } from "@/lib/prerequisites";

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const { tab } = await searchParams;
  const [user, opportunities, people] = await Promise.all([getCurrentUser(), getOpportunities(), getPeople()]);

  const items: ExploreItem[] = opportunities.map((opportunity) => ({
    opportunity,
    match: matchOpportunity(user, opportunity),
    prerequisites: checkPrerequisites(user, opportunity),
  }));
  const persons: ExplorePerson[] = people.map((person) => ({ person, match: matchPerson(user, person) }));
  const initialTab: ExploreTab = tab === "people" ? "people" : "opportunities";

  return (
    <>
      <PageTitle title="Explore" subtitle="Browse and search everything without swiping." />
      <ExploreList items={items} people={persons} today={todayIso()} initialTab={initialTab} />
    </>
  );
}

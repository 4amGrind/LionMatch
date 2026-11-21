import HistoryList, { type HistoryEntry } from "@/components/HistoryList";
import { PageTitle } from "@/components/ui";
import { getCurrentUser, getOpportunities, getPeople } from "@/lib/data";
import { opportunityCandidate, personCandidate } from "@/lib/recommend";
import { CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [opportunities, people, user] = await Promise.all([getOpportunities(), getPeople(), getCurrentUser()]);
  const profileTerms = [...user.skills, ...user.interests].map((term) => term.toLowerCase());

  const entries: Record<string, HistoryEntry> = {};
  for (const o of opportunities) {
    entries[`opportunity:${o.id}`] = {
      title: o.title,
      subtitle: `${CATEGORY_LABELS[o.category]} · ${o.organization}`,
      href: `/opportunities/${o.id}`,
      kind: "opportunity",
      category: o.category,
    };
  }
  for (const p of people) {
    entries[`person:${p.id}`] = { title: p.full_name, subtitle: p.headline, href: `/people/${p.id}`, kind: "person" };
  }
  const candidates = [...opportunities.map(opportunityCandidate), ...people.map(personCandidate)];

  return (
    <>
      <PageTitle title="History" subtitle="Everything you have swiped on, and what the deck has learned from it." />
      <HistoryList entries={entries} candidates={candidates} profileTerms={profileTerms} />
    </>
  );
}

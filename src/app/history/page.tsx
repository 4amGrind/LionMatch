import HistoryList from "@/components/HistoryList";
import { PageTitle } from "@/components/ui";
import { getOpportunities, getPeople } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [opportunities, people] = await Promise.all([getOpportunities(), getPeople()]);
  const names: Record<string, string> = {};
  for (const o of opportunities) names[`opportunity:${o.id}`] = o.title;
  for (const p of people) names[`person:${p.id}`] = p.full_name;

  return (
    <>
      <PageTitle title="History" subtitle="Everything you have swiped on, newest first." />
      <HistoryList names={names} />
    </>
  );
}

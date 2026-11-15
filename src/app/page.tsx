import SwipeDeck, { type DeckItem } from "@/components/SwipeDeck";
import { getCurrentUser, getOpportunities } from "@/lib/data";
import { matchOpportunity } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const [user, opportunities] = await Promise.all([getCurrentUser(), getOpportunities()]);

  // Best matches first.
  const items: DeckItem[] = opportunities
    .map((opportunity) => ({ opportunity, match: matchOpportunity(user, opportunity) }))
    .sort((a, b) => b.match.score - a.match.score);

  return <SwipeDeck items={items} />;
}

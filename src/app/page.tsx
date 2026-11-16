import SwipeDeck, { type DeckItem } from "@/components/SwipeDeck";
import { getCurrentUser, getOpportunities, getPeople } from "@/lib/data";
import { matchOpportunity, matchPerson } from "@/lib/match";

export const dynamic = "force-dynamic";

/** One person card after every this many opportunity cards. */
const PERSON_EVERY = 3;

export default async function SwipePage() {
  const [user, opportunities, people] = await Promise.all([getCurrentUser(), getOpportunities(), getPeople()]);

  // Best matches first in each list.
  const opportunityCards: DeckItem[] = opportunities
    .map((opportunity) => ({ kind: "opportunity" as const, opportunity, match: matchOpportunity(user, opportunity) }))
    .sort((a, b) => b.match.score - a.match.score);
  const personCards: DeckItem[] = people
    .map((person) => ({ kind: "person" as const, person, match: matchPerson(user, person) }))
    .sort((a, b) => b.match.score - a.match.score);

  // Mix people in so the deck is not all listings.
  const items: DeckItem[] = [];
  opportunityCards.forEach((card, i) => {
    items.push(card);
    if ((i + 1) % PERSON_EVERY === 0 && personCards.length > 0) items.push(personCards.shift()!);
  });
  items.push(...personCards);

  return <SwipeDeck items={items} />;
}

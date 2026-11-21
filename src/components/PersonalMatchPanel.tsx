"use client";

// The match panel on a detail page, with your swipes taken into account.
// The deck already blends your swipe history into each card's score (see recommend.ts).
// Detail pages are drawn on the server, which cannot see swipes saved in this browser,
// so the server shows the profile-only score and this swaps in the personal one once the page loads.
// Before any swipes, the two are the same.

import { useMemo, useSyncExternalStore } from "react";
import { buildTaste, opportunityCandidate, personCandidate, personalize } from "@/lib/recommend";
import { useSwipes } from "@/lib/swipes";
import type { MatchResult, Opportunity, Profile } from "@/lib/types";
import { MatchPanel } from "./ui";

export type MatchTarget = { kind: "opportunity"; opportunity: Opportunity } | { kind: "person"; person: Profile };

const noopSubscribe = () => () => {};

export default function PersonalMatchPanel({
  match,
  target,
  opportunities,
  people,
}: {
  /** The profile-only score from match.ts, worked out on the server. */
  match: MatchResult;
  target: MatchTarget;
  /** Every listing and person, so swipes on any of them can shape the taste profile. */
  opportunities: Opportunity[];
  people: Profile[];
}) {
  const { swipes, events } = useSwipes();
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const personal = useMemo(() => {
    if (!inBrowser) return match;
    const candidates = [...opportunities.map(opportunityCandidate), ...people.map(personCandidate)];
    const taste = buildTaste(candidates, swipes, events);
    const candidate = target.kind === "opportunity" ? opportunityCandidate(target.opportunity) : personCandidate(target.person);
    return personalize(match, taste, candidate);
  }, [inBrowser, match, target, opportunities, people, swipes, events]);

  return <MatchPanel match={personal} />;
}

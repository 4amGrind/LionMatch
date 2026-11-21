// The app's real data and algorithms, imported straight from the LionMatch repo.
// Scores, reasons, deck order and re-ranking in the film are computed by the app's own code,
// so nothing on screen is typed in by hand.

import opportunitiesJson from "../../../src/data/opportunities.json";
import profilesJson from "../../../src/data/profiles.json";
import { matchOpportunity, matchPerson } from "../../../src/lib/match";
import { buildTaste, itemCandidate, rankDeck, summarizeTaste } from "../../../src/lib/recommend";
import { readResume } from "../../../src/lib/resume";
import {
  DEMO_USER_ID,
  type MatchResult,
  type Opportunity,
  type Profile,
  type Swipe,
  type SwipeDirection,
  type SwipeEvent,
} from "../../../src/lib/types";

export type { MatchResult, Opportunity, Profile, SwipeDirection };

export const opportunities = opportunitiesJson as Opportunity[];
export const profiles = profilesJson as Profile[];
export const people = profiles.filter((p) => p.id !== DEMO_USER_ID);
export const demoUser = profiles.find((p) => p.id === DEMO_USER_ID)!;

export type DeckItem =
  | { kind: "opportunity"; opportunity: Opportunity; match: MatchResult }
  | { kind: "person"; person: Profile; match: MatchResult };

export const deckKey = (item: DeckItem) =>
  item.kind === "opportunity" ? `opportunity:${item.opportunity.id}` : `person:${item.person.id}`;

/** Same as the app's Swipe page (src/app/page.tsx): best matches first, a person after every third listing. */
export function buildDeck(user: Profile): DeckItem[] {
  const PERSON_EVERY = 3;
  const opportunityCards: DeckItem[] = opportunities
    .map((opportunity) => ({ kind: "opportunity" as const, opportunity, match: matchOpportunity(user, opportunity) }))
    .sort((a, b) => b.match.score - a.match.score);
  const personCards: DeckItem[] = people
    .map((person) => ({ kind: "person" as const, person, match: matchPerson(user, person) }))
    .sort((a, b) => b.match.score - a.match.score);
  const items: DeckItem[] = [];
  opportunityCards.forEach((card, i) => {
    items.push(card);
    if ((i + 1) % PERSON_EVERY === 0 && personCards.length > 0) items.push(personCards.shift()!);
  });
  items.push(...personCards);
  return items;
}

export const deck = buildDeck(demoUser);
export const byKey = (key: string) => deck.find((d) => deckKey(d) === key)!;
export const opp = (id: string) => byKey(`opportunity:${id}`) as Extract<DeckItem, { kind: "opportunity" }>;
export const person = (id: string) => byKey(`person:${id}`) as Extract<DeckItem, { kind: "person" }>;

/** The four swipes the film shows, in order. They feed the real recommender below. */
export const FILM_SWIPES: { key: string; direction: SwipeDirection }[] = [
  { key: "opportunity:club-wics", direction: "save" },
  { key: "opportunity:research-nlp", direction: "like" },
  { key: "opportunity:research-causal-ai", direction: "pass" },
];

/** The deck after those swipes, ranked by the app's recommender. Cards on screen stay pinned, as in the app. */
export function deckAfterSwipes(count = FILM_SWIPES.length) {
  const done = FILM_SWIPES.slice(0, count);
  const base = new Date("2026-11-20T15:40:00Z").getTime();
  const swipes: Swipe[] = done
    .map((s, i) => {
      const [target_type, target_id] = s.key.split(":") as ["opportunity" | "person", string];
      return { target_type, target_id, direction: s.direction, created_at: new Date(base + i * 4000).toISOString() };
    })
    .reverse();
  const events: SwipeEvent[] = done.map((s, i) => {
    const [target_type, target_id] = s.key.split(":") as ["opportunity" | "person", string];
    return {
      id: `e${i}`,
      target_type,
      target_id,
      action: s.direction,
      created_at: new Date(base + i * 4000).toISOString(),
      match_score: byKey(s.key).match.score,
      position: i + 1,
      source: "deck" as const,
    };
  });
  const taste = buildTaste(deck.map(itemCandidate), swipes, events);
  const seen = new Set(done.map((s) => s.key));
  const unseen = deck.filter((d) => !seen.has(deckKey(d)));
  return { taste, summary: summarizeTaste(taste), unseen, swipes, events };
}

/**
 * The deck exactly as the app shows it after the film's swipes. Like SwipeDeck.tsx, each swipe pins the
 * cards already visible behind the top card, so only the cards further back can re-rank.
 */
export function simulateDeck(count = FILM_SWIPES.length) {
  const VISIBLE = 3;
  let pinned: string[] = [];
  let remaining = rankDeck(deck, deckAfterSwipes(0).taste, pinned);
  const tops: DeckItem[] = [];
  for (let i = 0; i < count; i++) {
    tops.push(remaining[0]);
    pinned = remaining.slice(1, VISIBLE + 1).map(deckKey);
    const after = deckAfterSwipes(i + 1);
    remaining = rankDeck(after.unseen, after.taste, pinned);
  }
  // Order the cards behind the visible ones would have with no swipes, for comparison.
  const before = rankDeck(deckAfterSwipes(count).unseen, deckAfterSwipes(0).taste, pinned);
  return { tops, remaining, before, summary: deckAfterSwipes(count).summary };
}

/** The sample resume (scripts/sample-resume.html) as the app's resume reader sees it. */
export const RESUME_TEXT = `Sample Student New York, NY sample.student@example.com Education Columbia University, Columbia College Expected May 2030 B.A. in Computer Science Projects Robotic arm controller Fall 2026 Built a 4-axis arm on an Arduino, with a ROS bridge for motion planning. Trained a small vision model in PyTorch to pick up colored blocks. HackNY project, campus events finder Spring 2026 Two-day hackathon team of four. Built the data pipeline in Python and SQL. Experience Research assistant, student lab 2026 Cleaned sensor data and ran statistical tests for a robotics study. Skills Python, PyTorch, ROS, Arduino, SQL, machine learning`;

export const vocabulary = {
  skills: [...new Set(opportunities.flatMap((o) => o.skills))],
  interests: [...new Set(opportunities.flatMap((o) => o.tags))],
  majors: [...new Set(opportunities.flatMap((o) => o.majors))],
};
export const resumeFindings = readResume(RESUME_TEXT, vocabulary);

/** The demo profile after accepting what the import found (the app adds only what is new). */
export function profileAfterImport(): Profile {
  const lower = (xs: string[]) => new Set(xs.map((x) => x.toLowerCase()));
  const haveSkills = lower(demoUser.skills);
  const haveInterests = lower(demoUser.interests);
  return {
    ...demoUser,
    skills: [...demoUser.skills, ...resumeFindings.skills.filter((s) => !haveSkills.has(s.toLowerCase()))],
    interests: [...demoUser.interests, ...resumeFindings.interests.filter((s) => !haveInterests.has(s.toLowerCase()))],
  };
}

export { matchOpportunity, matchPerson };

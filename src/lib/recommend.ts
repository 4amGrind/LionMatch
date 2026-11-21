// Recommendations from swipe history. OWNER: Ayan.
//
// How it works, in four steps:
//   1. Every card becomes a list of features, like "topic:robotics" or "skill:python".
//   2. Each swipe nudges the weight of its card's features: up for Interested and Save,
//      down (more gently) for Pass. Old swipes fade, and a feature with little evidence stays near zero.
//   3. A card's "affinity" is how much its strongest features lean toward things you liked.
//   4. The deck order blends the match score from match.ts (the prior) with affinity.
//      With no swipes it is exactly the match score. As swipes build up, affinity counts for more,
//      up to the cap below. The match score never stops counting, so your profile still matters.
//
// Everything here is a pure function: no storage, no clock, no network. That keeps it easy to test
// (see scripts/replay-personas.mjs) and means it runs the same in the browser now and on the server later.
// Nothing in match.ts changes. This file only reads its output.

import {
  CATEGORY_LABELS,
  type Category,
  type MatchResult,
  type Opportunity,
  type Profile,
  type Swipe,
  type SwipeDirection,
  type SwipeEvent,
} from "./types";

// ---------------------------------------------------------------------------
// Tuning. Change a number here and re-run scripts/replay-personas.mjs to see the effect.
// ---------------------------------------------------------------------------

/** How much one swipe counts. A pass is weaker evidence than a like: "not now" is not "never". */
const DIRECTION_WEIGHT: Record<SwipeDirection, number> = { like: 1, save: 1, pass: -0.6 };
/** A like on a card scored this low, or a pass on a card scored this high, says the score was wrong, so it counts extra. */
const SURPRISE_MULTIPLIER = 1.3;
const LOW_SCORE = 4;
const HIGH_SCORE = 8;
/** A swipe loses half its weight for every this many days of age (measured from your latest swipe, not the clock). */
const HALF_LIFE_DAYS = 30;
/** Added to the evidence total. Keeps one swipe from swinging a whole feature. */
const SHRINK = 0.8;
/** A card is judged by its strongest few features, so a long tag list does not water it down. */
const TOP_FEATURES = 4;
/** Features that say more about a card count more. */
const NAMESPACE_WEIGHT: Record<string, number> = { topic: 1, skill: 0.8, person: 1.2, major: 0.5, cat: 0.6, role: 0.6 };
/** The most the deck order can lean on swipes, and how many swipes it takes to get there. */
export const MAX_INFLUENCE = 0.6;
const FULL_TRUST_AT = 15;
/** Stretches affinity (usually between -0.5 and 0.5) to fill the 0 to 1 range the match score uses. */
const LEAN_GAIN = 1.5;
/** After this many swipes, every Nth card in each list is a wildcard, so no topic gets buried. */
const EXPLORE_AFTER = 5;
const EXPLORE_EVERY = 5;
/** A wildcard is never a card the user is clearly steering away from. */
const EXPLORE_MIN_AFFINITY = -0.3;
/** Reasons shown on a card, personal ones first. */
const MAX_REASONS = 4;

// ---------------------------------------------------------------------------
// Cards as features
// ---------------------------------------------------------------------------

/** A card reduced to what the recommender needs. */
export interface Candidate {
  /** "opportunity:id" or "person:id", the same keys the deck and history use. */
  key: string;
  title: string;
  features: string[];
}

function norm(text: string): string {
  return text.trim().toLowerCase();
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export function opportunityCandidate(o: Opportunity): Candidate {
  const features = [
    ...o.tags.map((t) => `topic:${norm(t)}`),
    ...o.skills.map((s) => `skill:${norm(s)}`),
    ...o.majors.map((m) => `major:${norm(m)}`),
    `cat:${o.category}`,
  ];
  // Liking a listing also leans toward the person you could chat with about it.
  if (o.contact_profile_id) features.push(`person:${o.contact_profile_id}`);
  return { key: `opportunity:${o.id}`, title: o.title, features: unique(features) };
}

export function personCandidate(p: Profile): Candidate {
  const features = [
    ...p.interests.map((t) => `topic:${norm(t)}`),
    ...p.skills.map((s) => `skill:${norm(s)}`),
    `role:${p.role}`,
    `person:${p.id}`,
  ];
  if (p.major) features.push(`major:${norm(p.major)}`);
  return { key: `person:${p.id}`, title: p.full_name, features: unique(features) };
}

function namespaceOf(feature: string): string {
  return feature.slice(0, feature.indexOf(":"));
}

/** A feature as people would say it. "topic:machine learning" becomes "machine learning". */
export function featureLabel(feature: string): string {
  const name = feature.slice(feature.indexOf(":") + 1);
  if (namespaceOf(feature) === "cat") return CATEGORY_LABELS[name as Category] ?? name;
  return name;
}

// ---------------------------------------------------------------------------
// Taste
// ---------------------------------------------------------------------------

export interface Taste {
  /** Per feature: `net` is signed evidence, `total` is evidence ignoring direction. */
  features: Map<string, { net: number; total: number }>;
  /** Cards that were liked or saved, strongest first. Used for "Because you liked X". */
  positives: { candidate: Candidate; weight: number }[];
  swipeCount: number;
  likeCount: number;
  saveCount: number;
  passCount: number;
  /** Cards whose direction changed at some point. */
  changedMind: number;
  /** How much the deck order leans on swipes, from 0 (cold start) to MAX_INFLUENCE. */
  lambda: number;
}

/**
 * Learn from the current swipes. `candidates` is every card in the deck, because a swipe is
 * only useful if we know what the card was about. Swipes on cards that no longer exist are skipped.
 * `events` adds context: the score a card had when it was swiped.
 */
export function buildTaste(candidates: Candidate[], swipes: Swipe[], events: SwipeEvent[] = []): Taste {
  const byKey = new Map(candidates.map((c) => [c.key, c]));

  // The score on the card the last time it was swiped, and which directions each card has had.
  const lastScore = new Map<string, number>();
  const directions = new Map<string, Set<string>>();
  for (const e of events) {
    const key = `${e.target_type}:${e.target_id}`;
    if (e.action === "undo") continue;
    if (e.match_score != null) lastScore.set(key, e.match_score);
    directions.set(key, (directions.get(key) ?? new Set<string>()).add(e.action));
  }
  let changedMind = 0;
  for (const set of directions.values()) if (set.size > 1) changedMind++;

  // Age is measured from the newest swipe, so coming back after a month does not erase your taste.
  const times = swipes.map((s) => Date.parse(s.created_at)).filter(Number.isFinite);
  const newest = times.length > 0 ? Math.max(...times) : 0;

  const taste: Taste = {
    features: new Map(),
    positives: [],
    swipeCount: 0,
    likeCount: 0,
    saveCount: 0,
    passCount: 0,
    changedMind,
    lambda: 0,
  };

  for (const swipe of swipes) {
    const key = `${swipe.target_type}:${swipe.target_id}`;
    const candidate = byKey.get(key);
    if (!candidate) continue;

    let weight = DIRECTION_WEIGHT[swipe.direction];
    const score = lastScore.get(key);
    if (score != null) {
      if (weight > 0 && score <= LOW_SCORE) weight *= SURPRISE_MULTIPLIER;
      if (weight < 0 && score >= HIGH_SCORE) weight *= SURPRISE_MULTIPLIER;
    }
    const ageDays = Math.max(0, (newest - Date.parse(swipe.created_at)) / 86_400_000);
    const strength = weight * 0.5 ** (Number.isFinite(ageDays) ? ageDays / HALF_LIFE_DAYS : 0);

    // Spread over the card's features, so a card with many tags does not outweigh one with few.
    const share = strength / Math.sqrt(Math.max(1, candidate.features.length));
    for (const feature of candidate.features) {
      const entry = taste.features.get(feature) ?? { net: 0, total: 0 };
      entry.net += share;
      entry.total += Math.abs(share);
      taste.features.set(feature, entry);
    }

    taste.swipeCount++;
    if (swipe.direction === "like") taste.likeCount++;
    else if (swipe.direction === "save") taste.saveCount++;
    else taste.passCount++;
    if (strength > 0) taste.positives.push({ candidate, weight: strength });
  }

  taste.positives.sort((a, b) => b.weight - a.weight || a.candidate.key.localeCompare(b.candidate.key));
  taste.lambda = MAX_INFLUENCE * Math.min(1, taste.swipeCount / FULL_TRUST_AT);
  return taste;
}

/** -1 to 1. How much one feature leans toward things the user liked. 0 when we know nothing. */
function featureAffinity(taste: Taste, feature: string): number {
  const entry = taste.features.get(feature);
  return entry ? entry.net / (entry.total + SHRINK) : 0;
}

/** -1 to 1. How much a card's strongest features lean toward things the user liked. */
export function affinity(taste: Taste, candidate: Candidate): number {
  const leanings = candidate.features
    .map((f) => featureAffinity(taste, f) * (NAMESPACE_WEIGHT[namespaceOf(f)] ?? 1))
    .sort((a, b) => Math.abs(b) - Math.abs(a))
    .slice(0, TOP_FEATURES);
  const sum = leanings.reduce((total, value) => total + value, 0);
  return Math.max(-1, Math.min(1, sum / TOP_FEATURES));
}

/** How much the user has already told us about a card's features. Low means the card is a wildcard. */
function evidence(taste: Taste, candidate: Candidate): number {
  return candidate.features.reduce((total, f) => total + (taste.features.get(f)?.total ?? 0), 0);
}

/** 0 to 1. The prior blended with affinity. This is what the deck sorts by. */
function blended(priorScore: number, taste: Taste, candidate: Candidate): number {
  // Affinity rarely gets near -1 or 1, so stretch it to use the same range as the match score.
  const lean = Math.max(0, Math.min(1, 0.5 + 0.5 * affinity(taste, candidate) * LEAN_GAIN));
  return (1 - taste.lambda) * (priorScore / 10) + taste.lambda * lean;
}

/** Short, specific reasons a card fits, drawn from what the user liked. Never negative: the panel says "Why it fits you". */
export function explain(taste: Taste, candidate: Candidate): string[] {
  const reasons: string[] = [];
  const own = new Set(candidate.features.filter((f) => !["cat", "role"].includes(namespaceOf(f))));

  // The liked card this one is most like.
  let best: { title: string; shared: string[]; strength: number } | null = null;
  for (const { candidate: liked, weight } of taste.positives) {
    if (liked.key === candidate.key) continue;
    const shared = liked.features.filter((f) => own.has(f));
    const meaningful = shared.some((f) => ["topic", "person"].includes(namespaceOf(f)));
    if (shared.length < 2 || !meaningful) continue;
    const strength = shared.length * weight;
    if (!best || strength > best.strength) best = { title: liked.title, shared, strength };
  }
  const named = new Set<string>();
  if (best) {
    const labels = best.shared.filter((f) => ["topic", "skill"].includes(namespaceOf(f))).slice(0, 3);
    labels.forEach((f) => named.add(f));
    reasons.push(
      labels.length > 0
        ? `Because you liked ${best.title} (${labels.map(featureLabel).join(", ")})`
        : `Because you liked ${best.title}`,
    );
  }

  // The topic they keep picking, if it is not already named above.
  const habit = candidate.features
    .filter((f) => namespaceOf(f) === "topic" && !named.has(f))
    .map((f) => ({ f, lean: featureAffinity(taste, f) }))
    .filter(({ lean }) => lean >= 0.3)
    .sort((a, b) => b.lean - a.lean || a.f.localeCompare(b.f))[0];
  if (habit) reasons.push(`You keep picking ${featureLabel(habit.f)}`);

  return reasons;
}

/** The card's match with personal reasons added and the score nudged by taste. Unchanged at cold start. */
export function personalize(prior: MatchResult, taste: Taste, candidate: Candidate): MatchResult {
  if (taste.lambda === 0) return prior;
  const score = Math.max(1, Math.min(10, Math.round(blended(prior.score, taste, candidate) * 10)));
  const personal = explain(taste, candidate);
  const base = personal.length > 0 ? prior.reasons.filter((r) => !r.startsWith("No strong overlap")) : prior.reasons;
  return { score, reasons: [...personal, ...base].slice(0, MAX_REASONS) };
}

// ---------------------------------------------------------------------------
// Ordering the deck
// ---------------------------------------------------------------------------

export type RankableItem =
  | { kind: "opportunity"; opportunity: Opportunity; match: MatchResult }
  | { kind: "person"; person: Profile; match: MatchResult };

export function itemCandidate(item: RankableItem): Candidate {
  return item.kind === "opportunity" ? opportunityCandidate(item.opportunity) : personCandidate(item.person);
}

/**
 * Put the cards you have not swiped in the order you are most likely to want them.
 *
 * `items` are the cards still to swipe, in their starting order (match score, with a person every few cards).
 * `pinnedKeys` are cards that must stay at the front in that order, which is how the deck keeps the cards
 * already on screen from jumping around when a swipe changes the ranking.
 *
 * Opportunities and people are ranked separately and put back into the same slots they had,
 * so the deck keeps its mix. After a few swipes, every fifth card in each list is a wildcard
 * from the part of the deck you have told us least about.
 */
export function rankDeck<T extends RankableItem>(items: T[], taste: Taste, pinnedKeys: string[] = []): T[] {
  const entries = items.map((item, index) => ({ item, index, candidate: itemCandidate(item) }));
  const byKey = new Map(entries.map((e) => [e.candidate.key, e]));

  const pinned: typeof entries = [];
  for (const key of pinnedKeys) {
    const entry = byKey.get(key);
    if (entry && !pinned.includes(entry)) pinned.push(entry);
  }
  const rest = entries.filter((e) => !pinned.includes(e));

  const withMatch = (e: (typeof entries)[number]): T =>
    ({ ...e.item, match: personalize(e.item.match, taste, e.candidate) }) as T;

  if (taste.lambda === 0) return [...pinned, ...rest].map(withMatch);

  const scored = rest.map((e) => ({
    ...e,
    rank: blended(e.item.match.score, taste, e.candidate),
    lean: affinity(taste, e.candidate),
    seen: evidence(taste, e.candidate),
  }));

  const orderList = (kind: RankableItem["kind"]) => {
    const list = scored.filter((s) => s.item.kind === kind);
    const ranked = [...list].sort((a, b) => b.rank - a.rank || a.index - b.index);
    if (taste.swipeCount < EXPLORE_AFTER) return ranked;

    // Wildcards: the least-explored cards that are not clearly unwanted.
    const wildcards = list
      .filter((s) => s.lean > EXPLORE_MIN_AFFINITY)
      .sort((a, b) => a.seen - b.seen || b.rank - a.rank || a.index - b.index);
    const used = new Set<(typeof list)[number]>();
    const out: typeof list = [];
    let r = 0;
    let w = 0;
    while (out.length < ranked.length) {
      let pick: (typeof list)[number] | undefined;
      if ((out.length + 1) % EXPLORE_EVERY === 0) {
        while (w < wildcards.length && used.has(wildcards[w])) w++;
        pick = wildcards[w];
      }
      if (!pick) {
        while (used.has(ranked[r])) r++;
        pick = ranked[r];
      }
      used.add(pick);
      out.push(pick);
    }
    return out;
  };

  const lists = { opportunity: orderList("opportunity"), person: orderList("person") };
  const cursor = { opportunity: 0, person: 0 };
  const ordered = rest.map((slot) => lists[slot.item.kind][cursor[slot.item.kind]++]);

  return [...pinned, ...ordered].map(withMatch);
}

// ---------------------------------------------------------------------------
// What the history screen shows about your taste
// ---------------------------------------------------------------------------

export interface TasteSummary {
  swipeCount: number;
  likeCount: number;
  saveCount: number;
  passCount: number;
  changedMind: number;
  /** How sure the deck is about you. */
  confidence: "none" | "warming up" | "learning" | "confident";
  /** 0 to 0.6. The share of the deck order that comes from swipes instead of the match score. */
  influence: number;
  /** Topics and skills you lean toward, strongest first. */
  likes: string[];
  /** Topics and skills you lean away from, strongest first. */
  avoids: string[];
  /** Kinds of listing you liked or saved, most first. */
  categories: { category: Category; count: number }[];
}

export function summarizeTaste(taste: Taste): TasteSummary {
  const named = [...taste.features.entries()].filter(([f]) => ["topic", "skill"].includes(namespaceOf(f)));
  // A word can be both a topic and a skill ("research"), so list each word once.
  const likes = unique(
    named
      .filter(([, e]) => e.net >= 0.3)
      .sort((a, b) => b[1].net - a[1].net || a[0].localeCompare(b[0]))
      .map(([f]) => featureLabel(f)),
  ).slice(0, 6);
  const avoids = unique(
    named
      .filter(([, e]) => e.net <= -0.2)
      .sort((a, b) => a[1].net - b[1].net || a[0].localeCompare(b[0]))
      .map(([f]) => featureLabel(f)),
  ).slice(0, 4);

  const counts = new Map<Category, number>();
  for (const { candidate } of taste.positives) {
    const cat = candidate.features.find((f) => namespaceOf(f) === "cat");
    if (cat) counts.set(cat.slice(4) as Category, (counts.get(cat.slice(4) as Category) ?? 0) + 1);
  }
  const categories = [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  const n = taste.swipeCount;
  const confidence = n === 0 ? "none" : n < 5 ? "warming up" : n < FULL_TRUST_AT ? "learning" : "confident";
  return {
    swipeCount: n,
    likeCount: taste.likeCount,
    saveCount: taste.saveCount,
    passCount: taste.passCount,
    changedMind: taste.changedMind,
    confidence,
    influence: taste.lambda,
    likes,
    avoids,
    categories,
  };
}

// ---------------------------------------------------------------------------
// Sample tastes, for demos and for the replay script
// ---------------------------------------------------------------------------

export interface Persona {
  id: string;
  label: string;
  blurb: string;
  /** Topics and skills this person gravitates to. */
  topics: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "robotics",
    label: "Robotics builder",
    blurb: "Hardware, aerospace, robotics",
    topics: ["robotics", "hardware", "aerospace", "engineering", "electronics", "cad"],
  },
  {
    id: "finance",
    label: "Finance and quant",
    blurb: "Markets, consulting, business",
    topics: ["finance", "quant", "investing", "consulting", "business", "economics"],
  },
  {
    id: "research",
    label: "ML researcher",
    blurb: "NLP, data science, research",
    topics: ["nlp", "data science", "research", "science", "machine learning"],
  },
];

/** How many of a persona's topics a card touches. */
export function personaOverlap(persona: Persona, candidate: Candidate): number {
  const wanted = new Set(persona.topics);
  return candidate.features.filter(
    (f) => ["topic", "skill"].includes(namespaceOf(f)) && wanted.has(f.slice(f.indexOf(":") + 1)),
  ).length;
}

/**
 * Swipes a persona would plausibly make: Interested on their best fits, one Save, and a few Passes
 * on cards that have nothing to do with them. Newest swipe first, like the real store.
 */
export function personaHistory(
  persona: Persona,
  candidates: Candidate[],
  now: number,
): { swipes: Swipe[]; events: SwipeEvent[] } {
  const scored = candidates
    .map((candidate) => ({ candidate, overlap: personaOverlap(persona, candidate) }))
    .sort((a, b) => b.overlap - a.overlap || a.candidate.key.localeCompare(b.candidate.key));

  const fits = scored.filter((s) => s.overlap > 0);
  const misses = scored.filter((s) => s.overlap === 0).reverse();

  // Passes come from different kinds of card, so one category is not blamed for everything.
  const passes: Candidate[] = [];
  const seenCats = new Set<string>();
  for (const { candidate } of misses) {
    const cat = candidate.features.find((f) => namespaceOf(f) === "cat") ?? candidate.key.split(":")[0];
    if (seenCats.has(cat)) continue;
    seenCats.add(cat);
    passes.push(candidate);
    if (passes.length === 5) break;
  }

  // Every other good fit, so plenty of fitting cards are left in the deck to be recommended.
  const spread = fits.filter((_, i) => i % 2 === 0).slice(0, 9);

  const picks: { candidate: Candidate; direction: SwipeDirection }[] = [
    ...spread.map((s, i) => ({ candidate: s.candidate, direction: (i === 3 ? "save" : "like") as SwipeDirection })),
    ...passes.map((candidate) => ({ candidate, direction: "pass" as SwipeDirection })),
  ];

  // Oldest first in time: the Interested and Save swipes, then the passes.
  const ordered =picks.sort((a, b) => (a.direction === "pass" ? 1 : 0) - (b.direction === "pass" ? 1 : 0));
  const stamped = ordered.map((pick, i) => ({
    ...pick,
    created_at: new Date(now - (ordered.length - i) * 20_000).toISOString(),
  }));

  const toTarget = (key: string) => {
    const [target_type, ...rest] = key.split(":");
    return { target_type: target_type as "opportunity" | "person", target_id: rest.join(":") };
  };
  const swipes: Swipe[] = stamped
    .map((p) => ({ ...toTarget(p.candidate.key), direction: p.direction, created_at: p.created_at }))
    .reverse();
  const events: SwipeEvent[] = stamped.map((p, i) => ({
    id: `demo-${persona.id}-${i}`,
    ...toTarget(p.candidate.key),
    action: p.direction,
    created_at: p.created_at,
    match_score: null,
    position: i + 1,
    source: "demo",
  }));
  return { swipes, events };
}

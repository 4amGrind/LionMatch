// Checks the recommender (src/lib/recommend.ts) without opening the app.
//   npm run replay
//
// Part 1 runs a few rules that must always hold, like "no swipes means the same order as before".
// Part 2 replays made-up people through the deck and counts how many cards they like in their first
// 10 and 20, with and without the recommender. Each person is a little inconsistent (10 percent of
// their swipes flip), so the numbers are honest rather than perfect.
//
// The files are TypeScript, so this compiles them to a temp folder first. Nothing is added to the repo.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = mkdtempSync(join(tmpdir(), "ct-replay-"));
mkdirSync(out, { recursive: true });
for (const name of ["types", "match", "recommend"]) {
  const source = readFileSync(join(root, "src/lib", `${name}.ts`), "utf8");
  const js = ts
    .transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
    .outputText.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
  writeFileSync(join(out, `${name}.mjs`), js);
}
const load = (name) => import(pathToFileURL(join(out, `${name}.mjs`)).href);
const { matchOpportunity, matchPerson } = await load("match");
const R = await load("recommend");

const opportunities = JSON.parse(readFileSync(join(root, "src/data/opportunities.json"), "utf8"));
const profiles = JSON.parse(readFileSync(join(root, "src/data/profiles.json"), "utf8"));
const user = profiles.find((p) => p.id === "demo-you");
const people = profiles.filter((p) => p.id !== "demo-you");

// The deck as src/app/page.tsx builds it: best matches first, a person after every third listing.
function startingDeck() {
  const byScore = (a, b) => b.match.score - a.match.score;
  const opps = opportunities.map((opportunity) => ({ kind: "opportunity", opportunity, match: matchOpportunity(user, opportunity) })).sort(byScore);
  const folks = people.map((person) => ({ kind: "person", person, match: matchPerson(user, person) })).sort(byScore);
  const items = [];
  opps.forEach((card, i) => {
    items.push(card);
    if ((i + 1) % 3 === 0 && folks.length > 0) items.push(folks.shift());
  });
  return [...items, ...folks];
}

const deck = startingDeck();
const candidates = deck.map(R.itemCandidate);
const keyOf = (item) => R.itemCandidate(item).key;
const toSwipe = (key, direction, at) => {
  const [target_type, ...rest] = key.split(":");
  return { target_type, target_id: rest.join(":"), direction, created_at: new Date(at).toISOString() };
};

// ---------------------------------------------------------------------------
// Part 1: rules that must always hold
// ---------------------------------------------------------------------------
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}
console.log("Rules");

check("no swipes: same order, same cards, same scores", () => {
  const taste = R.buildTaste(candidates, [], []);
  const ranked = R.rankDeck(deck, taste);
  assert.deepEqual(ranked.map(keyOf), deck.map(keyOf));
  assert.deepEqual(ranked.map((i) => i.match), deck.map((i) => i.match));
});

const robotics = R.PERSONAS.find((p) => p.id === "robotics");
const history = R.personaHistory(robotics, candidates, Date.UTC(2026, 10, 20));
const learned = R.buildTaste(candidates, history.swipes, history.events);
const seen = new Set(history.swipes.map((s) => `${s.target_type}:${s.target_id}`));
const remaining = deck.filter((i) => !seen.has(keyOf(i)));

check("ranking only reorders: nothing lost, nothing repeated", () => {
  const ranked = R.rankDeck(remaining, learned);
  assert.equal(ranked.length, remaining.length);
  assert.deepEqual(ranked.map(keyOf).sort(), remaining.map(keyOf).sort());
});

check("every slot keeps its kind, so the deck keeps its mix of listings and people", () => {
  const ranked = R.rankDeck(remaining, learned);
  assert.deepEqual(ranked.map((i) => i.kind), remaining.map((i) => i.kind));
});

check("pinned cards stay at the front, in order", () => {
  const pins = remaining.slice(5, 8).map(keyOf).reverse();
  const ranked = R.rankDeck(remaining, learned, pins);
  assert.deepEqual(ranked.slice(0, 3).map(keyOf), pins);
});

check("swipes never count for more than their cap in the order", () => {
  const many = candidates.slice(0, 40).map((c, i) => toSwipe(c.key, "like", i * 1000));
  assert.ok(R.buildTaste(candidates, many, []).lambda <= R.MAX_INFLUENCE + 1e-9);
});

check("after liking a robotics club, robotics cards say why", () => {
  const first = deck.find((i) => i.kind === "opportunity" && i.opportunity.tags.includes("robotics"));
  const taste = R.buildTaste(candidates, [toSwipe(keyOf(first), "like", 0)], []);
  const other = deck.find((i) => i.kind === "opportunity" && i.opportunity.tags.includes("robotics") && keyOf(i) !== keyOf(first));
  assert.ok(other, "needs a second robotics listing in the seed data");
  const reasons = R.rankDeck([other], taste)[0].match.reasons;
  assert.ok(reasons.some((r) => r.startsWith("Because you liked")), reasons.join(" | "));
});

check("a pass lowers a card's neighbours and a like raises them", () => {
  const target = deck.find((i) => i.kind === "opportunity" && i.opportunity.tags.includes("robotics"));
  const neighbour = deck.find((i) => i.kind === "opportunity" && i.opportunity.tags.includes("robotics") && keyOf(i) !== keyOf(target));
  const c = R.itemCandidate(neighbour);
  const liked = R.affinity(R.buildTaste(candidates, [toSwipe(keyOf(target), "like", 0)], []), c);
  const passed_ = R.affinity(R.buildTaste(candidates, [toSwipe(keyOf(target), "pass", 0)], []), c);
  assert.ok(liked > 0 && passed_ < 0 && Math.abs(liked) > Math.abs(passed_), `like ${liked.toFixed(2)}, pass ${passed_.toFixed(2)}`);
});

check("one like moves a card's affinity only part of the way", () => {
  const target = deck.find((i) => i.kind === "opportunity");
  const taste = R.buildTaste(candidates, [toSwipe(keyOf(target), "like", 0)], []);
  assert.ok(R.affinity(taste, R.itemCandidate(target)) < 0.6);
});

// ---------------------------------------------------------------------------
// Part 2: replay made-up people
// ---------------------------------------------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Swipe through the deck one card at a time. Returns, per card shown, whether the person liked it. */
function replay(persona, personalized, seed, steps = 20) {
  const random = rng(seed);
  const swipes = [];
  const likedFlags = [];
  let pool = deck;
  let pinned = [];
  for (let step = 0; step < steps && pool.length > 0; step++) {
    const taste = R.buildTaste(candidates, swipes, []);
    const ordered = personalized ? R.rankDeck(pool, taste, pinned) : pool;
    const top = ordered[0];
    const wants = R.personaOverlap(persona, R.itemCandidate(top)) > 0;
    const like = random() < 0.1 ? !wants : wants;
    likedFlags.push(like);
    swipes.unshift(toSwipe(keyOf(top), like ? "like" : "pass", Date.UTC(2026, 10, 20) + step * 15_000));
    pool = ordered.slice(1);
    pinned = pool.slice(0, 3).map(keyOf); // What is on screen stays put, as in the real deck.
  }
  return likedFlags;
}

const RUNS = 200;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(`\nLikes among the first cards shown (${RUNS} replays each, 10% of swipes flip)\n`);
console.log("persona              first 10 cards          first 20 cards");
console.log("                     before  after           before  after");
// The starting order already suits the demo profile (ML and AI), so a persona like it has little to gain.
// The bar: never meaningfully worse, and clearly better for people whose taste differs from the profile.
let neverWorse = true;
let clearGains = 0;
for (const persona of R.PERSONAS) {
  const stats = { before: { 10: [], 20: [] }, after: { 10: [], 20: [] } };
  for (let seed = 1; seed <= RUNS; seed++) {
    for (const [label, personalized] of [["before", false], ["after", true]]) {
      const flags = replay(persona, personalized, seed);
      stats[label][10].push(flags.slice(0, 10).filter(Boolean).length);
      stats[label][20].push(flags.filter(Boolean).length);
    }
  }
  const row = (label) => [mean(stats[label][10]), mean(stats[label][20])];
  const [b10, b20] = row("before");
  const [a10, a20] = row("after");
  if (a10 < b10 - 0.3 || a20 < b20 - 0.3) neverWorse = false;
  if (a20 >= b20 + 1) clearGains++;
  console.log(
    `${persona.label.padEnd(20)} ${b10.toFixed(1).padStart(5)}  ${a10.toFixed(1).padStart(5)}           ${b20.toFixed(1).padStart(5)}  ${a20.toFixed(1).padStart(5)}`,
  );
}

// ---------------------------------------------------------------------------
// Part 3: what the demo shows. Load a sample taste, then look at the next five cards.
// ---------------------------------------------------------------------------
console.log("\nRight after loading a sample taste: how many of the next 5 cards fit the persona");
console.log("(out of the most that could, given how many fitting cards are left)\n");
console.log("persona              before  after  possible");
let demoNeverWorse = true;
let demoWins = 0;
for (const persona of R.PERSONAS) {
  const hist = R.personaHistory(persona, candidates, Date.UTC(2026, 10, 20));
  const taste = R.buildTaste(candidates, hist.swipes, hist.events);
  const seenKeys = new Set(hist.swipes.map((s) => `${s.target_type}:${s.target_id}`));
  const left = deck.filter((i) => !seenKeys.has(keyOf(i)));
  const fitting = (list) => list.filter((i) => R.personaOverlap(persona, R.itemCandidate(i)) > 0);
  const inTop5 = (list) => fitting(list.slice(0, 5)).length;
  const possible = Math.min(5, fitting(left).length);
  const before = inTop5(left);
  const after = inTop5(R.rankDeck(left, taste));
  if (after < before) demoNeverWorse = false;
  if (after >= Math.min(possible, 3) && after > before) demoWins++;
  console.log(`${persona.label.padEnd(20)} ${String(before).padStart(5)}  ${String(after).padStart(5)}  ${String(possible).padStart(8)}`);
}
console.log(
  "\nA persona scores low here when it disagrees with the demo profile (ML and AI). The profile match still\n" +
    "carries 40 to 60 percent of the order, so a finance club the profile scores 5/10 can sit behind ML cards\n" +
    "scored 9 or 10. Edit the profile on the Profile tab to match and the deck follows.",
);
assert.ok(demoNeverWorse, "loading a sample taste should never push fitting cards further away");
assert.ok(demoWins >= 1, "loading a sample taste should pull at least one persona's fitting cards into the next 5");

assert.ok(neverWorse, "personalizing should never find meaningfully fewer liked cards");
assert.ok(clearGains >= 2, "personalizing should find at least one more liked card in the first 20 for people unlike the demo profile");
console.log(`\n${passed} rules held. Personalizing was never worse and clearly better for ${clearGains} of ${R.PERSONAS.length} personas.`);

"use client";

// Explore and search. OWNER: Peter.
// Two tabs: opportunities and people. Everything filters in the browser,
// so typing and tapping filters feel instant.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { daysUntil, deadlineLabel, type PrerequisiteStatus } from "@/lib/prerequisites";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type MatchResult,
  type Opportunity,
  type Profile,
} from "@/lib/types";
import { CategoryBadge, EmptyState, SampleBadge, ScoreBadge, TagList } from "./ui";

export interface ExploreItem {
  opportunity: Opportunity;
  match: MatchResult;
  prerequisites: PrerequisiteStatus;
}

export interface ExplorePerson {
  person: Profile;
  match: MatchResult;
}

export type ExploreTab = "opportunities" | "people";

type OpportunitySort = "match" | "deadline" | "name";
type DeadlineFilter = "any" | "open" | "soon";
type PeopleSort = "match" | "name";

/** "Due soon" means within this many days. */
const SOON_DAYS = 30;

function searchWords(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesWords(fields: (string | null)[], words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** Sort key for deadlines: upcoming soonest first, then no deadline, then closed ones. */
function deadlineRank(deadline: string | null, today: string): number {
  if (!deadline) return 1e6;
  const days = daysUntil(deadline, today);
  return days < 0 ? 2e6 - days : days;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
        active ? "border-ct-navy bg-ct-navy text-ct-on-navy" : "border-ct-line bg-ct-card text-ct-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ct-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-xl border border-ct-line bg-ct-card px-3 py-2 text-sm text-ct-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ct-line bg-ct-card px-4 py-3 text-sm placeholder:text-ct-muted"
      />
    </label>
  );
}

function ResultCount({ count }: { count: number }) {
  return (
    <p className="text-xs text-ct-muted" aria-live="polite">
      {count} {count === 1 ? "result" : "results"}
    </p>
  );
}

/** "2 of 3 prerequisites met", colored by how close the user is. */
function PrerequisiteSummary({ status }: { status: PrerequisiteStatus }) {
  if (status.total === 0) return null;
  const color = status.allMet ? "text-ct-like" : status.metCount > 0 ? "text-ct-save" : "text-ct-pass";
  return (
    <p className={`text-xs font-semibold ${color}`}>
      {status.allMet
        ? "You meet every prerequisite"
        : `${status.metCount} of ${status.total} prerequisites met`}
    </p>
  );
}

function OpportunitiesTab({ items, today }: { items: ExploreItem[]; today: string }) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<OpportunitySort>("match");
  const [deadline, setDeadline] = useState<DeadlineFilter>("any");
  const [qualifiedOnly, setQualifiedOnly] = useState(false);

  const words = searchWords(search);
  const visible = items
    .filter(({ opportunity: o, prerequisites }) => {
      if (category !== "all" && o.category !== category) return false;
      if (qualifiedOnly && !prerequisites.allMet) return false;
      if (deadline !== "any" && o.deadline) {
        const days = daysUntil(o.deadline, today);
        if (days < 0) return false;
        if (deadline === "soon" && days > SOON_DAYS) return false;
      } else if (deadline === "soon") {
        return false; // No deadline listed, so it is not "due soon".
      }
      return matchesWords(
        [o.title, o.organization, o.description, ...o.tags, ...o.skills, ...o.prerequisites],
        words,
      );
    })
    .sort((a, b) => {
      if (sort === "name") return a.opportunity.title.localeCompare(b.opportunity.title);
      if (sort === "deadline") {
        const diff = deadlineRank(a.opportunity.deadline, today) - deadlineRank(b.opportunity.deadline, today);
        if (diff !== 0) return diff;
      }
      return b.match.score - a.match.score || a.opportunity.title.localeCompare(b.opportunity.title);
    });

  return (
    <div className="space-y-3">
      <SearchBox
        value={search}
        onChange={setSearch}
        label="Search opportunities"
        placeholder="Search by name, skill, topic, or course"
      />

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
        {(["all", ...CATEGORIES] as const).map((option) => (
          <Chip key={option} active={category === option} onClick={() => setCategory(option)}>
            {option === "all" ? "All" : CATEGORY_LABELS[option]}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2">
        <Select
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "match", label: "Best match" },
            { value: "deadline", label: "Deadline" },
            { value: "name", label: "Name A–Z" },
          ]}
        />
        <Select
          label="Deadline"
          value={deadline}
          onChange={setDeadline}
          options={[
            { value: "any", label: "Any" },
            { value: "open", label: "Hide closed" },
            { value: "soon", label: `Due in ${SOON_DAYS} days` },
          ]}
        />
      </div>

      <Chip active={qualifiedOnly} onClick={() => setQualifiedOnly((on) => !on)}>
        {qualifiedOnly ? "✓ " : ""}Only ones I meet the prerequisites for
      </Chip>

      <ResultCount count={visible.length} />

      {visible.length === 0 ? (
        <EmptyState>
          {deadline === "soon"
            ? `Nothing is due in the next ${SOON_DAYS} days. Try a different deadline filter.`
            : "Nothing matches that search. Try a different word or filter."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map(({ opportunity: o, match, prerequisites }) => {
            const due = deadlineLabel(o.deadline, today);
            return (
              <li key={o.id}>
                <Link
                  href={`/opportunities/${o.id}`}
                  className="block rounded-2xl border border-ct-line bg-ct-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <CategoryBadge category={o.category} />
                    <ScoreBadge score={match.score} />
                  </div>
                  <h2 className="mt-2 font-semibold leading-snug text-ct-navy">{o.title}</h2>
                  <p className="text-sm text-ct-muted">{o.organization}</p>
                  {due || prerequisites.total > 0 ? (
                    <div className="mt-1.5 space-y-0.5">
                      {due ? <p className="text-xs font-medium text-ct-ink">{due}</p> : null}
                      <PrerequisiteSummary status={prerequisites} />
                    </div>
                  ) : null}
                  <div className="mt-2">
                    <TagList items={o.tags} max={3} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PeopleTab({ people }: { people: ExplorePerson[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PeopleSort>("match");
  const [openOnly, setOpenOnly] = useState(false);

  const words = searchWords(search);
  const visible = people
    .filter(({ person: p }) => {
      if (openOnly && !p.open_to_chat) return false;
      return matchesWords([p.full_name, p.headline, p.school, p.major, p.bio, ...p.skills, ...p.interests], words);
    })
    .sort((a, b) =>
      sort === "name"
        ? a.person.full_name.localeCompare(b.person.full_name)
        : b.match.score - a.match.score || a.person.full_name.localeCompare(b.person.full_name),
    );

  return (
    <div className="space-y-3">
      <SearchBox
        value={search}
        onChange={setSearch}
        label="Search people"
        placeholder="Search by name, major, skill, or interest"
      />

      <div className="flex items-end gap-2">
        <Select
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "match", label: "Best match" },
            { value: "name", label: "Name A–Z" },
          ]}
        />
        <div className="flex-1">
          <Chip active={openOnly} onClick={() => setOpenOnly((on) => !on)}>
            {openOnly ? "✓ " : ""}Open to chat
          </Chip>
        </div>
      </div>

      <ResultCount count={visible.length} />

      {visible.length === 0 ? (
        <EmptyState>Nobody matches that search. Try a different word or filter.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map(({ person: p, match }) => (
            <li key={p.id}>
              <Link href={`/people/${p.id}`} className="block rounded-2xl border border-ct-line bg-ct-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold leading-snug text-ct-navy">{p.full_name}</h2>
                    <p className="text-sm text-ct-muted">{p.headline}</p>
                  </div>
                  <ScoreBadge score={match.score} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.is_sample ? <SampleBadge /> : null}
                  {p.open_to_chat ? (
                    <span className="text-xs font-semibold text-ct-like">Open to coffee chats</span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <TagList items={p.interests} max={3} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ExploreList({
  items,
  people,
  today,
  initialTab = "opportunities",
}: {
  items: ExploreItem[];
  people: ExplorePerson[];
  /** Today's date from the server, so the page and the browser agree on deadlines. */
  today: string;
  initialTab?: ExploreTab;
}) {
  const [tab, setTab] = useState<ExploreTab>(initialTab);

  function choose(next: ExploreTab) {
    setTab(next);
    // Keep the tab in the address, so Back from a profile returns to the People tab.
    window.history.replaceState(null, "", next === "people" ? "?tab=people" : window.location.pathname);
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="What to explore" className="glass-surface grid grid-cols-2 gap-1 rounded-2xl p-1">
        {(["opportunities", "people"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => choose(option)}
            className={`rounded-xl py-2 text-sm font-semibold ${
              tab === option ? "bg-ct-navy text-ct-on-navy" : "text-ct-muted hover:text-ct-navy"
            }`}
          >
            {option === "opportunities" ? `Opportunities (${items.length})` : `People (${people.length})`}
          </button>
        ))}
      </div>

      {tab === "opportunities" ? <OpportunitiesTab items={items} today={today} /> : <PeopleTab people={people} />}
    </div>
  );
}

// What one card in the swipe deck shows. OWNER: Max.
// The deck (SwipeDeck.tsx) handles dragging and animation. This file only lays out the content.
// Each card looks like an index divider: a colored tab names the kind of card, the body holds the details.

import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_LABELS, type MatchResult, type Opportunity, type Profile, type ProfileRole } from "@/lib/types";
import { CATEGORY_BG, MatchPanel, SampleBadge, TagList } from "./ui";

export type DeckItem =
  | { kind: "opportunity"; opportunity: Opportunity; match: MatchResult }
  | { kind: "person"; person: Profile; match: MatchResult };

/** Same shape as the keys the swipe store uses, like "opportunity:abc". */
export function deckKey(item: DeckItem): string {
  return item.kind === "opportunity" ? `opportunity:${item.opportunity.id}` : `person:${item.person.id}`;
}

export function deckTargetId(item: DeckItem): string {
  return item.kind === "opportunity" ? item.opportunity.id : item.person.id;
}

const ROLE_LABELS: Record<ProfileRole, string> = {
  student: "Student",
  club_lead: "Club lead",
  researcher: "Researcher",
  alum: "Alum",
  recruiter: "Recruiter",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Links inside a draggable card. `draggable={false}` stops the browser's own link drag from fighting the swipe. */
function DetailLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      draggable={false}
      className="mt-auto self-start text-sm font-semibold text-ct-navy underline decoration-ct-navy/30 decoration-2 underline-offset-4 hover:decoration-ct-navy"
    >
      {children}
    </Link>
  );
}

/** Short facts in a row, like where and how much time. */
function Facts({ items }: { items: (string | null | undefined)[] }) {
  const shown = items.filter(Boolean) as string[];
  if (shown.length === 0) return null;
  return (
    <p className="deck-facts mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ct-muted">
      {shown.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </p>
  );
}

/**
 * How clearly each card in the stack shows its details, by depth (0 is the top card).
 * The next card shows its details faintly, so you get a hint of what is coming while you drag.
 * The top card is solid, so that faint text never shows through it.
 */
const DEPTH_TEXT = ["opacity-100", "opacity-40", "opacity-15", "opacity-0"];
const DEPTH_TAB = ["opacity-100", "opacity-70", "opacity-35", "opacity-0"];

/**
 * Cards behind the top one sit a little lower, so their bottom edge always peeks out under it.
 * Fade the bottom of their text so that strip shows a clean edge, not a ghost "See full details".
 * The rest of the faint preview is still there while you drag the top card away.
 */
const BACK_CARD_FADE = "linear-gradient(to bottom, black calc(100% - 96px), transparent calc(100% - 36px))";

function Shell({
  tab,
  tabClass,
  overlay,
  depth,
  children,
}: {
  tab: string;
  tabClass: string;
  overlay?: ReactNode;
  depth: number;
  children: ReactNode;
}) {
  const level = Math.min(depth, DEPTH_TEXT.length - 1);
  return (
    <div className="flex h-full flex-col">
      <div
        className={`self-start rounded-t-2xl px-4 pb-1.5 pt-2 text-xs font-semibold transition-opacity duration-300 ${tabClass} ${DEPTH_TAB[level]}`}
      >
        {tab}
      </div>
      {/* Cards are solid, so a card behind never shows through. `deck-body` lets the content shrink to fit short screens. */}
      <div className="glass-card deck-body relative min-h-0 flex-1 overflow-hidden rounded-[26px] rounded-tl-none">
        <div
          className={`flex h-full flex-col gap-3 p-5 transition-opacity duration-300 [&>*]:shrink-0 ${DEPTH_TEXT[level]}`}
          style={level > 0 ? { maskImage: BACK_CARD_FADE, WebkitMaskImage: BACK_CARD_FADE } : undefined}
        >
          {children}
        </div>
        {overlay}
      </div>
    </div>
  );
}

/** `depth` is the card's place in the stack: 0 is the top card, which shows everything. */
export default function DeckCard({ item, overlay, depth = 0 }: { item: DeckItem; overlay?: ReactNode; depth?: number }) {
  if (item.kind === "person") {
    const { person, match } = item;
    return (
      <Shell tab="Person to meet" tabClass="bg-ct-cat-person text-ct-deep" overlay={overlay} depth={depth}>
        <div className="flex items-center gap-3.5">
          <div
            aria-hidden="true"
            className="display flex size-16 shrink-0 items-center justify-center rounded-full bg-ct-blue text-[24px]"
          >
            {initials(person.full_name)}
          </div>
          <div className="min-w-0">
            <h2 className="deck-title display line-clamp-2 text-[30px] text-ct-navy">{person.full_name}</h2>
            <p className="mt-1 text-sm font-medium text-ct-ink">{person.headline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {person.is_sample ? <SampleBadge /> : null}
          {person.open_to_chat ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ct-like/10 px-2 py-0.5 text-xs font-semibold text-ct-like">
              <span className="size-1.5 rounded-full bg-ct-like" aria-hidden="true" />
              Open to coffee chats
            </span>
          ) : null}
        </div>
        <Facts items={[ROLE_LABELS[person.role], person.school, person.class_year ? `Class of ${person.class_year}` : null]} />

        {person.bio ? <p className="deck-desc line-clamp-2 text-[15px] leading-relaxed">{person.bio}</p> : null}
        <div className="deck-tags">
          <TagList items={[...person.skills, ...person.interests]} max={4} />
        </div>
        <div className="deck-reasons">
          <MatchPanel match={match} />
        </div>

        <DetailLink href={`/people/${person.id}`}>See profile</DetailLink>
      </Shell>
    );
  }

  const { opportunity, match } = item;
  return (
    <Shell
      tab={CATEGORY_LABELS[opportunity.category]}
      tabClass={`${CATEGORY_BG[opportunity.category]} text-white`}
      overlay={overlay}
      depth={depth}
    >
      <div>
        <h2 className="deck-title display line-clamp-3 text-[30px] text-ct-navy">{opportunity.title}</h2>
        <p className="mt-2 text-sm font-semibold text-ct-ink">{opportunity.organization}</p>
        <Facts items={[opportunity.location, opportunity.commitment]} />
      </div>

      <p className="deck-desc line-clamp-3 text-[15px] leading-relaxed">{opportunity.description}</p>
      <div className="deck-reasons">
        <MatchPanel match={match} />
      </div>

      <DetailLink href={`/opportunities/${opportunity.id}`}>See full details</DetailLink>
    </Shell>
  );
}

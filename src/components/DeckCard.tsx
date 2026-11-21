"use client";

// What one card in the swipe deck shows. OWNER: Max.
// The deck (SwipeDeck.tsx) handles dragging and animation. This file only lays out the content.
// Each card looks like an index divider: a colored tab names the kind of card, the body holds the details.

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { deadlineLabel, todayIso } from "@/lib/prerequisites";
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

/**
 * The "See full details" line at the bottom of a card. It looks like a link, but the whole card is
 * the link (see Shell), so a tap anywhere on it opens the detail page, the way Tinder opens a profile.
 */
function DetailLink({ children }: { children: string }) {
  return (
    <span className="mt-auto self-start text-sm font-semibold text-ct-navy underline decoration-ct-navy/30 decoration-2 underline-offset-4 group-hover:decoration-ct-navy">
      {children}
    </span>
  );
}

/**
 * "Due Feb 1, 2027", with "(est.)" when the date is a placeholder rather than from an official page.
 * The deck only draws in the browser (see SwipeDeck), so today's date here matches the person's clock.
 */
function dueLabel(opportunity: Opportunity): string | null {
  const label = deadlineLabel(opportunity.deadline, todayIso());
  return label && opportunity.deadline_estimated ? `${label} (est.)` : label;
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

/**
 * The parts of a card that give way, in order, when it has more to say than fits.
 * The container queries in globals.css trim cards on short screens. This catches what they miss,
 * like a person card with a long "Because you liked" reason, so the bottom link is never cut off.
 * `keep` hides reasons from the end, one at a time, down to that many.
 */
const FIT_STEPS: { selector: string; keep?: number }[] = [
  { selector: ".deck-reasons li", keep: 3 },
  { selector: ".deck-tags" },
  { selector: ".deck-reasons li", keep: 2 },
  { selector: ".deck-desc" },
  { selector: ".deck-facts" },
  { selector: ".deck-reasons li", keep: 1 },
];

function fitContent(box: HTMLElement) {
  for (const el of box.querySelectorAll("[data-fit-hidden]")) el.removeAttribute("data-fit-hidden");
  const overflowing = () => box.scrollHeight > box.clientHeight + 1;
  const shown = (el: Element) => getComputedStyle(el).display !== "none";
  for (const step of FIT_STEPS) {
    if (!overflowing()) return;
    const parts = [...box.querySelectorAll(step.selector)].filter(shown);
    if (step.keep === undefined) {
      parts.forEach((el) => el.setAttribute("data-fit-hidden", ""));
      continue;
    }
    for (let i = parts.length - 1; i >= step.keep && overflowing(); i--) parts[i].setAttribute("data-fit-hidden", "");
  }
}

/** Re-fits the card when its content changes, when the screen resizes, and once the font has loaded. */
function useFitContent(fitKey: string) {
  const ref = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const fit = () => fitContent(box);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) fit();
    });
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [fitKey]);
  return ref;
}

function Shell({
  tab,
  tabClass,
  href,
  overlay,
  depth,
  fitKey,
  children,
}: {
  tab: string;
  tabClass: string;
  /** Where a tap on the card goes. */
  href: string;
  overlay?: ReactNode;
  depth: number;
  /** Changes whenever the card's text does, so the fit is worked out again. */
  fitKey: string;
  children: ReactNode;
}) {
  const level = Math.min(depth, DEPTH_TEXT.length - 1);
  const contentRef = useFitContent(fitKey);
  return (
    <div className="flex h-full flex-col">
      <div
        className={`self-start rounded-t-2xl px-4 pb-1.5 pt-2 text-xs font-semibold transition-opacity duration-300 ${tabClass} ${DEPTH_TAB[level]}`}
      >
        {tab}
      </div>
      {/* Cards are solid, so a card behind never shows through. `deck-body` lets the content shrink to fit short screens. */}
      <div className="glass-card deck-body relative min-h-0 flex-1 overflow-hidden rounded-[26px] rounded-tl-none">
        {/*
          A tap anywhere on the card opens it, from Jun's redesign (PR #12). A drag that ends here does not,
          because SwipeCard cancels the click after a drag. `draggable={false}` stops the browser's own
          link drag from fighting the swipe.
        */}
        <Link
          ref={contentRef}
          href={href}
          draggable={false}
          className={`group flex h-full flex-col gap-3 p-5 transition-opacity duration-300 [&>*]:shrink-0 ${DEPTH_TEXT[level]}`}
          style={level > 0 ? { maskImage: BACK_CARD_FADE, WebkitMaskImage: BACK_CARD_FADE } : undefined}
        >
          {children}
        </Link>
        {overlay}
      </div>
    </div>
  );
}

/** `depth` is the card's place in the stack: 0 is the top card, which shows everything. */
export default function DeckCard({ item, overlay, depth = 0 }: { item: DeckItem; overlay?: ReactNode; depth?: number }) {
  const fitKey = `${deckKey(item)}|${item.match.score}|${item.match.reasons.join("|")}`;
  if (item.kind === "person") {
    const { person, match } = item;
    return (
      <Shell
        tab="Person to meet"
        tabClass="bg-ct-cat-person text-ct-deep"
        href={`/people/${person.id}`}
        overlay={overlay} depth={depth} fitKey={fitKey}>
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

        <DetailLink>See profile</DetailLink>
      </Shell>
    );
  }

  const { opportunity, match } = item;
  return (
    <Shell
      tab={CATEGORY_LABELS[opportunity.category]}
      tabClass={`${CATEGORY_BG[opportunity.category]} text-white`}
      href={`/opportunities/${opportunity.id}`}
      overlay={overlay}
      depth={depth}
      fitKey={fitKey}
    >
      <div>
        <h2 className="deck-title display line-clamp-3 text-[30px] text-ct-navy">{opportunity.title}</h2>
        <p className="mt-2 text-sm font-semibold text-ct-ink">{opportunity.organization}</p>
        <Facts items={[dueLabel(opportunity), opportunity.location, opportunity.commitment]} />
      </div>

      <p className="deck-desc line-clamp-3 text-[15px] leading-relaxed">{opportunity.description}</p>
      <div className="deck-reasons">
        <MatchPanel match={match} />
      </div>

      <DetailLink>See full details</DetailLink>
    </Shell>
  );
}

"use client";

// What one card in the swipe deck shows. OWNER: Max, with Jun on the photo layout.
// The deck (SwipeDeck.tsx) handles dragging and animation. This file only lays out the content.
//
// Built the way a Tinder card is built: a full-bleed face to the card and a
// panel of glass along the bottom carrying the score, the name and a line of
// facts, with the pass / save / interested buttons in the panel itself.
// Everything else lives on the detail page, one tap away.
//
// Tinder's face is a photograph, and there is no equivalent here: the pages
// these listings link to publish either one shared campus shot standing in for
// a dozen clubs, or 219x154 thumbnails that turn to mush stretched over a card.
// So there is no face. The panel is the whole card.
//
// Why a tap and not a scroll. An upward drag already means "save" (see
// handleDragEnd in SwipeDeck.tsx), so a scrollable area inside the card would
// fight that gesture on a touchscreen: the same finger movement would mean two
// things. Tinder has the same tap-to-open-profile affordance, so nothing is
// lost. Freeing vertical scroll up means moving "save" onto its button alone,
// which is Max's call to make.

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { deadlineLabel, todayIso } from "@/lib/prerequisites";
import { CATEGORY_LABELS, type MatchResult, type Opportunity, type Profile, type ProfileRole } from "@/lib/types";
import { CATEGORY_BG, ScoreBadge } from "./ui";

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

/**
 * "Due Feb 1, 2027", with "(est.)" when the date is a placeholder rather than from an official page.
 * The deck only draws in the browser (see SwipeDeck), so today's date here matches the person's clock.
 */
function dueLabel(opportunity: Opportunity): string | null {
  const label = deadlineLabel(opportunity.deadline, todayIso());
  return label && opportunity.deadline_estimated ? `${label} (est.)` : label;
}

/** How clearly each card in the stack shows, by depth (0 is the top card). */
const DEPTH_TEXT = ["opacity-100", "opacity-40", "opacity-15", "opacity-0"];
const DEPTH_TAB = ["opacity-100", "opacity-70", "opacity-35", "opacity-0"];

/**
 * Cards behind the top one sit a little lower, so their bottom edge always peeks out under it.
 * Fade the bottom of their text so that strip shows a clean edge, not a ghost of the buttons.
 * The rest of the faint preview is still there while you drag the top card away.
 */
const BACK_CARD_FADE = "linear-gradient(to bottom, black calc(100% - 96px), transparent calc(100% - 36px))";

/**
 * The parts of a card that give way, in order, when it has more to say than fits.
 * The container queries in globals.css trim cards on short screens. This catches what they miss,
 * like a card with a long "Because you liked" reason, so the buttons are never pushed off.
 * `keep` hides reasons from the end, one at a time, down to that many.
 *
 * Max's, from main. It does the job the old tiers did and does it by measuring
 * rather than guessing at heights, so it survives this card's new layout.
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
  const ref = useRef<HTMLDivElement>(null);
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

interface ShellProps {
  tab: string;
  tabClass: string;
  score: number;
  title: string;
  subtitle: string;
  facts: (string | null | undefined)[];
  /** The blurb. Trimmed on short cards, dropped on very short ones. */
  description?: string | null;
  /** Why the score is what it is. The one thing on a card you cannot read off the listing. */
  reasons: string[];
  /** Where tapping the card goes for the rest of the detail. */
  href: string;
  detailLabel: string;
  badges?: ReactNode;
  /** The pass / save / interested row. Lives in the panel, the way Tinder's does. */
  actions?: ReactNode;
  overlay?: ReactNode;
  depth: number;
  /** Changes whenever the card's text does, so the fit is worked out again. */
  fitKey: string;
}

function Shell({
  tab,
  tabClass,
  score,
  title,
  subtitle,
  facts,
  description,
  reasons,
  href,
  detailLabel,
  badges,
  actions,
  overlay,
  depth,
  fitKey,
}: ShellProps) {
  const level = Math.min(depth, DEPTH_TEXT.length - 1);
  const contentRef = useFitContent(fitKey);
  const shown = facts.filter(Boolean) as string[];

  return (
    <div className="flex h-full flex-col">
      <div
        className={`self-start rounded-t-2xl px-4 pb-1.5 pt-2 text-xs font-semibold transition-opacity duration-300 ${tabClass} ${DEPTH_TAB[level]}`}
      >
        {tab}
      </div>

      <div className="glass-card deck-body relative min-h-0 flex-1 overflow-hidden rounded-[26px] rounded-tl-none">
        <div
          ref={contentRef}
          className={`flex h-full flex-col p-5 transition-opacity duration-300 [&>*]:shrink-0 ${DEPTH_TEXT[level]}`}
          style={level > 0 ? { maskImage: BACK_CARD_FADE, WebkitMaskImage: BACK_CARD_FADE } : undefined}
        >
          {/*
            The text block is the link to the detail page. The buttons sit
            beside it rather than inside it, so a tap on a button is never also
            a tap on the link.
          */}
          <Link href={href} draggable={false} className="block">
            <div className="flex items-start gap-3.5">
              <div className="shrink-0 pt-0.5">
                <ScoreBadge score={score} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="deck-title line-clamp-3 text-[27px] font-semibold leading-[1.1] tracking-tight text-ct-navy">
                  {title}
                </h2>
                <p className="mt-1.5 text-sm font-medium text-ct-ink">{subtitle}</p>
              </div>
            </div>

            {badges ? <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div> : null}

            {shown.length > 0 ? (
              <p className="deck-facts mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ct-muted">
                {shown.map((fact) => (
                  <span key={fact}>{fact}</span>
                ))}
              </p>
            ) : null}

            {description ? (
              <p className="deck-desc mt-3 line-clamp-3 text-[15px] leading-relaxed text-ct-ink">{description}</p>
            ) : null}

            {reasons.length > 0 ? (
              <div className="deck-reasons mt-3.5 border-t border-ct-navy/10 pt-3">
                <p className="text-sm font-semibold text-ct-navy">Why it fits you</p>
                <ul className="mt-1.5 space-y-1 text-sm text-ct-ink">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <svg viewBox="0 0 16 16" className="mt-[3px] size-3.5 shrink-0 text-ct-like" aria-hidden="true">
                        <path
                          d="M3 8.5l3 3 7-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-3.5 text-xs font-semibold text-ct-navy">{detailLabel}</p>
          </Link>

          {/* mt-auto keeps the buttons on the bottom edge however tall the card is. */}
          {actions ? <div className="deck-actions mt-auto pt-5">{actions}</div> : null}
        </div>

        {overlay}
      </div>
    </div>
  );
}

/** `depth` is the card's place in the stack: 0 is the top card, which shows everything. */
export default function DeckCard({
  item,
  actions,
  overlay,
  depth = 0,
}: {
  item: DeckItem;
  actions?: ReactNode;
  overlay?: ReactNode;
  depth?: number;
}) {
  if (item.kind === "person") {
    const { person, match } = item;
    return (
      <Shell
        tab="Person to meet"
        tabClass="bg-ct-cat-person text-ct-deep"
        score={match.score}
        title={person.full_name}
        subtitle={person.headline}
        facts={[ROLE_LABELS[person.role], person.school, person.class_year ? `Class of ${person.class_year}` : null]}
        description={person.bio}
        reasons={match.reasons}
        href={`/people/${person.id}`}
        detailLabel="Tap to see their profile"
        badges={
          person.open_to_chat ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ct-like/10 px-2 py-0.5 text-xs font-semibold text-ct-like">
              <span className="size-1.5 rounded-full bg-ct-like" aria-hidden="true" />
              Open to coffee chats
            </span>
          ) : null
        }
        actions={actions}
        overlay={overlay}
        depth={depth}
        fitKey={`${person.id}:${match.reasons.length}`}
      />
    );
  }

  const { opportunity, match } = item;
  return (
    <Shell
      tab={CATEGORY_LABELS[opportunity.category]}
      tabClass={`${CATEGORY_BG[opportunity.category]} text-ct-deep`}
      score={match.score}
      title={opportunity.title}
      subtitle={opportunity.organization}
      facts={[dueLabel(opportunity), opportunity.location, opportunity.commitment]}
      description={opportunity.description}
      reasons={match.reasons}
      href={`/opportunities/${opportunity.id}`}
      detailLabel="Tap for the full details"
      actions={actions}
      overlay={overlay}
      depth={depth}
      fitKey={`${opportunity.id}:${match.reasons.length}`}
    />
  );
}

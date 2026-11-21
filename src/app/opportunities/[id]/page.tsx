import Link from "next/link";
import { notFound } from "next/navigation";
import SwipeButtons from "@/components/SwipeButtons";
import { Card, CategoryBadge, MatchPanel, OwnerNote, TagList } from "@/components/ui";
import { getCurrentUser, getOpportunities, getOpportunity, getProfile } from "@/lib/data";
import { matchOpportunity } from "@/lib/match";
import { checkPrerequisites, daysUntil, formatDeadline, skillNames, todayIso, type PrerequisiteState } from "@/lib/prerequisites";

export const dynamic = "force-dynamic";

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ct-muted">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

const STATE_LABEL: Record<PrerequisiteState, string> = {
  met: "you have this",
  missing: "not on your profile",
  check: "check this yourself",
};

/** A check when the user has it, an open circle when they do not, a dash for rules they check themselves. */
function PrerequisiteIcon({ state }: { state: PrerequisiteState }) {
  const color = state === "met" ? "text-ct-like" : state === "missing" ? "text-ct-pass" : "text-ct-muted";
  return (
    <svg viewBox="0 0 16 16" className={`mt-[3px] size-3.5 shrink-0 ${color}`} aria-hidden="true">
      {state === "met" ? (
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : state === "missing" ? (
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
      ) : (
        <path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      )}
    </svg>
  );
}

export default async function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  const { id } = await params;
  const [user, opportunity, all] = await Promise.all([getCurrentUser(), getOpportunity(id), getOpportunities()]);
  if (!opportunity) notFound();

  const match = matchOpportunity(user, opportunity);
  const contact = opportunity.contact_profile_id ? await getProfile(opportunity.contact_profile_id) : null;
  const link = opportunity.url ?? opportunity.source_url;
  const prerequisites = checkPrerequisites(user, opportunity, skillNames(all));
  const today = todayIso();
  const deadline = opportunity.deadline
    ? `${formatDeadline(opportunity.deadline)}${daysUntil(opportunity.deadline, today) < 0 ? " (closed)" : ""}${
        opportunity.deadline_estimated ? " (estimated, check the official page)" : ""
      }`
    : null;

  return (
    <div className="space-y-4">
      <div>
        <CategoryBadge category={opportunity.category} />
        <h1 className="mt-2 text-2xl font-bold leading-tight text-ct-navy">{opportunity.title}</h1>
        <p className="mt-1 text-sm font-medium text-ct-muted">{opportunity.organization}</p>
      </div>

      <MatchPanel match={match} />
      <SwipeButtons targetType="opportunity" targetId={opportunity.id} matchScore={match.score} />

      <Card className="space-y-4">
        <p className="text-sm leading-relaxed">{opportunity.description}</p>
        <dl className="grid grid-cols-2 gap-3">
          <Fact label="Location" value={opportunity.location} />
          <Fact label="Time" value={opportunity.commitment} />
          <Fact label="Deadline" value={deadline} />
          <Fact label="Majors" value={opportunity.majors.length > 0 ? opportunity.majors.join(", ") : "All majors"} />
        </dl>

        {opportunity.skills.length > 0 ? (
          <div>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Helpful skills</h2>
            <TagList items={opportunity.skills} max={10} />
          </div>
        ) : null}

        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Prerequisites</h2>
          {prerequisites.total > 0 ? (
            <>
              <ul className="space-y-1.5">
                {prerequisites.checks.map(({ requirement, state }) => (
                  <li key={requirement} className="flex items-start gap-2 text-sm">
                    <PrerequisiteIcon state={state} />
                    <span>
                      {requirement}
                      <span className={state === "check" ? "ml-1 text-xs text-ct-muted" : "sr-only"}>
                        {state === "check" ? "(check yourself)" : ` (${STATE_LABEL[state]})`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ct-muted">
                {prerequisites.missingCount > 0
                  ? `Missing ${prerequisites.missingCount}. Courses and skills are checked against your profile.`
                  : prerequisites.metCount > 0
                    ? "Your courses and skills cover the ones the app can check."
                    : "These are eligibility rules the app cannot check for you."}
              </p>
            </>
          ) : (
            <p className="text-sm text-ct-muted">None listed. Check the official page to be sure.</p>
          )}
        </div>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-semibold text-ct-navy underline underline-offset-4"
          >
            {opportunity.url ? "Open the official page" : "Open the page where we found this"}
          </a>
        ) : null}
        {!opportunity.verified ? (
          <p className="text-xs text-ct-muted">Details on this listing have not been checked yet.</p>
        ) : null}
      </Card>

      {contact ? (
        <Card>
          <h2 className="text-xs font-medium uppercase tracking-wide text-ct-muted">Someone to talk to</h2>
          <Link href={`/people/${contact.id}`} className="mt-1 block">
            <span className="font-semibold text-ct-navy">{contact.full_name}</span>
            <span className="block text-sm text-ct-muted">{contact.headline}</span>
          </Link>
        </Card>
      ) : null}

      <OwnerNote owner="Peter">
        Deadlines and prerequisites are filled in. Dates marked estimated are placeholders: when each program posts its
        2027 date, put it in src/data/opportunities.json and set deadline_estimated to false.
      </OwnerNote>
    </div>
  );
}

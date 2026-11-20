import Link from "next/link";
import { notFound } from "next/navigation";
import SwipeButtons from "@/components/SwipeButtons";
import { Card, CategoryBadge, MatchPanel, OwnerNote, TagList } from "@/components/ui";
import { getCurrentUser, getOpportunity, getProfile } from "@/lib/data";
import { matchOpportunity } from "@/lib/match";
import { checkPrerequisites, daysUntil, formatDeadline, todayIso } from "@/lib/prerequisites";

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

/** A check when the user has this prerequisite, an open circle when they do not. */
function PrerequisiteIcon({ met }: { met: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`mt-[3px] size-3.5 shrink-0 ${met ? "text-ct-like" : "text-ct-pass"}`}
      aria-hidden="true"
    >
      {met ? (
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
      )}
    </svg>
  );
}

export default async function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  const { id } = await params;
  const [user, opportunity] = await Promise.all([getCurrentUser(), getOpportunity(id)]);
  if (!opportunity) notFound();

  const contact = opportunity.contact_profile_id ? await getProfile(opportunity.contact_profile_id) : null;
  const link = opportunity.url ?? opportunity.source_url;
  const prerequisites = checkPrerequisites(user, opportunity);
  const today = todayIso();
  const deadline = opportunity.deadline
    ? `${formatDeadline(opportunity.deadline)}${daysUntil(opportunity.deadline, today) < 0 ? " (closed)" : ""}`
    : null;

  return (
    <div className="space-y-4">
      <div>
        <CategoryBadge category={opportunity.category} />
        <h1 className="mt-2 text-2xl font-bold leading-tight text-ct-navy">{opportunity.title}</h1>
        <p className="mt-1 text-sm font-medium text-ct-muted">{opportunity.organization}</p>
      </div>

      <MatchPanel match={matchOpportunity(user, opportunity)} />
      <SwipeButtons targetType="opportunity" targetId={opportunity.id} />

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
                {prerequisites.checks.map(({ requirement, met }) => (
                  <li key={requirement} className="flex items-start gap-2 text-sm">
                    <PrerequisiteIcon met={met} />
                    <span>
                      {requirement}
                      <span className="sr-only">{met ? " (you have this)" : " (not on your profile)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ct-muted">
                {prerequisites.allMet
                  ? "Your courses and skills cover every prerequisite."
                  : `You have ${prerequisites.metCount} of ${prerequisites.total}. Checked against the courses and skills on your profile.`}
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
        Prerequisite checks are built. Still to do: fill in prerequisites and deadlines in the data from each official page.
      </OwnerNote>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import SwipeButtons from "@/components/SwipeButtons";
import { Card, CategoryBadge, MatchPanel, OwnerNote, TagList } from "@/components/ui";
import { getCurrentUser, getOpportunity, getProfile } from "@/lib/data";
import { matchOpportunity } from "@/lib/match";

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

export default async function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  const { id } = await params;
  const [user, opportunity] = await Promise.all([getCurrentUser(), getOpportunity(id)]);
  if (!opportunity) notFound();

  const match = matchOpportunity(user, opportunity);
  const contact = opportunity.contact_profile_id ? await getProfile(opportunity.contact_profile_id) : null;
  const link = opportunity.url ?? opportunity.source_url;

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
          <Fact label="Deadline" value={opportunity.deadline} />
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
          {opportunity.prerequisites.length > 0 ? (
            <TagList items={opportunity.prerequisites} max={10} />
          ) : (
            <p className="text-sm text-ct-muted">None listed yet.</p>
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
        Fill in prerequisites and deadlines in the data, then show whether the user meets each one.
      </OwnerNote>
    </div>
  );
}

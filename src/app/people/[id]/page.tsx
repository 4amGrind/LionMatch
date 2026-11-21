import { notFound } from "next/navigation";
import OutreachBox from "@/components/OutreachBox";
import SwipeButtons from "@/components/SwipeButtons";
import { Card, MatchPanel, SampleBadge, TagList } from "@/components/ui";
import { toChatPerson } from "@/lib/chat-person";
import { getCurrentUser, getProfile } from "@/lib/data";
import { matchPerson } from "@/lib/match";

export const dynamic = "force-dynamic";

const ROLE_LABELS = {
  student: "Student",
  club_lead: "Club lead",
  researcher: "Researcher",
  alum: "Alum",
  recruiter: "Recruiter",
} as const;

export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const [user, person] = await Promise.all([getCurrentUser(), getProfile(id)]);
  if (!person) notFound();

  const match = matchPerson(user, person);
  const sharedTopic =
    person.interests.find((interest) =>
      user.interests.some((mine) => mine.toLowerCase() === interest.toLowerCase()),
    ) ?? null;
  const facts = [ROLE_LABELS[person.role], person.school, person.major, person.class_year ? `Class of ${person.class_year}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-ct-navy">{person.full_name}</h1>
          {person.is_sample ? <SampleBadge /> : null}
        </div>
        <p className="mt-1 text-sm font-medium text-ct-ink">{person.headline}</p>
        <p className="mt-0.5 text-sm text-ct-muted">{facts}</p>
      </div>

      <MatchPanel match={match} />
      <SwipeButtons targetType="person" targetId={person.id} matchScore={match.score} />

      <Card className="space-y-3">
        {person.bio ? <p className="text-sm leading-relaxed">{person.bio}</p> : null}
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Skills</h2>
          <TagList items={person.skills} max={10} />
        </div>
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Interests</h2>
          <TagList items={person.interests} max={10} />
        </div>
      </Card>

      {person.open_to_chat ? (
        <Card>
          <h2 className="mb-3 font-semibold text-ct-navy">Reach out</h2>
          <OutreachBox
            fromName={user.full_name}
            fromHeadline={user.headline}
            toFirstName={person.full_name.split(" ")[0]}
            sharedTopic={sharedTopic}
            person={toChatPerson(person)}
          />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ct-muted">{person.full_name} is not taking coffee chats right now.</p>
        </Card>
      )}

    </div>
  );
}

import Link from "next/link";
import { OwnerNote, PageTitle, SampleBadge } from "@/components/ui";
import { getPeople } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const people = (await getPeople()).filter((person) => person.open_to_chat);

  return (
    <>
      <PageTitle title="Chats" subtitle="People who are open to a coffee chat." />
      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              href={`/people/${person.id}`}
              className="flex items-center gap-3 rounded-2xl border border-ct-line bg-ct-card p-3 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ct-blue font-bold text-ct-navy"
              >
                {person.full_name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ct-navy">{person.full_name}</span>
                  {person.is_sample ? <SampleBadge /> : null}
                </span>
                <span className="block truncate text-sm text-ct-muted">{person.headline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <OwnerNote owner="Ayan">
        Turn this into real chat threads. The `messages` and `outreach` tables are ready in supabase/schema.sql.
      </OwnerNote>
    </>
  );
}

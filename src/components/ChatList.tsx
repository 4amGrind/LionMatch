"use client";

// The Chats tab. OWNER: Ayan.
// Conversations you have started, newest first, then people you could start one with.
// People you liked or saved come first in that second list.

import Link from "next/link";
import { otherSide, unreadFrom, useMessages, useOutreach, useReads, useTyping, type ChatPerson } from "@/lib/chat";
import { useSwipes } from "@/lib/swipes";
import { DEMO_USER_ID, type Message, type Outreach } from "@/lib/types";
import { Avatar, EmptyState, SampleBadge } from "./ui";

function stamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_LABEL: Record<Outreach["status"], string> = {
  draft: "Draft",
  sent: "Request sent",
  replied: "Replied",
};

export default function ChatList({ people }: { people: ChatPerson[] }) {
  const messages = useMessages();
  const outreach = useOutreach();
  const reads = useReads();
  const typing = useTyping();
  const { swipes } = useSwipes();

  const byId = new Map(people.map((p) => [p.id, p]));

  // Messages are stored oldest first, so the last one seen for a person is their latest.
  const latest = new Map<string, Message>();
  for (const message of messages) latest.set(otherSide(message), message);
  const threads = [...latest.entries()]
    .flatMap(([id, message]) => {
      const person = byId.get(id);
      return person ? [{ person, message }] : [];
    })
    .sort((a, b) => b.message.created_at.localeCompare(a.message.created_at));

  const interest = new Map<string, number>();
  for (const s of swipes) {
    if (s.target_type !== "person" || s.direction === "pass") continue;
    interest.set(s.target_id, s.direction === "like" ? 0 : 1);
  }
  const starters = people
    .filter((p) => p.open_to_chat && !latest.has(p.id))
    .sort(
      (a, b) =>
        (interest.get(a.id) ?? 2) - (interest.get(b.id) ?? 2) || a.full_name.localeCompare(b.full_name),
    );

  function statusFor(personId: string): Outreach["status"] | null {
    const rows = outreach.filter((o) => o.to_profile_id === personId);
    return rows.length > 0 ? rows[rows.length - 1].status : null;
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="threads-heading">
        <h2 id="threads-heading" className="mb-2 text-xs font-medium uppercase tracking-wide text-ct-muted">
          Conversations
        </h2>
        {threads.length === 0 ? (
          <EmptyState>No conversations yet. Pick someone below to say hi.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {threads.map(({ person, message }) => {
              const unread = unreadFrom(messages, reads, person.id);
              const status = statusFor(person.id);
              const mine = message.from_profile_id === DEMO_USER_ID;
              return (
                <li key={person.id}>
                  <Link
                    href={`/chats/${person.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-ct-line bg-ct-card p-3 shadow-sm"
                  >
                    <Avatar name={person.full_name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-ct-navy ${unread > 0 ? "font-bold" : "font-semibold"}`}>
                          {person.full_name}
                        </span>
                        {status ? (
                          <span className="shrink-0 rounded-full border border-ct-navy/15 px-2 py-0.5 text-[11px] font-semibold text-ct-ink">
                            {STATUS_LABEL[status]}
                          </span>
                        ) : null}
                      </span>
                      <span className={`block truncate text-sm ${unread > 0 ? "text-ct-ink" : "text-ct-muted"}`}>
                        {typing.has(person.id) ? "Typing…" : `${mine ? "You: " : ""}${message.body}`}
                      </span>
                      <span className="block text-xs text-ct-muted">{stamp(message.created_at)}</span>
                    </span>
                    {unread > 0 ? (
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ct-pass text-xs font-bold text-white"
                        aria-label={`${unread} unread`}
                      >
                        {unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="starters-heading">
        <h2 id="starters-heading" className="mb-2 text-xs font-medium uppercase tracking-wide text-ct-muted">
          Start a chat
        </h2>
        {starters.length === 0 ? (
          <EmptyState>You have started a chat with everyone who is open to one.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {starters.map((person) => {
              const pick = interest.get(person.id);
              return (
                <li key={person.id}>
                  <Link
                    href={`/chats/${person.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-ct-line bg-ct-card p-3 shadow-sm"
                  >
                    <Avatar name={person.full_name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ct-navy">{person.full_name}</span>
                        {person.is_sample ? <SampleBadge /> : null}
                      </span>
                      <span className="block truncate text-sm text-ct-muted">{person.headline}</span>
                    </span>
                    {pick !== undefined ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                          pick === 0 ? "bg-ct-like" : "bg-ct-save"
                        }`}
                      >
                        {pick === 0 ? "You liked" : "Saved"}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

// One conversation. OWNER: Ayan.
// The people in the seed data are made up, so their replies are scripted. The screen says so.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ensureReply, markRead, sendMessage, threadWith, useMessages, useOutreach, useTyping, type ChatPerson } from "@/lib/chat";
import { DEMO_USER_ID } from "@/lib/types";
import { Avatar } from "./ui";

const MAX_LENGTH = 1000;

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ChatThread({ person }: { person: ChatPerson }) {
  const messages = useMessages();
  const outreach = useOutreach();
  const typingNow = useTyping().has(person.id);
  const thread = useMemo(() => threadWith(messages, person.id), [messages, person.id]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const firstName = person.full_name.split(" ")[0];

  // If you reloaded in the middle of a reply, it is sent now.
  useEffect(() => ensureReply(person), [person]);
  // Anything on screen counts as read.
  useEffect(() => markRead(person.id), [person.id, thread.length]);
  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, typingNow]);

  const status = outreach.filter((o) => o.to_profile_id === person.id).at(-1)?.status;
  const starters = [
    `Hi ${firstName}, would you have 15 minutes for a coffee chat in the next two weeks?`,
    `Hi ${firstName}, I'd love to hear how you got started. Could I ask you a few questions?`,
    `Hi ${firstName}, I'm new here and interested in ${person.interests[0] ?? "what you do"}. Any advice?`,
  ];

  function submit() {
    if (sendMessage(person, draft)) setDraft("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="glass-surface mb-3 flex items-center gap-3 rounded-[22px] p-3">
        <Link href="/chats" aria-label="Back to chats" className="-ml-1 rounded-full p-1.5 text-ct-navy hover:bg-ct-blue-deep">
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
            <path d="M12 4L6 10l6 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Avatar name={person.full_name} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight text-ct-navy">{person.full_name}</h1>
          <p className="truncate text-xs text-ct-muted">{person.headline}</p>
        </div>
        <Link href={`/people/${person.id}`} className="shrink-0 text-xs font-semibold text-ct-navy underline underline-offset-4">
          Profile
        </Link>
      </div>

      {person.is_sample ? (
        <p className="mb-2 rounded-xl border border-dashed border-ct-navy/30 px-3 py-2 text-xs text-ct-muted">
          Sample profile: {firstName} is made up, so replies are scripted for the demo.
        </p>
      ) : null}
      {status ? (
        <p className="mb-2 text-center text-xs font-semibold text-ct-muted">
          {status === "replied" ? "They replied to your request" : "Your request is sent. Waiting for a reply."}
        </p>
      ) : null}

      <ul className="flex flex-1 flex-col justify-end gap-2 py-2" aria-live="polite" aria-label={`Conversation with ${person.full_name}`}>
        {thread.length === 0 && !typingNow ? (
          <li className="py-6 text-center">
            {/* Backed by glass so it reads over the dark part of the wallpaper too. */}
            <span className="glass-surface inline-block rounded-full px-4 py-2 text-sm text-ct-ink">
              {person.open_to_chat
                ? `Nothing here yet. Say hi to ${firstName}.`
                : `${person.full_name} is not taking coffee chats right now.`}
            </span>
          </li>
        ) : null}
        {thread.map((message) => {
          const mine = message.from_profile_id === DEMO_USER_ID;
          return (
            <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-[20px] px-3.5 py-2 text-sm leading-relaxed ${
                  mine ? "rounded-br-md bg-ct-navy text-ct-on-navy" : "glass-surface rounded-bl-md text-ct-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-ct-on-navy/70" : "text-ct-muted"}`}>{clock(message.created_at)}</p>
              </div>
            </li>
          );
        })}
        {typingNow ? (
          <li className="flex justify-start">
            <div className="glass-surface flex items-center gap-1 rounded-[20px] rounded-bl-md px-3.5 py-3" role="status" aria-label={`${firstName} is typing`}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-ct-muted"
                  style={{ animationDelay: `${i * 140}ms` }}
                />
              ))}
            </div>
          </li>
        ) : null}
      </ul>
      <div ref={endRef} />

      {person.open_to_chat ? (
        <div className="sticky bottom-24 z-10 mt-2 space-y-2">
          {thread.length === 0 ? (
            <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Message ideas">
              {starters.map((text) => (
                <li key={text} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setDraft(text)}
                    className="glass block max-w-[15rem] rounded-2xl px-3 py-2 text-left text-xs font-medium leading-snug text-ct-navy"
                  >
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="glass flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Message {person.full_name}</span>
              <input
                value={draft}
                maxLength={MAX_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${firstName}`}
                autoComplete="off"
                className="w-full bg-transparent py-2 text-sm text-ct-navy placeholder:text-ct-muted focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={draft.trim() === ""}
              aria-label="Send message"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ct-navy text-ct-on-navy transition-opacity disabled:opacity-40"
            >
              <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
                <path d="M4 10l12-6-4 12-2.5-4.5z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

"use client";

// Coffee chat and outreach drafts. OWNER: Ayan.
// Fills in a template you can edit, then sends it into the chat with that person.
// Every send is saved as an outreach row, so you can see its status here and in Chats,
// and the box will not let you message the same person twice by accident.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendOutreach, useOutreach, type ChatPerson } from "@/lib/chat";
import type { OutreachKind } from "@/lib/types";

interface Props {
  fromName: string;
  fromHeadline: string;
  toFirstName: string;
  sharedTopic: string | null;
  person: ChatPerson;
}

function template(kind: OutreachKind, p: Props): string {
  const topic = p.sharedTopic ? ` I saw we are both into ${p.sharedTopic}.` : "";
  if (kind === "coffee_chat") {
    return `Hi ${p.toFirstName}, I'm ${p.fromName} (${p.fromHeadline}).${topic} Would you have 15 minutes for a coffee chat in the next two weeks? I'd like to hear how you got started.`;
  }
  return `Hi ${p.toFirstName}, I'm ${p.fromName} (${p.fromHeadline}).${topic} I'm interested in what you work on and wanted to ask how someone at my stage could get involved.`;
}

const KIND_LABEL: Record<OutreachKind, string> = { coffee_chat: "coffee chat request", outreach: "message" };

export default function OutreachBox(props: Props) {
  const router = useRouter();
  const sent = useOutreach().filter((o) => o.to_profile_id === props.person.id);
  const [kind, setKind] = useState<OutreachKind>("coffee_chat");
  const [message, setMessage] = useState(() => template("coffee_chat", props));
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);

  const previous = sent.at(-1);
  if (previous && !resending) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ct-ink">
          You sent {props.toFirstName} a {KIND_LABEL[previous.kind]} on{" "}
          {new Date(previous.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.{" "}
          <span className="font-semibold">
            {previous.status === "replied" ? "They replied." : "Waiting for a reply."}
          </span>
        </p>
        <Link
          href={`/chats/${props.person.id}`}
          className="block w-full rounded-xl bg-ct-navy py-3 text-center text-sm font-bold text-ct-on-navy"
        >
          Open chat
        </Link>
        <button
          type="button"
          onClick={() => setResending(true)}
          className="w-full text-center text-xs font-semibold text-ct-muted hover:text-ct-navy"
        >
          Write another message
        </button>
      </div>
    );
  }

  function pick(next: OutreachKind) {
    setKind(next);
    setMessage(template(next, props));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function send() {
    if (!sendOutreach(props.person, kind, message)) return;
    router.push(`/chats/${props.person.id}`);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Message type">
        {(
          [
            ["coffee_chat", "Coffee chat"],
            ["outreach", "Outreach"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => pick(value)}
            className={`rounded-xl border py-2.5 text-sm font-semibold ${
              kind === value ? "border-ct-navy bg-ct-navy text-ct-on-navy" : "border-ct-line bg-ct-card text-ct-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Message</span>
        <textarea
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setCopied(false);
          }}
          rows={6}
          maxLength={1000}
          className="w-full rounded-xl border border-ct-line bg-ct-card p-3 text-sm leading-relaxed"
        />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={send}
          disabled={message.trim() === ""}
          className="rounded-xl bg-ct-navy py-3 text-sm font-bold text-ct-on-navy disabled:opacity-40"
        >
          Send in chat
        </button>
        <button type="button" onClick={copy} className="glass-surface rounded-xl px-4 py-3 text-sm font-semibold text-ct-navy">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

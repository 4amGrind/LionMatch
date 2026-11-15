"use client";

// Coffee chat and outreach drafts. OWNER: Ayan.
// This version fills in a template you can edit and copy.
// Still to build: send it in the app, save it to the `outreach` table,
// and show the status in a tracker so nobody messages the same person twice.

import { useState } from "react";
import type { OutreachKind } from "@/lib/types";

interface Props {
  fromName: string;
  fromHeadline: string;
  toFirstName: string;
  sharedTopic: string | null;
}

function template(kind: OutreachKind, p: Props): string {
  const topic = p.sharedTopic ? ` I saw we are both into ${p.sharedTopic}.` : "";
  if (kind === "coffee_chat") {
    return `Hi ${p.toFirstName}, I'm ${p.fromName} (${p.fromHeadline}).${topic} Would you have 15 minutes for a coffee chat in the next two weeks? I'd like to hear how you got started.`;
  }
  return `Hi ${p.toFirstName}, I'm ${p.fromName} (${p.fromHeadline}).${topic} I'm interested in what you work on and wanted to ask how someone at my stage could get involved.`;
}

export default function OutreachBox(props: Props) {
  const [kind, setKind] = useState<OutreachKind>("coffee_chat");
  const [message, setMessage] = useState(() => template("coffee_chat", props));
  const [copied, setCopied] = useState(false);

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
              kind === value ? "border-ct-navy bg-ct-navy text-white" : "border-ct-line bg-ct-card text-ct-navy"
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
          className="w-full rounded-xl border border-ct-line bg-ct-card p-3 text-sm leading-relaxed"
        />
      </label>

      <button
        type="button"
        onClick={copy}
        className="w-full rounded-xl bg-ct-navy py-3 text-sm font-bold text-white"
      >
        {copied ? "Copied" : "Copy message"}
      </button>
    </div>
  );
}

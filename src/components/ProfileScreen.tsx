"use client";

// Your profile. OWNER: Ayan.
// Shows the profile, an edit form, and a short summary of what you have done in the app.
// Edits change the match score everywhere (see profile-edits.ts for how).

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { otherSide, useMessages, useOutreach } from "@/lib/chat";
import { useSwipes } from "@/lib/swipes";
import { CATEGORY_LABELS, type Profile } from "@/lib/types";
import ProfileEditor from "./ProfileEditor";
import { Avatar, Card, SampleBadge, TagList } from "./ui";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold text-ct-muted">{label}</h2>
      {children}
    </div>
  );
}

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <Link href={href} className="glass-surface rounded-xl px-2 py-3 text-center">
      <span className="display block text-[26px] tabular-nums text-ct-navy">{value}</span>
      <span className="block text-xs font-medium text-ct-muted">{label}</span>
    </Link>
  );
}

export default function ProfileScreen({
  user,
  suggestions,
}: {
  user: Profile;
  suggestions: { skills: string[]; interests: string[] };
}) {
  const [editing, setEditing] = useState(false);
  const { swipes } = useSwipes();
  const messages = useMessages();
  const outreach = useOutreach();

  const facts = [user.school, user.major, user.class_year ? `Class of ${user.class_year}` : null]
    .filter(Boolean)
    .join(" · ");
  const chats = new Set(messages.map(otherSide)).size;
  const interested = swipes.filter((s) => s.direction !== "pass").length;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start gap-3.5">
          <Avatar name={user.full_name} className="size-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="display line-clamp-2 text-[30px] text-ct-navy">{user.full_name}</h1>
            {user.headline ? <p className="mt-1 text-sm font-medium text-ct-ink">{user.headline}</p> : null}
            {facts ? <p className="mt-0.5 text-sm text-ct-muted">{facts}</p> : null}
          </div>
        </div>

        {editing ? (
          <ProfileEditor user={user} suggestions={suggestions} fields="all" onDone={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {user.is_sample ? <SampleBadge /> : null}
              {user.open_to_chat ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ct-like/10 px-2 py-0.5 text-xs font-semibold text-ct-like">
                  <span className="size-1.5 rounded-full bg-ct-like" aria-hidden="true" />
                  Open to coffee chats
                </span>
              ) : null}
            </div>
            {user.bio ? <p className="text-sm leading-relaxed">{user.bio}</p> : null}
            <Section label="Looking for">
              <TagList items={user.looking_for.map((category) => CATEGORY_LABELS[category])} />
            </Section>
            <Section label="Skills">
              <TagList items={user.skills} max={12} />
            </Section>
            <Section label="Interests">
              <TagList items={user.interests} max={12} />
            </Section>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full rounded-xl bg-ct-navy py-3 text-sm font-bold text-ct-on-navy"
            >
              Edit profile
            </button>
            <p className="text-center text-xs text-ct-muted">
              Skills, interests and what you are looking for change your match scores right away.
            </p>
          </>
        )}
      </Card>

      <section aria-labelledby="activity-heading">
        <h2
          id="activity-heading"
          className="glass-surface mb-2 w-fit rounded-full px-3 py-1 text-xs font-semibold text-ct-ink"
        >
          Your activity
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat value={swipes.length} label="Swipes" href="/history" />
          <Stat value={interested} label="Interested or saved" href="/history" />
          <Stat value={chats} label={chats === 1 ? "Chat" : "Chats"} href="/chats" />
        </div>
        {outreach.length > 0 ? (
          <p className="mt-2 text-center text-xs text-ct-muted">
            {outreach.length} {outreach.length === 1 ? "request" : "requests"} sent,{" "}
            {outreach.filter((o) => o.status === "replied").length} answered
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/preferences" className="glass-surface rounded-xl py-3 text-center text-sm font-semibold text-ct-navy">
          Preferences
        </Link>
        <Link href="/history" className="glass-surface rounded-xl py-3 text-center text-sm font-semibold text-ct-navy">
          Swipe history
        </Link>
      </div>
    </div>
  );
}

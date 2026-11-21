"use client";

// Chats and outreach tracking. OWNER: Ayan.
// Messages and outreach rows are saved in this browser only, in the same shape as the `messages`
// and `outreach` tables in supabase/schema.sql. When login is added, swap the three stores below for
// Supabase reads and inserts (and a realtime subscription for new messages). The screens do not change.
//
// The people in the seed data are made up, so they cannot really answer. Their replies are scripted
// (see scriptedReply) and the chat screen says so.

import { useSyncExternalStore } from "react";
import type { ChatPerson } from "./chat-person";
import { createLocalStore, newId } from "./localStore";
import { DEMO_USER_ID, type Message, type Outreach, type OutreachKind, type ProfileRole } from "./types";

export type { ChatPerson };


const EMPTY_MESSAGES: Message[] = [];
const EMPTY_OUTREACH: Outreach[] = [];
const EMPTY_READS: Record<string, string> = {};

const messageStore = createLocalStore<Message[]>("ct.messages.v1", EMPTY_MESSAGES);
const outreachStore = createLocalStore<Outreach[]>("ct.outreach.v1", EMPTY_OUTREACH);
/** Person id to the time you last opened that chat. Anything newer from them is unread. */
const readStore = createLocalStore<Record<string, string>>("ct.chat-read.v1", EMPTY_READS);

const MAX_MESSAGE_LENGTH = 1000;

// --- Scripted replies -------------------------------------------------------

const REPLIES: Record<ProfileRole, (topic: string) => string[]> = {
  club_lead: (topic) => [
    `Hi! Thanks for reaching out. We love meeting people who are curious about ${topic}. Do you want to grab a coffee or hop on a quick call this week?`,
    "Good question. The easiest way in is to come to a meeting and say hi. You do not need experience. We mostly care that you show up.",
    "Happy to point you to the right people. Send me a couple of times that work and I will pick one.",
  ],
  researcher: (topic) => [
    `Hi, thanks for the note. I would be glad to talk about ${topic}. Fifteen minutes next week works for me.`,
    "Reading two or three recent papers first helps a lot. I can send you a short list before we talk.",
    "Send over a few times that work for you and I will confirm one.",
  ],
  alum: (topic) => [
    `Great to hear from you! I am always glad to help someone from Columbia. What would you like to know about getting started in ${topic}?`,
    "Honestly, small projects and talking to people got me further than anything else. Happy to say more on a call.",
    "Let's find a time. Send me a few slots and I will take it from there.",
  ],
  recruiter: () => [
    "Hi, thanks for getting in touch. I am happy to share what we look for in first-years and how the process works.",
    "The main thing is to show real projects, even small ones, and to apply early. I can walk you through the timeline.",
    "Send me a few times that work and I will set up a short call.",
  ],
  student: (topic) => [
    `Hey! Thanks for messaging. I got into ${topic} not long ago and I am happy to share what worked for me. Coffee this week?`,
    "Honestly the best move was to just start and ask people for help. Everyone I asked said yes.",
    "Sounds good. Send me a time and I will make it work.",
  ],
};
const CLOSING = "Sounds good. Talk soon!";

/** The next reply from a made-up person. It depends on their role and how many replies they have sent. */
export function scriptedReply(person: ChatPerson, repliesSoFar: number): string {
  const topic = person.interests[0] ?? "that";
  const lines = REPLIES[person.role](topic);
  return lines[repliesSoFar] ?? CLOSING;
}

// --- Typing indicator (not saved: a reload in the middle of a reply just skips it) ----

let typing: ReadonlySet<string> = new Set();
const typingListeners = new Set<() => void>();

function setTyping(personId: string, on: boolean) {
  const next = new Set(typing);
  if (on) next.add(personId);
  else next.delete(personId);
  typing = next;
  typingListeners.forEach((listener) => listener());
}

function subscribeTyping(listener: () => void) {
  typingListeners.add(listener);
  return () => {
    typingListeners.delete(listener);
  };
}

const EMPTY_TYPING: ReadonlySet<string> = new Set();

/** Ids of people who are "typing" a reply right now. */
export function useTyping(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeTyping, () => typing, () => EMPTY_TYPING);
}

// --- Sending and replying ---------------------------------------------------

function appendMessage(from: string, to: string, body: string) {
  const message: Message = {
    id: newId(),
    from_profile_id: from,
    to_profile_id: to,
    body,
    created_at: new Date().toISOString(),
  };
  messageStore.write([...messageStore.read(), message]);
}

/** A reply arrives a moment after you send. The timer lives here, not in a screen, so leaving the chat does not cancel it. */
function scheduleReply(person: ChatPerson) {
  if (typing.has(person.id)) return;
  setTyping(person.id, true);
  const delay = 1300 + Math.random() * 900;
  window.setTimeout(() => {
    const thread = threadWith(messageStore.read(), person.id);
    const replies = thread.filter((m) => m.from_profile_id === person.id).length;
    appendMessage(person.id, DEMO_USER_ID, scriptedReply(person, replies));
    setTyping(person.id, false);

    // An outreach that was waiting on this person is now answered.
    outreachStore.write(
      outreachStore
        .read()
        .map((o) => (o.to_profile_id === person.id && o.status === "sent" ? { ...o, status: "replied" as const } : o)),
    );
  }, delay);
}

/** Send a message to a person. Returns false when it is empty. Made-up people reply a moment later. */
export function sendMessage(person: ChatPerson, body: string): boolean {
  const text = body.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text) return false;
  appendMessage(DEMO_USER_ID, person.id, text);
  if (person.is_sample) scheduleReply(person);
  return true;
}

/** If your last message never got a reply (the page was reloaded mid-reply), the reply is sent now. */
export function ensureReply(person: ChatPerson) {
  if (!person.is_sample) return;
  const thread = threadWith(messageStore.read(), person.id);
  const last = thread[thread.length - 1];
  if (last && last.from_profile_id === DEMO_USER_ID) scheduleReply(person);
}

/** Send a first message and remember it, so you can see its status and do not message the same person twice. */
export function sendOutreach(
  person: ChatPerson,
  kind: OutreachKind,
  message: string,
  opportunityId: string | null = null,
): boolean {
  if (!sendMessage(person, message)) return false;
  const row: Outreach = {
    id: newId(),
    from_profile_id: DEMO_USER_ID,
    to_profile_id: person.id,
    opportunity_id: opportunityId,
    kind,
    message: message.trim().slice(0, MAX_MESSAGE_LENGTH),
    status: "sent",
    created_at: new Date().toISOString(),
  };
  outreachStore.write([...outreachStore.read(), row]);
  return true;
}

// --- Reading ---------------------------------------------------------------

/** Messages between you and one person, oldest first. */
export function threadWith(messages: Message[], personId: string): Message[] {
  return messages.filter((m) => m.from_profile_id === personId || m.to_profile_id === personId);
}

/** The person on the other side of a message. */
export function otherSide(message: Message): string {
  return message.from_profile_id === DEMO_USER_ID ? message.to_profile_id : message.from_profile_id;
}

export function unreadFrom(messages: Message[], reads: Record<string, string>, personId: string): number {
  const readAt = reads[personId] ?? "";
  return messages.filter((m) => m.from_profile_id === personId && m.created_at > readAt).length;
}

/** Mark a chat as read, if it has anything unread. */
export function markRead(personId: string) {
  if (unreadFrom(messageStore.read(), readStore.read(), personId) === 0) return;
  readStore.write({ ...readStore.read(), [personId]: new Date().toISOString() });
}

export function useMessages(): Message[] {
  return messageStore.use();
}

export function useOutreach(): Outreach[] {
  return outreachStore.use();
}

export function useReads(): Record<string, string> {
  return readStore.use();
}

/** How many messages across all chats you have not read. */
export function useUnreadTotal(): number {
  const messages = messageStore.use();
  const reads = readStore.use();
  const people = new Set(messages.filter((m) => m.from_profile_id !== DEMO_USER_ID).map((m) => m.from_profile_id));
  let total = 0;
  for (const id of people) total += unreadFrom(messages, reads, id);
  return total;
}

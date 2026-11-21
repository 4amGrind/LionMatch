// The slice of a profile that chats need. Kept apart from chat.ts, which only runs in the browser,
// so server pages can build it and hand it to the chat screens.

import type { Profile } from "./types";

export type ChatPerson = Pick<
  Profile,
  "id" | "full_name" | "role" | "headline" | "interests" | "is_sample" | "open_to_chat"
>;

/** Tags are lowercase in the data. In a sentence these read better in capitals ("talk about NLP"). */
const ACRONYMS = new Set(["ai", "ml", "nlp", "hci", "ar/vr", "ui", "ux"]);

/** A tag written for the middle of a sentence: "nlp" becomes "NLP", "robotics" stays as it is. */
export function inSentence(topic: string): string {
  return ACRONYMS.has(topic.toLowerCase()) ? topic.toUpperCase() : topic;
}

/** The person's first interest, written for a sentence, or `fallback` when they list none. */
export function chatTopic(person: ChatPerson, fallback: string): string {
  const topic = person.interests[0];
  return topic ? inSentence(topic) : fallback;
}

export function toChatPerson(p: Profile): ChatPerson {
  return {
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    headline: p.headline,
    interests: p.interests,
    is_sample: p.is_sample,
    open_to_chat: p.open_to_chat,
  };
}

// The slice of a profile that chats need. Kept apart from chat.ts, which only runs in the browser,
// so server pages can build it and hand it to the chat screens.

import type { Profile } from "./types";

export type ChatPerson = Pick<
  Profile,
  "id" | "full_name" | "role" | "headline" | "interests" | "is_sample" | "open_to_chat"
>;

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

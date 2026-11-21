import { notFound } from "next/navigation";
import ChatThread from "@/components/ChatThread";
import { toChatPerson } from "@/lib/chat-person";
import { DEMO_USER_ID, getProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const person = id === DEMO_USER_ID ? null : await getProfile(id);
  if (!person) notFound();

  return <ChatThread person={toChatPerson(person)} />;
}

import ChatList from "@/components/ChatList";
import { PageTitle } from "@/components/ui";
import { toChatPerson } from "@/lib/chat-person";
import { getPeople } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const people = (await getPeople()).map(toChatPerson);

  return (
    <>
      <PageTitle title="Chats" subtitle="Coffee chats and outreach with people open to talking." />
      <ChatList people={people} />
    </>
  );
}

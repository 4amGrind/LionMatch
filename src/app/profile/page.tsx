import ProfileScreen from "@/components/ProfileScreen";
import { getCurrentUser, getVocabulary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [user, suggestions] = await Promise.all([getCurrentUser(), getVocabulary()]);
  return <ProfileScreen user={user} suggestions={suggestions} />;
}

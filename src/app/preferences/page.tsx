import ProfileEditor from "@/components/ProfileEditor";
import { Card, OwnerNote, PageTitle } from "@/components/ui";
import { getCurrentUser, getVocabulary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const [user, suggestions] = await Promise.all([getCurrentUser(), getVocabulary()]);

  return (
    <>
      <PageTitle title="Preferences" subtitle="What the match score uses about you." />
      <Card>
        <ProfileEditor user={user} suggestions={suggestions} fields="match" />
      </Card>
      <OwnerNote owner="Jun">
        The form is built and shared with the Profile screen (src/components/ProfileEditor.tsx). Still to build:
        resume import. The score lives in src/lib/match.ts.
      </OwnerNote>
    </>
  );
}

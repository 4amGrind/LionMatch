import { Card, OwnerNote, PageTitle, TagList } from "@/components/ui";
import { getCurrentUser } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageTitle title="Preferences" subtitle="What the match score uses about you." />
      <Card className="space-y-3">
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Looking for</h2>
          <TagList items={user.looking_for.map((category) => CATEGORY_LABELS[category])} />
        </div>
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Skills</h2>
          <TagList items={user.skills} max={12} />
        </div>
        <div>
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Interests</h2>
          <TagList items={user.interests} max={12} />
        </div>
      </Card>
      <OwnerNote owner="Jun">
        Build the form that edits these, plus resume import. The score lives in src/lib/match.ts.
      </OwnerNote>
    </>
  );
}

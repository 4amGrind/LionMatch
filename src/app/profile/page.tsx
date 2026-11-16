import Link from "next/link";
import { Card, OwnerNote, PageTitle, TagList } from "@/components/ui";
import { getCurrentUser } from "@/lib/data";
import { CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const facts = [user.school, user.major, user.class_year ? `Class of ${user.class_year}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageTitle title={user.full_name} subtitle={user.headline} />
      <div className="space-y-4">
        <Card className="space-y-3">
          <p className="text-sm text-ct-muted">{facts}</p>
          {user.bio ? <p className="text-sm leading-relaxed">{user.bio}</p> : null}
          <div>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Skills</h2>
            <TagList items={user.skills} max={12} />
          </div>
          <div>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Interests</h2>
            <TagList items={user.interests} max={12} />
          </div>
          <div>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ct-muted">Looking for</h2>
            <TagList items={user.looking_for.map((category) => CATEGORY_LABELS[category])} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/preferences"
            className="glass-surface rounded-xl py-3 text-center text-sm font-semibold text-ct-navy"
          >
            Preferences
          </Link>
          <Link
            href="/history"
            className="glass-surface rounded-xl py-3 text-center text-sm font-semibold text-ct-navy"
          >
            Swipe history
          </Link>
        </div>
      </div>
      <OwnerNote owner="Ayan">Make this profile editable once login is in.</OwnerNote>
    </>
  );
}

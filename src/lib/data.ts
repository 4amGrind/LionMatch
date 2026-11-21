// The one place the app reads opportunities and people from.
// Pages and components should call these functions, not Supabase directly.
// With Supabase env vars set, data comes from the database.
// Without them, data comes from the seed files, so the app always runs.

import { cookies } from "next/headers";
import seedOpportunities from "@/data/opportunities.json";
import seedProfiles from "@/data/profiles.json";
import { applyProfileEdits, parseProfileCookie, PROFILE_COOKIE } from "./profile-edits";
import { getSupabase } from "./supabase";
import { DEMO_USER_ID, type Category, type Opportunity, type Profile } from "./types";

const localOpportunities = seedOpportunities as Opportunity[];
const localProfiles = seedProfiles as Profile[];

// Lives in types.ts so browser code (chats) can use it too. Still importable from here.
export { DEMO_USER_ID };

export interface OpportunityFilters {
  category?: Category;
  /** Matches title, organization, description, tags, and skills. */
  search?: string;
}

function matchesSearch(o: Opportunity, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [o.title, o.organization, o.description, ...o.tags, ...o.skills]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export async function getOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  const supabase = getSupabase();
  let rows = localOpportunities;

  if (supabase) {
    const { data, error } = await supabase.from("opportunities").select("*").order("title");
    if (error) throw new Error(`Could not load opportunities: ${error.message}`);
    rows = data as Opportunity[];
  }

  return rows.filter(
    (o) =>
      (!filters.category || o.category === filters.category) &&
      (!filters.search || matchesSearch(o, filters.search)),
  );
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = getSupabase();
  if (!supabase) return localOpportunities.find((o) => o.id === id) ?? null;

  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load opportunity ${id}: ${error.message}`);
  return data as Opportunity | null;
}

/** Everyone except the current user. */
export async function getPeople(): Promise<Profile[]> {
  const supabase = getSupabase();
  if (!supabase) return localProfiles.filter((p) => p.id !== DEMO_USER_ID);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", DEMO_USER_ID)
    .order("full_name");
  if (error) throw new Error(`Could not load people: ${error.message}`);
  return data as Profile[];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return localProfiles.find((p) => p.id === id) ?? null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load profile ${id}: ${error.message}`);
  return data as Profile | null;
}

/**
 * The signed-in user. For now this is always the demo profile, plus any edits saved from the
 * Profile or Preferences screen (kept in a cookie, see profile-edits.ts).
 * When login is added, change this one function and the rest of the app follows.
 */
export async function getCurrentUser(): Promise<Profile> {
  const profile = await getProfile(DEMO_USER_ID);
  if (!profile) {
    throw new Error(`Demo profile "${DEMO_USER_ID}" is missing. Run "npm run seed" or check src/data/profiles.json.`);
  }
  const store = await cookies();
  return applyProfileEdits(profile, parseProfileCookie(store.get(PROFILE_COOKIE)?.value));
}

/** Every skill and interest used in the data, most common first. Offered as suggestions when editing a profile. */
export async function getVocabulary(): Promise<{ skills: string[]; interests: string[] }> {
  const [opportunities, people] = await Promise.all([getOpportunities(), getPeople()]);
  const rank = (lists: string[][]) => {
    const counts = new Map<string, { label: string; n: number }>();
    for (const item of lists.flat()) {
      const key = item.toLowerCase();
      const entry = counts.get(key) ?? { label: item, n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((e) => e.label);
  };
  return {
    skills: rank([...opportunities.map((o) => o.skills), ...people.map((p) => p.skills)]),
    interests: rank([...opportunities.map((o) => o.tags), ...people.map((p) => p.interests)]),
  };
}

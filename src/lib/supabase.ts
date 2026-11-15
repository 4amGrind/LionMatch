import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when .env.local has the Supabase URL and anon key. */
export const hasSupabase = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Returns the shared Supabase client, or null when the env vars are missing.
 * When it returns null, the data layer falls back to the seed files.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

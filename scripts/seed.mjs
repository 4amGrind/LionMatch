// Loads src/data/*.json into Supabase.
// Run with: npm run seed
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Safe to run again. Rows with the same id are updated, not duplicated.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Profiles go first because opportunities point at them.
for (const table of ["profiles", "opportunities"]) {
  const rows = read(table);
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    console.error(`Failed to seed ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} rows into ${table}.`);
}

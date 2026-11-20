-- Columbia Tinder database schema.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Then run `npm run seed` to load the data in src/data.
-- Column names match src/lib/types.ts. Change both together.

create table if not exists profiles (
  id            text primary key,
  -- Set when real login is added. Null for sample people.
  auth_user_id  uuid unique references auth.users (id) on delete cascade,
  full_name     text not null,
  role          text not null default 'student'
                check (role in ('student', 'club_lead', 'researcher', 'alum', 'recruiter')),
  headline      text not null default '',
  school        text,
  class_year    int,
  major         text,
  bio           text not null default '',
  skills        text[] not null default '{}',
  courses       text[] not null default '{}',
  interests     text[] not null default '{}',
  looking_for   text[] not null default '{}',
  open_to_chat  boolean not null default true,
  avatar_url    text,
  linkedin_url  text,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Added after the first version. Safe to run on a database made before this column existed.
alter table profiles add column if not exists courses text[] not null default '{}';

create table if not exists opportunities (
  id                  text primary key,
  title               text not null,
  organization        text not null,
  category            text not null
                      check (category in ('internship', 'club', 'research', 'fellowship')),
  description         text not null default '',
  tags                text[] not null default '{}',
  skills              text[] not null default '{}',
  majors              text[] not null default '{}',
  prerequisites       text[] not null default '{}',
  location            text,
  commitment          text,
  deadline            date,
  url                 text,
  source_url          text,
  verified            boolean not null default false,
  contact_profile_id  text references profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists opportunities_category_idx on opportunities (category);

-- One row per user per target. A new swipe replaces the old one.
create table if not exists swipes (
  profile_id   text not null references profiles (id) on delete cascade,
  target_type  text not null check (target_type in ('opportunity', 'person')),
  target_id    text not null,
  direction    text not null check (direction in ('like', 'pass', 'save')),
  created_at   timestamptz not null default now(),
  primary key (profile_id, target_type, target_id)
);

-- Coffee chat requests and outreach messages, with a status for the tracker.
create table if not exists outreach (
  id               uuid primary key default gen_random_uuid(),
  from_profile_id  text not null references profiles (id) on delete cascade,
  to_profile_id    text not null references profiles (id) on delete cascade,
  opportunity_id   text references opportunities (id) on delete set null,
  kind             text not null check (kind in ('coffee_chat', 'outreach')),
  message          text not null default '',
  status           text not null default 'draft' check (status in ('draft', 'sent', 'replied')),
  created_at       timestamptz not null default now()
);

-- Chat messages between two profiles.
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  from_profile_id  text not null references profiles (id) on delete cascade,
  to_profile_id    text not null references profiles (id) on delete cascade,
  body             text not null,
  created_at       timestamptz not null default now()
);

create index if not exists messages_pair_idx on messages (from_profile_id, to_profile_id, created_at);

-- Row level security.
-- Anyone can read opportunities and profiles.
-- Only a signed-in user can write, and only their own rows.
-- Until login is added, the app keeps swipes in the browser instead.

alter table profiles      enable row level security;
alter table opportunities enable row level security;
alter table swipes        enable row level security;
alter table outreach      enable row level security;
alter table messages      enable row level security;

create or replace function my_profile_id() returns text
language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid()
$$;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select using (true);

drop policy if exists "edit own profile" on profiles;
create policy "edit own profile" on profiles for update
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

drop policy if exists "create own profile" on profiles;
create policy "create own profile" on profiles for insert
  with check (auth_user_id = auth.uid());

drop policy if exists "read opportunities" on opportunities;
create policy "read opportunities" on opportunities for select using (true);

drop policy if exists "own swipes" on swipes;
create policy "own swipes" on swipes for all
  using (profile_id = my_profile_id()) with check (profile_id = my_profile_id());

drop policy if exists "read own outreach" on outreach;
create policy "read own outreach" on outreach for select
  using (from_profile_id = my_profile_id() or to_profile_id = my_profile_id());

drop policy if exists "write own outreach" on outreach;
create policy "write own outreach" on outreach for insert
  with check (from_profile_id = my_profile_id());

drop policy if exists "update own outreach" on outreach;
create policy "update own outreach" on outreach for update
  using (from_profile_id = my_profile_id() or to_profile_id = my_profile_id());

drop policy if exists "read own messages" on messages;
create policy "read own messages" on messages for select
  using (from_profile_id = my_profile_id() or to_profile_id = my_profile_id());

drop policy if exists "send own messages" on messages;
create policy "send own messages" on messages for insert
  with check (from_profile_id = my_profile_id());

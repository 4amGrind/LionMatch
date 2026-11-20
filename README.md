# Columbia Tinder

Swipe on internships, clubs, research, and fellowships at Columbia. Each card shows a match score out of 10 and the reasons behind it. You can also explore a list, open a profile, and draft a coffee chat or outreach message.

Built for a one-week hackathon with Next.js, TypeScript, Tailwind, and Supabase.

## Run it

You need Node 20 or newer.

```bash
git clone https://github.com/4amGrind/columbia-tinder.git
cd columbia-tinder
npm install
npm run dev
```

Open http://localhost:3000. It works right away with no accounts. Until Supabase is set up, the app reads the seed files in `src/data`.

Run `npm install` again whenever you pull changes that touch `package.json`. The swipe deck uses two packages, `motion` and `canvas-confetti`, and the app will not start without them.

## Connect Supabase

One person does steps 1 to 3. Everyone does step 4.

1. Make a project at supabase.com.
2. Open SQL Editor, paste all of `supabase/schema.sql`, and run it.
3. Copy `.env.example` to `.env.local`, fill in all three values, and run `npm run seed`.
4. Copy `.env.example` to `.env.local` and fill in the URL and anon key. Teammates can leave the service role key blank.

Never commit `.env.local`. The service role key can change anything in the database.

## Who owns what

| Person | Area | Start here |
| --- | --- | --- |
| Alex | Base app, data, repo | `src/lib/data.ts`, `src/data`, `supabase/schema.sql` |
| Jun | Match score, preferences, resume import | `src/lib/match.ts`, `src/app/preferences` |
| Max | Swipe deck and cards, look and feel | `src/components/SwipeDeck.tsx`, `src/components/DeckCard.tsx`, `src/app/globals.css` |
| Peter | Explore, search, opportunities, prerequisites | `src/components/ExploreList.tsx`, `src/app/opportunities/[id]` |
| Ayan | Profiles, outreach, chats, swipe history | `src/app/people/[id]`, `src/components/OutreachBox.tsx`, `src/app/chats`, `src/components/HistoryList.tsx` |

Each screen has a dashed "Owner" note that says what is left. Delete the note when the screen is done.

## How the code is laid out

```
src/app/            One folder per screen
src/components/     Shared pieces. ui.tsx has the tags, cards, and score badge
src/lib/types.ts    Shared types. Match the database columns
src/lib/data.ts     All reads of opportunities and people
src/lib/match.ts    Match score out of 10
src/lib/swipes.ts   Saving and reading swipes
src/data/           Seed data as JSON
supabase/schema.sql Database tables and access rules
scripts/seed.mjs    Loads the seed data into Supabase
public/             Wallpaper and the crown logo
```

Three rules keep five people from breaking each other's work:

1. Read data through `src/lib/data.ts`. Do not call Supabase from a page.
2. Use the types in `src/lib/types.ts`. If you need a new field, add it to the type, the schema, and the seed file in one pull request.
3. Use the pieces in `src/components/ui.tsx` so screens look the same.

## Look and feel

The app always has phone proportions. On a laptop it shows inside a phone-shaped frame. Pages sit on a blue wave wallpaper, with glass panels on top. The sun and moon button in the header switches between light and dark mode.

To keep a new screen working in both modes:

- Use the `ct-` colors, like `text-ct-navy`, `text-ct-muted`, and `bg-ct-card`. They change with the mode. Fixed colors like `bg-white` or `text-black` will look wrong in dark mode.
- For a panel, use `Card` from `ui.tsx`, or the `glass-surface` class. For a small floating control, use `glass`.
- Outline-only buttons with no background are hard to read over the dark part of the wallpaper. Give them `glass-surface`.

All the colors and glass styles live in `src/app/globals.css`.

## Working together

`main` should always run. Do your work on a branch.

```bash
git checkout main && git pull
git checkout -b max/swipe-gestures
# make changes
npm run lint && npm run typecheck && npm run build
git add -A && git commit -m "Add drag gestures to the deck"
git push -u origin max/swipe-gestures
```

Then open a pull request on GitHub and ask one teammate to look at it. Keep pull requests small. Merge at least once a day so branches do not drift apart.

## About the data

- `src/data/opportunities.json` has 48 listings. Clubs, labs, and fellowships use real names taken from official Columbia pages on 2026-11-15. Each row has a `source_url`.
- `verified: true` means the name was checked on an official page. It does not mean the description, deadline, or prerequisites were checked, except for the rows below.
- 8 rows were checked in full on their official pages on 2026-11-20, including eligibility, prerequisites, and deadlines: DSI Scholars, Discover Citadel, SEO Career, the Knight Institute legal internship, Columbia Law HRIP, GET-UPP, Biology SURF, and Microsoft Explore. Deadlines and prerequisites on the other rows are still empty.
- Prerequisites with a course code in capitals, like `COMS W3134`, are checked against the courses on your profile. Other rules, like class year or GPA, show as "check yourself".
- The internship rows are `verified: false`. Check each one before the demo.
- Being in this list does not mean a club or lab is recruiting. Check the linked page.
- `src/data/profiles.json` has 12 people. All of them are made up and marked `is_sample`. Do not add real people without their OK.
- To add a listing, add a row to the JSON file and run `npm run seed`.

## Not built yet

- Login. `getCurrentUser()` in `src/lib/data.ts` always returns the demo profile. Swipes are saved in the browser only.
- Sending messages in the app. The `outreach` and `messages` tables exist but nothing writes to them.
- Editing your profile.

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

Run `npm install` again whenever you pull changes that touch `package.json`. The swipe deck uses two packages, `motion` and `canvas-confetti`, and the app will not start without them. Resume import adds `pdfjs-dist`, and installing also copies its worker to `public/pdf.worker.min.mjs`. That copy is gitignored, so PDF import is the one thing that breaks if you skip the install.

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
src/lib/swipes.ts   Saving and reading swipes, plus the log of every swipe event
src/lib/recommend.ts  Learns from swipes and orders the deck
src/lib/chat.ts     Chats and outreach tracking (browser only for now)
src/lib/profile-edits.ts  Profile edits, kept in a cookie until login
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

## How the deck learns from swipes

Every swipe is saved twice: as your latest choice on that card (what History shows), and as an event in an append-only log with the score the card had and where the swipe came from. `src/lib/recommend.ts` reads both.

1. Each card becomes a list of features, like `topic:robotics` or `skill:python`.
2. Interested and Save push those features up. Pass pushes them down, more gently. Old swipes fade, and a feature with little evidence stays near zero.
3. The deck order blends the match score from `match.ts` with how much each card leans toward things you liked. With no swipes it is exactly the match score. After 15 swipes your swipes decide 60 percent of the order. The match score never drops out.
4. The cards on screen never move. Only the cards behind them re-rank. Every fifth card is a wildcard from the part of the deck you have told us least about.
5. Cards say why: "Because you liked Columbia Space Initiative (robotics, hardware)".

The chips above the deck pick which kinds of cards show (Internship, Club, Research, Fellowship, People). Tapping a chip shows just that kind, more taps add kinds, and tapping the last one again shows everything. The choice is saved in the browser.

History shows what the deck learned, and has sample tastes so you can see it work with no swiping. If your swipes disagree with your profile, History says so and links to Preferences.

`npm run replay` checks the rules and replays made-up people through the deck. Run it after changing a number in `recommend.ts`.

Tags only match when they share a word, so "consulting" does not teach the deck about "finance". Embeddings of the card descriptions would fix that. They need an API key and a server route, so they are not in yet.

## About the data

- `src/data/opportunities.json` has 48 listings. Clubs, labs, and fellowships use real names taken from official Columbia pages on 2026-11-15. Each row has a `source_url`.
- `verified: true` means the name was checked on an official page. It does not mean the description, deadline, or prerequisites were checked, except for the rows below.
- 8 rows were checked in full on their official pages on 2026-11-20, including eligibility, prerequisites, and deadlines: DSI Scholars, Discover Citadel, SEO Career, the Knight Institute legal internship, Columbia Law HRIP, GET-UPP, Biology SURF, and Microsoft Explore.
- Every other row got a deadline and, where the program page lists them, prerequisites on 2026-11-21. Most 2027 dates are not posted yet, so those are placeholders based on last cycle or the usual season, and `deadline_estimated: true` marks them. The app labels them "estimated". When a program posts its real date, update the row and set `deadline_estimated` to false. Rabi Scholars has no deadline because students are chosen at admission.
- Prerequisites with a course code in capitals, like `COMS W3134`, are checked against the courses on your profile. Other rules, like class year or GPA, show as "check yourself".
- One row is still `verified: false`: Career Education's Startup Internship Program, which may not run every year. Check it before relying on it.
- Being in this list does not mean a club or lab is recruiting. Check the linked page.
- `src/data/profiles.json` has 12 people. All of them are made up and marked `is_sample`. Do not add real people without their OK.
- To add a listing, add a row to the JSON file and run `npm run seed`.

## Not built yet

- Login. `getCurrentUser()` in `src/lib/data.ts` always returns the demo profile, plus any edits saved in a cookie. Swipes, chats, and outreach are saved in the browser only. When login arrives, move them into the `swipes`, `swipe_events`, `messages`, and `outreach` tables.
- Real replies in chat. The people in the seed data are made up, so their replies are scripted. Real users need Supabase realtime on `messages`.

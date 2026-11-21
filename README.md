# LionMatch

Swipe through internships, clubs, research and fellowships at Columbia. Every card shows a match score out of 10 and the reasons behind it, and the deck learns from what you swipe. When something fits, you can read the details, find someone to talk to, and send a coffee chat in a few taps.

Built with Next.js, TypeScript, Tailwind and Supabase.

**Try it: [lionmatch.vercel.app](https://lionmatch.vercel.app)** (best on a phone; your swipes stay in your browser)

## Run it

You need Node 22.13 or newer (check with `node -v`).

```bash
git clone https://github.com/4amGrind/columbia-tinder.git
cd columbia-tinder
npm install
npm run dev
```

Open http://localhost:3000. If port 3000 is busy, Next.js picks another port and prints it. The app works right away with no accounts, using the data in `src/data`.

To present it, run `npm run demo` instead. It builds the app once and serves the fast version, so pages open instantly, the Next.js dev badge doesn't show, and it needs no internet after `npm install`. Open it in a private window to start from a clean slate. If port 3000 is taken, run `npx next start -p 3001` after the build and open http://localhost:3001.

## Demo

[![LionMatch demo video](docs/lionmatch-poster.jpg)](docs/lionmatch-demo.mp4?raw=true)

[Download the 86-second demo](docs/lionmatch-demo.mp4?raw=true) (MP4, 22 MB, 1080p, 60 fps, with sound). The film was made in code from the real app. Its source is in [`lionmatch-video/`](lionmatch-video/).

## What you can do

- **Swipe.** Drag a card right for Interested, left to Pass, or up to Save. The buttons and arrow keys do the same, and Undo brings the last card back. A strong match (8 or more) gets confetti.
- **Filter the deck.** Chips above the deck switch between internships, clubs, research, fellowships and people.
- **See why it fits.** Every card lists the reasons behind its score, such as shared skills, shared interests, your major and what you are looking for.
- **Explore.** Search everything by name, skill, topic or course. Sort by best match, deadline or name, hide closed listings, or show only the ones whose course prerequisites you meet.
- **Read the details.** Each listing shows location, time commitment, deadline, majors, helpful skills, prerequisites, a link to the official page, and sometimes someone to talk to.
- **Meet people.** People profiles show why you would get along. Reach out with a coffee chat or outreach message, drafted for you and fully editable, and it lands in Chats.
- **Watch it learn.** History shows everything you have swiped and what the deck has learned from it. Sample tastes let you see the learning with no swiping.
- **Tell it about you.** Set your skills, interests, major and what you are looking for in Preferences, or import them from a PDF resume or LinkedIn export.
- **Light or dark.** The sun and moon button switches themes.

## How the match score works

`src/lib/match.ts` scores every listing out of 10:

- Everyone starts at 3, so no card looks hopeless.
- Shared skills add 1.5 each, up to 3.
- Shared interests add 1 each, up to 2.
- A listing that names your major adds 1.5. One open to every major adds 0.5.
- A kind of listing you are looking for adds 1.

People are scored the same way, on shared skills, shared interests and the same major. Each of these shows up as a reason on the card, so the number never feels random.

## How the deck learns

Every swipe is saved twice: as your latest choice on that card, and as an event in a log with the score the card had at the time. `src/lib/recommend.ts` reads both.

1. Each card becomes a list of features, like `topic:robotics` or `skill:python`.
2. Interested and Save push those features up. Pass pushes them down, more gently. Old swipes fade, and a feature with little evidence stays near zero.
3. The deck order blends the match score with how much each card leans toward things you liked. With no swipes it is exactly the match score. After 15 swipes, your swipes decide 60 percent of the order. The match score always counts.
4. The cards on screen never jump. Only the cards behind them re-rank. Every fifth card is a wildcard from the part of the deck you have told it least about.
5. Cards say why, for example "Because you liked Columbia Space Initiative (robotics, hardware)".

`npm run replay` replays made-up people through the deck to check the rules.

## Resume import

The resume import reads a PDF in your browser. The file is never uploaded. It looks only for the skills and topics the listings use, and you choose which finds to add. `src/lib/resume.ts` does the matching. It recognises common ways of writing the same thing, such as "Arduino" for Electronics or "PostgreSQL" for SQL, and never adds a skill the resume does not mention.

## About the data

- **Listings.** `src/data/opportunities.json` has 48 listings. Clubs, labs and fellowships use real names from official Columbia pages, and each row links its source.
- **Checked rows.** 8 listings were checked in full against their official pages, including eligibility, prerequisites and deadlines. Deadlines that programs have not posted yet are shown as "estimated".
- **Prerequisites.** Course codes like `COMS W3134` are checked against the courses on your profile. Other rules, like class year or GPA, show as "check yourself".
- **Recruiting.** Being listed does not mean a club or lab is recruiting. The official page has the latest.
- **People.** `src/data/profiles.json` has 12 sample people. They are made up and labelled as samples, so their chat replies are scripted.

## Connect Supabase (optional)

Without Supabase the app reads the files in `src/data`. To use a database:

1. Create a project at supabase.com.
2. In SQL Editor, run all of `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the URL and keys.
4. Run `npm run seed`.

Keep `.env.local` out of git. The service role key can change anything in the database.

## How it's built

- Next.js 16 (App Router) and React 19, in TypeScript.
- Tailwind CSS 4, with a liquid-glass theme over a Columbia-blue wave wallpaper (`src/app/globals.css`).
- Instrument Sans, bundled in `src/app/fonts` with its license, so the app builds with no internet.
- Deck cards fit their content to the space they get. If a card has more to say than fits, `fitContent()` in `DeckCard.tsx` hides extras in a set order, so the last reason and the link to the details are never cut off.
- Motion for the swipe physics, and canvas-confetti for strong matches.
- pdf.js for reading resumes in the browser.
- Supabase, optional, for data.

```
src/app/              One folder per screen
src/components/       Shared pieces: deck, cards, explore list, chats, preferences
src/lib/match.ts      Match score out of 10, with reasons
src/lib/recommend.ts  Learning from swipes and ordering the deck
src/lib/resume.ts     Resume import
src/lib/data.ts       All reads of listings and people
src/data/             Listings and sample people
supabase/schema.sql   Database tables and access rules
lionmatch-video/      The demo film, made with Remotion
```

There is no sign-in yet. The app runs as a demo profile, and swipes, chats and profile edits are kept in your browser.

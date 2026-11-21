# LionMatch launch film: storyboard

86.4 seconds, 16:9, 60 fps. The music runs at 100 BPM, so one beat is 0.6 s (36 frames) and one bar is 2.4 s (144 frames). Scene changes, swipes, taps and the two logo hits land on the beat.

Everything on screen is the real app or computed by it:

- **Screens.** Captured from a local copy of the app with Playwright (`scripts/capture.mjs`), in a clean browser profile, with real taps, swipes, a resume import and a sent coffee chat.
- **Cards.** Deck cards are drawn live so they can move. They copy the app's `DeckCard.tsx`, with the same sizes, colors and wording, on top of a real screenshot of the Swipe tab.
- **Scores, reasons, deck order and re-ranking.** Computed at render time by the app's own `src/lib/match.ts`, `src/lib/recommend.ts` and `src/lib/resume.ts` (see `src/lib/appData.ts`).
- **People and the resume.** Hana Kim is one of the app's sample profiles. The resume is made up and says so on the page.

| Time | Scene | What you see | What it shows | Into the next scene |
| --- | --- | --- | --- | --- |
| 0:00–0:09.6 | 1. The problem | A point of light in the dark. "Opportunities are everywhere." Listings from the app's data (Google, Columbia Space Initiative, the NLP group, Laidlaw…) and generic messages float up into an orderly wall, then drift apart as the camera moves through them. "Finding the right one shouldn't be this hard." | Opportunities are scattered across many places | Every fragment collapses into the point of light |
| 0:09.6–0:16.8 | 2. The reveal | A ring breathes out of the point. The app's crown, traced to a vector from `public/brand/crown.png`, draws itself and fills on the downbeat (0:12), with a light sweep. "LionMatch" rises in. "Your next opportunity. One swipe away." | The brand | The crown and name fly into the header of the app as the phone rises to meet them, landing exactly on the real header |
| 0:16.8–0:26.4 | 3. The product | The phone turns once to show its depth, then settles left. The app's category filter is tapped on each beat: Internships (Google SWE), Research (NLP group), Clubs (WiCS), Fellowships (Laidlaw), People (Hana Kim), with the word list ticking alongside. "All in one deck. Matched to you, card by card." | One deck holds every kind of opportunity, filterable by kind | The camera pushes in to the deck |
| 0:26.4–0:37.2 | 4. The swipe | A close-up of the real deck. A finger drags WiCS up (Save), the NLP group right (Interested), with the app's confetti and "Strong match 10/10" pill, and the Causal AI Lab left (Pass). Stamps, springs and stack movement use the app's own values. A legend on the left lights each gesture. The next card, Hana Kim, ranked by the recommender because of those swipes, lifts out of the phone into the room. "Every match comes with a reason." | Swiping, the three actions, personalization | The card's score lifts off |
| 0:37.2–0:50.4 | 5. Intelligent matching | "10/10" grows to the top of the frame. Your profile and Hana's face each other, and lines connect what you share, following `matchPerson()`: everyone starts at 3, +3 shared skills (Python, Machine Learning), +3 shared interests (machine learning, ai), +1 same major. Then the swipe that also counts: "Because you liked Research with the Natural Language Processing Group". "Not just opportunities. Opportunities that fit." Then "Every swipe teaches the deck.": the three swipes, and the cards further back re-ranking with real "Because you liked…" reasons. "Your swipes decide 12% of the deck order. The rest is your profile match." (the app's own wording and number) | Explainable scores, learning from swipes | The row clears |
| 0:50.4–1:00 | 6. Built around you | A made-up resume on the left, the Preferences screen on the right. "Your experience." A scan line reads the page and highlights only what listings use (Arduino → Electronics, ROS, PyTorch, Research assistant → Lab Work and research, statistical → Statistics, Computer Science, Robotic → robotics). "Your interests." Each find lifts off and lands where the app lists it; "Add 8 to the form" is tapped. "Your future.": the Robotics Laboratory card goes from 8/10 to 10/10 against the updated profile | Resume import (keyword matching in the browser, no AI claims), preferences, scores that follow your profile | The card clears and the phone slides in |
| 1:00–1:12 | 7. Discover, connect, next step | "Discover." The NLP card you liked opens: the card grows into the real details page, which then scrolls (one captured frame per film frame) through location, deadline, majors, skills and prerequisites to "Someone to talk to: Hana Kim". "Connect." Her page slides in and scrolls to "Reach out", where the app has drafted a coffee chat from its template. "Take the next step." Send in chat; Chats opens, the typing dots give way to her reply. A small note says Hana is a sample profile with scripted replies | Details and prerequisites, people, outreach, chats | The phone steps back to the centre and returns to the deck |
| 1:12–1:19.2 | 8. The product, together | "Less searching. More finding." Explore (a "robotics" search), History ("What the deck learned"), the coffee-chat box and the resume import gather around the deck in a shallow arc, each labelled. The camera eases back | The whole app as one system | Every screen folds into a single point |
| 1:19.2–1:26.4 | 9. End card | The point becomes the crown, which fills on the downbeat (1:19.8). "LionMatch". "Find your fit. Find your future." "Built for Columbia students." Hold, then fade to black | Brand | End |

## Sound

The music is original and synthesized from scratch by `scripts/make-audio.mjs`: warm pads, a soft electric-piano arpeggio, a gentle kick, hats and bass in D major at 100 BPM. Its structure follows the film:

- A sparse intro that builds into the first logo hit.
- A groove under the product scenes.
- A breakdown while the score is explained.
- A peak under the montage.
- A riser, the final hit, and a long last chord.

Sound effects are cued to the frame: finger-down ticks, card throws, the strong-match sparkle, a rising ping for each matched link, scan ticks, landing clicks for each resume find, taps, page pushes and the reply chime. The mix is set to −16 LUFS integrated, with peaks under −1.5 dBTP. There is no voiceover; the on-screen type carries the story with the sound off.

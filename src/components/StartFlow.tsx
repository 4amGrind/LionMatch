"use client";

// Onboarding, built from the Flashpoint survey. OWNER: Jun.
//
// The ten questions we published through Flashpoint are what told us which
// preferences actually move a match. Q1 ("which of these have you looked for")
// is the one that maps straight onto the score, so it opens this flow; the rest
// of the steps collect the three other fields match.ts reads.
//
// The last step hands people to the live Flashpoint survey. That is the loop:
// the study shaped the onboarding, and the onboarding recruits for the study.

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";
import { MAX_ITEMS, cleanList, savePreferencesInBrowser, type Preferences } from "@/lib/preferences";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

/** The published study. Shown at the end so people can answer the full ten. */
export const SURVEY_URL = "https://flashpointopinions.com/0d8a1fd2-8805-4376-998f-63c4eda5b9a9";

export interface StartFlowProps {
  skillChoices: string[];
  interestChoices: string[];
  majorChoices: string[];
}

type Step = 0 | 1 | 2 | 3 | 4;
const LAST: Step = 4;

export default function StartFlow({ skillChoices, interestChoices, majorChoices }: StartFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [lookingFor, setLookingFor] = useState<Category[]>([]);
  const [major, setMajor] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);

  /*
    Functional update, not a read of the current array: two chips tapped in the
    same tick both saw the old list and the first pick was dropped.
  */
  function toggle<T>(value: T, set: Dispatch<SetStateAction<T[]>>, cap: number = MAX_ITEMS) {
    set((list) => {
      if (list.includes(value)) return list.filter((v) => v !== value);
      if (list.length >= cap) return list;
      return [...list, value];
    });
  }

  function finish() {
    const next: Preferences = {
      // Keep CATEGORIES order so the saved value matches what the score reads.
      looking_for: CATEGORIES.filter((c) => lookingFor.includes(c)),
      skills: cleanList(skills),
      interests: cleanList(interests),
      major: major.trim() || null,
    };
    if (!savePreferencesInBrowser(next)) {
      setSaveFailed(true);
      return;
    }
    setStep(LAST);
    router.refresh();
  }

  const steps = [
    {
      // Q1 from the published survey, word for word.
      eyebrow: "Question 1 of 4",
      title: "What are you looking for?",
      hint: "Pick any. Each one adds a point to everything in it.",
      body: (
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Choice
              key={c}
              label={CATEGORY_LABELS[c]}
              on={lookingFor.includes(c)}
              onClick={() => toggle(c, setLookingFor, CATEGORIES.length)}
            />
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Question 2 of 4",
      title: "What is your major?",
      hint: "Worth a point and a half when a listing names it.",
      body: (
        <>
          <input
            id="start-major"
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Computer Science"
            className="w-full rounded-xl border border-ct-line bg-ct-card px-4 py-3 text-sm text-ct-ink placeholder:text-ct-muted"
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {majorChoices.slice(0, 8).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMajor(m)}
                className="rounded-full border border-dashed border-ct-navy/25 px-2.5 py-0.5 text-xs font-medium text-ct-muted hover:bg-ct-blue-deep hover:text-ct-ink"
              >
                {m}
              </button>
            ))}
          </div>
        </>
      ),
    },
    {
      eyebrow: "Question 3 of 4",
      title: "Which of these can you do?",
      hint: `The biggest part of the score. Up to ${MAX_ITEMS}.`,
      body: (
        <div className="flex flex-wrap gap-2">
          {skillChoices.map((s) => (
            <Choice key={s} label={s} on={skills.includes(s)} onClick={() => toggle(s, setSkills)} />
          ))}
        </div>
      ),
    },
    {
      eyebrow: "Question 4 of 4",
      title: "What are you into?",
      hint: "Matched against the topics on each listing.",
      body: (
        <div className="flex flex-wrap gap-2">
          {interestChoices.map((s) => (
            <Choice key={s} label={s} on={interests.includes(s)} onClick={() => toggle(s, setInterests)} />
          ))}
        </div>
      ),
    },
  ];

  if (step === LAST) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ct-muted">Done</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-ct-navy">
            Your deck is ready
          </h1>
          <p className="mt-2 text-sm text-ct-ink">
            Every card is now scored against what you just told us, and the reasons are printed on each one.
          </p>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/")}
          className="rounded-xl bg-ct-navy px-4 py-3.5 text-sm font-semibold text-ct-on-navy"
        >
          Start swiping
        </motion.button>

        <div className="glass-surface rounded-[20px] p-4">
          <h2 className="text-sm font-semibold text-ct-navy">Where these questions came from</h2>
          <p className="mt-1.5 text-sm text-ct-ink">
            We ran a study on how Columbia students actually find opportunities, and built this flow from
            what it told us. Six more questions, about two minutes.
          </p>
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-xl border border-ct-line px-3.5 py-2.5 text-sm font-semibold text-ct-navy"
          >
            Answer the study
          </a>
        </div>
      </div>
    );
  }

  const current = steps[step];
  const canAdvance =
    (step === 0 && lookingFor.length > 0) ||
    (step === 1 && major.trim().length > 0) ||
    (step === 2 && skills.length > 0) ||
    (step === 3 && interests.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-ct-navy" : "bg-ct-line"}`}
          />
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ct-muted">{current.eyebrow}</p>
        <h1 className="mt-1 text-[27px] font-semibold leading-tight tracking-tight text-ct-navy">
          {current.title}
        </h1>
        <p className="mt-1.5 text-sm text-ct-muted">{current.hint}</p>
      </div>

      <div className="glass-surface rounded-[20px] p-4">{current.body}</div>

      {saveFailed ? (
        <p role="status" className="text-xs text-ct-pass">
          Your browser would not keep this. Check that cookies are on.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as Step)}
            className="rounded-xl border border-ct-line px-3.5 py-3 text-sm font-medium text-ct-ink"
          >
            Back
          </button>
        ) : null}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={!canAdvance}
          onClick={() => (step === 3 ? finish() : setStep((step + 1) as Step))}
          className="flex-1 rounded-xl bg-ct-navy px-4 py-3.5 text-sm font-semibold text-ct-on-navy transition-opacity disabled:opacity-40"
        >
          {step === 3 ? "See my deck" : "Next"}
        </motion.button>
      </div>
    </div>
  );
}

function Choice({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        on ? "border-ct-navy bg-ct-navy text-ct-on-navy" : "border-ct-line bg-ct-card text-ct-ink hover:bg-ct-blue-deep"
      }`}
    >
      {label}
    </motion.button>
  );
}

// Reading skills, interests, and a major out of resume text. OWNER: Jun.
// Runs in the browser only. The resume is never sent anywhere or saved:
// we look for words the app already knows (from the listings and people),
// and hand back what we found so the person can check it before saving.

export interface Vocabulary {
  skills: string[];
  interests: string[];
  majors: string[];
}

export interface ResumeFindings {
  skills: string[];
  interests: string[];
  major: string | null;
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `term` appears in `text` as a whole word or phrase.
 * Short terms like "AI" or "R" must match their exact capitals, so "r" in "for" or "ai" in "said" never count.
 * Edges are checked by hand rather than with \b, so terms like "C++" and "C#" still work.
 */
function mentions(text: string, lowerText: string, term: string): boolean {
  const trimmed = term.trim();
  if (!trimmed) return false;
  const whole = (needle: string) => new RegExp(`(?<![A-Za-z0-9])${escape(needle)}(?![A-Za-z0-9])`);
  const short = trimmed.replace(/[^A-Za-z0-9]/g, "").length <= 2;
  // Short terms match as written or in capitals ("ai" in the data, "AI" on a resume), never in other casing.
  if (short) return whole(trimmed).test(text) || whole(trimmed.toUpperCase()).test(text);
  return whole(trimmed.toLowerCase()).test(lowerText);
}

function findAll(text: string, lowerText: string, terms: string[]): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  for (const term of terms) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (mentions(text, lowerText, term)) found.push(term);
  }
  return found;
}

/** What a resume says about you, limited to things the match score can use. */
export function readResume(text: string, vocabulary: Vocabulary): ResumeFindings {
  const lowerText = text.toLowerCase();
  const skills = findAll(text, lowerText, vocabulary.skills);
  const skillKeys = new Set(skills.map((s) => s.toLowerCase()));
  // A word that is already a skill (like "machine learning") is not counted twice as an interest.
  const interests = findAll(text, lowerText, vocabulary.interests).filter((i) => !skillKeys.has(i.toLowerCase()));
  // Longest first, so "Computer Engineering" wins over "Engineering".
  const majors = [...vocabulary.majors].sort((a, b) => b.length - a.length);
  const major = majors.find((m) => mentions(text, lowerText, m)) ?? null;
  return { skills, interests, major };
}

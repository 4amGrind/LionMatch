// Pulling preferences out of resume text. OWNER: Jun.
//
// The trick here is that we are not trying to understand a resume. The match
// score only knows the 40 skills and 59 topics that appear on the listings, so
// anything else we found would score nothing. We scan the text for the words
// the score can actually use, and ignore the rest.
//
// That keeps this honest in both directions: it never invents a skill, and it
// never claims to have read anything it did not match. The screen shows every
// hit before it goes anywhere near your preferences.
//
// Pure functions only, so this can be tested without a browser or a PDF.

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

/**
 * Other ways people write the same thing. The key has to be a term that is
 * already in the vocabulary, or the group is skipped.
 *
 * Deliberately short. A wrong guess here puts a skill on someone's profile
 * that they never claimed, which is worse than missing one.
 */
const ALIASES: Record<string, string[]> = {
  "Machine Learning": ["ML", "deep learning", "neural networks", "TensorFlow", "Keras", "scikit-learn", "sklearn"],
  "Web Development": ["React", "Next.js", "Node.js", "Django", "Flask", "HTML", "CSS", "front-end", "frontend", "full-stack", "fullstack"],
  SQL: ["Postgres", "PostgreSQL", "MySQL", "SQLite", "BigQuery"],
  Linux: ["Bash", "Unix", "Ubuntu", "shell scripting"],
  Electronics: ["Arduino", "Raspberry Pi", "soldering", "PCB"],
  CAD: ["SolidWorks", "AutoCAD", "Fusion 360", "Onshape"],
  "Lab Work": ["lab technician", "research assistant", "wet lab", "laboratory"],
  Statistics: ["statistical", "regression analysis"],
  "Public Speaking": ["presented at", "conference talk"],
  "Project Management": ["Scrum", "Agile", "Jira"],
  "Financial Modeling": ["DCF", "valuation model"],
  // Topic tags are lowercase, to match src/data/opportunities.json.
  ai: ["artificial intelligence"],
  nlp: ["natural language processing"],
  "computer science": ["CS major", "B.S. in Computer Science"],
  software: ["software engineering", "SWE", "software engineer"],
  quant: ["quantitative"],
  hackathons: ["hackathon", "HackNY", "DevPost"],
  robotics: ["robotic", "autonomous vehicle"],
  "data science": ["data scientist", "data analysis"],
};

/** Characters that count as part of a word. "+" and "#" are in so "C++" stays whole. */
const WORD = /[a-z0-9+#]/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "hackathons" also matches "hackathon", and "proof" also matches "proofs". */
function surfaceForms(term: string): string[] {
  const forms = [term];
  if (/^[a-z ]+$/i.test(term)) {
    if (term.length > 3 && term.endsWith("s")) forms.push(term.slice(0, -1));
    else forms.push(`${term}s`);
  }
  return forms;
}

/**
 * Find which of `terms` appear in `text`, in the order they first show up.
 *
 * Longer terms win: "JavaScript" is matched and struck out before "Java" gets
 * a look, so a resume that says JavaScript does not also claim Java.
 */
function findTerms(text: string, terms: string[]): string[] {
  const haystack = text.toLowerCase();
  const known = new Set(terms.map((t) => t.toLowerCase()));
  const taken = new Array<boolean>(haystack.length).fill(false);

  // Every way of writing every term, longest first.
  const surfaces: { surface: string; canonical: string }[] = [];
  for (const term of terms) {
    for (const form of surfaceForms(term)) surfaces.push({ surface: form, canonical: term });
    for (const alias of ALIASES[term] ?? []) {
      if (known.has(alias.toLowerCase())) continue; // The alias is its own term elsewhere.
      for (const form of surfaceForms(alias)) surfaces.push({ surface: form, canonical: term });
    }
  }
  surfaces.sort((a, b) => b.surface.length - a.surface.length);

  const hits = new Map<string, number>();
  for (const { surface, canonical } of surfaces) {
    const needle = surface.toLowerCase();
    const pattern = new RegExp(escapeRegExp(needle), "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(haystack)) !== null) {
      const start = match.index;
      const end = start + needle.length;
      // Always move past this match, so "C, C++" can match both.
      pattern.lastIndex = end;

      const before = start > 0 ? haystack[start - 1] : "";
      const after = end < haystack.length ? haystack[end] : "";
      if (WORD.test(before) || WORD.test(after)) continue; // Inside a longer word.
      if (taken[start] || taken[end - 1]) continue; // A longer term already claimed this.

      for (let i = start; i < end; i += 1) taken[i] = true;
      const seen = hits.get(canonical);
      if (seen === undefined || start < seen) hits.set(canonical, start);
    }
  }

  return [...hits.entries()].sort((a, b) => a[1] - b[1]).map(([canonical]) => canonical);
}

/** Majors are often written out rather than listed, so we also read the usual phrasings. */
function findMajor(text: string, majors: string[]): string | null {
  const known = findTerms(text, majors);
  if (known.length > 0) return known[0];

  const patterns = [
    // The keyword is matched either way round, but the answer still has to start
    // with a capital, so "majoring in something" does not come back as a major.
    /\b[Mm]ajor(?:ing)?(?:\s+in)?\s*[:\-–]?\s*([A-Z][A-Za-z]*(?:\s+[A-Za-z]+){0,3})/,
    /\b(?:B\.?A\.?|B\.?S\.?|Bachelor(?:'s)?(?:\s+of\s+\w+)?)\s*(?:degree\s*)?in\s+([A-Z][A-Za-z]*(?:\s+[A-Za-z]+){0,3})/,
  ];
  for (const pattern of patterns) {
    const found = text.match(pattern)?.[1]?.trim();
    // Stop at the filler words that usually follow the real answer.
    const cleaned = found?.split(/\s+(?:and|with|at|from|expected|minor)\b/i)[0].trim();
    if (cleaned && cleaned.length > 2) return cleaned;
  }
  return null;
}

/**
 * Flatten the spacing before matching anything.
 *
 * This is not tidying for its own sake. pdf.js hands back one run per word and
 * we join them with a space, so "Machine Learning" arrives as "Machine   Learning"
 * and every multi-word skill silently fails to match. Line breaks go the same
 * way, since a resume wraps mid-phrase all the time.
 */
function flatten(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Everything the text says that the match score can use. */
export function readResume(text: string, vocabulary: Vocabulary): ResumeFindings {
  const flat = flatten(text);
  return {
    skills: findTerms(flat, vocabulary.skills),
    interests: findTerms(flat, vocabulary.interests),
    major: findMajor(flat, vocabulary.majors),
  };
}

export function hasFindings(findings: ResumeFindings): boolean {
  return findings.skills.length > 0 || findings.interests.length > 0 || findings.major !== null;
}

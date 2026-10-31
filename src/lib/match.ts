// Finds the knowledge base answers closest to a farmer's question, on the
// phone, with no AI. Used whenever the AI is not set up or not reachable.
//
// Khmer is written without spaces between words, so word matching doesn't
// work for it: Khmer text is cut into overlapping 3-character pieces instead,
// while English is matched by whole words. A question's score against an
// entry is the share of its pieces found in that entry, where rare pieces
// ("មូសតែ", "thiourea") count for much more than common ones ("ពេលណា",
// "how") — the idea behind search-engine ranking.

import { ENTRIES, type KbEntry } from "./kb";

// The book corpus is small, so a few filler words are rare in it by accident.
const ENGLISH_FILLER = new Set(
  "how much many what when where which why who does do did can could should would will is are was the a an to of in on for per my our your it its this that and or with from at by be i me".split(" "),
);

// Khmer has no spaces, so filler is cut out as whole phrases. Only phrases that
// never occur inside a farming word are listed ("ទេ" would break "បច្ចេកទេស").
const KHMER_FILLER = /ធ្វើយ៉ាងម៉េច|ធ្វើយ៉ាងណា|ធ្វើម៉េច|របស់ខ្ញុំ|ខ្ញុំ|ណាស់|ច្រើន|ហ្នឹង|មែនទេ|បានទេ|តើ|សូម/g;

// Words farmers use for the same thing as the book, mapped to one form on both sides.
const KHMER_SAME = [
  [/ធ្លាក់/g, "ជ្រុះ"], // drop / fall (flowers, fruit)
] as const;

function trigrams(text: string): Set<string> {
  const pieces = new Set<string>();
  let normalized = text
    .toLowerCase()
    .replace(/[​‌‍]/g, "")
    .replace(KHMER_FILLER, " ")
    .replace(/([a-z])-(\d)/g, "$1$2") // M-10 -> m10
    .replace(/(\d),(\d)/g, "$1$2"); // 1,000 -> 1000
  for (const [from, to] of KHMER_SAME) normalized = normalized.replace(from, to);
  for (const [run] of normalized.matchAll(/[ក-៿]+|[a-z0-9]+/g)) {
    if (/^[a-z0-9]/.test(run)) {
      if (run.length >= 2 && !ENGLISH_FILLER.has(run)) pieces.add(`w:${run}`);
      continue;
    }
    const chars = [...run];
    if (chars.length < 3) pieces.add(run);
    for (let i = 0; i + 3 <= chars.length; i++) pieces.add(chars.slice(i, i + 3).join(""));
  }
  return pieces;
}

const DOCS = ENTRIES.map((e) => ({
  entry: e,
  question: trigrams([e.q_km, e.q_en, ...e.variants_km].join(" ")),
  answer: trigrams([e.a_km, e.a_en].join(" ")),
  phrasings: [e.q_km, e.q_en, ...e.variants_km].map(trigrams),
}));

// How rare each piece is across all entries (inverse document frequency).
const IDF = (() => {
  const counts = new Map<string, number>();
  for (const d of DOCS) for (const g of new Set([...d.question, ...d.answer])) counts.set(g, (counts.get(g) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [g, n] of counts) idf.set(g, Math.log(DOCS.length / n));
  return idf;
})();

// Pieces the book never uses ("លឿង", yellow) still count against a match, as much
// as the rarest piece in the book does: otherwise "yellow leaves" is matched as "leaves".
const UNKNOWN_WEIGHT = Math.log(DOCS.length);

// A match on the question side means more than one buried in the answer.
const QUESTION_WEIGHT = 0.65;
// How much of one of the entry's own phrasings the question covers also counts, so
// "yellow leaves" is not a sure match for "old yellow leaves we want to drop".
const FIT_WEIGHT = 0.25;
// Below this, the "closest" answer is usually about something else.
const MIN_SCORE = 0.3;
// The best entry is shown as the answer only when it scores at least this and
// clearly beats the next one; otherwise the closest few are offered as "Did you mean…?".
const CONFIDENT_SCORE = 0.5;
const CONFIDENT_LEAD = 0.05;
// Answers with doses to spray or apply need a closer match before they're shown as the answer.
const CONFIDENT_DOSE_SCORE = 0.7;

export function rankBookAnswers(question: string): { entry: KbEntry; score: number }[] {
  const q = [...trigrams(question)].filter((g) => !/^w:/.test(g) || IDF.has(g)); // unknown English words are mostly typos
  const total = q.reduce((sum, g) => sum + (IDF.get(g) ?? UNKNOWN_WEIGHT), 0);
  if (total === 0) return [];

  const weigh = (pieces: Iterable<string>) => [...pieces].reduce((sum, g) => sum + (IDF.get(g) ?? 0), 0);
  const asked = new Set(q);

  return DOCS.map(({ entry, question: qs, answer, phrasings }) => {
    let inQuestion = 0;
    let inAnswer = 0;
    for (const g of q) {
      const w = IDF.get(g);
      if (w === undefined) continue;
      if (qs.has(g)) inQuestion += w;
      if (answer.has(g)) inAnswer += w;
    }
    const coverage = (QUESTION_WEIGHT * inQuestion + (1 - QUESTION_WEIGHT) * inAnswer) / total;
    const fit = Math.max(...phrasings.map((p) => weigh([...p].filter((g) => asked.has(g))) / (weigh(p) || 1)));
    return { entry, score: (1 - FIT_WEIGHT) * coverage + FIT_WEIGHT * fit };
  })
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

/** best is null when no entry is a confident match; related then holds the closest guesses. */
export function findBookAnswers(question: string): { best: KbEntry | null; related: KbEntry[] } {
  const ranked = rankBookAnswers(question);
  const [first, second] = ranked;
  const needed = first?.entry.needs_verification ? CONFIDENT_DOSE_SCORE : CONFIDENT_SCORE;
  if (first && first.score >= needed && (!second || first.score - second.score >= CONFIDENT_LEAD)) {
    return { best: ranked[0].entry, related: ranked.slice(1, 4).map((r) => r.entry) };
  }
  return { best: null, related: ranked.slice(0, 3).map((r) => r.entry) };
}

// The knowledge base as the app sees it: the same kb-v2.json the AI reads,
// filtered to entries checked against the book.

import kbJson from "../../knowledge-base/kb-v2.json";

export type KbEntry = {
  id: number;
  q_km: string;
  q_en: string;
  a_km: string;
  a_en: string;
  variants_km: string[];
  source: string;
  status: string;
  needs_verification: boolean;
  topic?: string;
  section?: string;
};

export const ENTRIES = (kbJson.entries as KbEntry[]).filter((e) => e.status === "ok");
export const ENTRY_BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
export const toKhmerDigits = (s: string | number) => String(s).replace(/\d/g, (d) => KHMER_DIGITS[Number(d)]);

/** English count with the right plural: "1 spray", "3 sprays". */
export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "p.58-59" -> "ទំព័រ ៥៨-៥៩"; null for v1 entries without a page. */
export function pageLabel(id: number): { km: string; en: string } | null {
  const source = ENTRY_BY_ID.get(id)?.source;
  if (!source || !source.startsWith("p.")) return null;
  const pages = source.slice(2);
  return { km: `ទំព័រ ${toKhmerDigits(pages)}`, en: `p.${pages}` };
}

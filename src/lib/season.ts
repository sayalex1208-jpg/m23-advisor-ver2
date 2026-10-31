// The M23 year, month by month, from the book's own timings. Each month
// names the knowledge base entries a farmer most likely needs then.
// Month numbers follow the book: 1 = January ... 12 = December.

import { ENTRY_BY_ID, type KbEntry } from "./kb";

type Season = { km: string; en: string; entries: number[] };

const SEASONS: Record<number, Season> = {
  1: { km: "ផ្ការីក និងសន្សើមប្រៃ", en: "Bloom and acid dew", entries: [121, 122, 116, 141, 129] },
  2: { km: "ផ្ការីក ក្ដិប និងសត្វល្អិត", en: "Bloom, fruit set and pests", entries: [116, 117, 127, 141, 147] },
  3: { km: "ប្រមូលផល", en: "Harvest", entries: [147, 149, 148, 128, 118] },
  4: { km: "ប្រមូលផល និងហាល", en: "Harvest and drying", entries: [149, 148, 150, 147, 151] },
  5: { km: "ចុងប្រមូលផល ដើមរដូវភ្លៀង", en: "End of harvest, first rains", entries: [150, 146, 92, 133, 82] },
  6: { km: "រដូវដាំ និងដាក់ជី", en: "Planting and fertilizing", entries: [85, 86, 92, 93, 124] },
  7: { km: "ដាក់ជី និងថែកូនចន្ទី", en: "Fertilizing and young tree care", entries: [92, 87, 89, 133, 124] },
  8: { km: "ចាប់ផ្ដើមបញ្ចុះផ្កា", en: "Start flower induction", entries: [102, 103, 104, 105, 98] },
  9: { km: "បញ្ចុះត្រួយទី១", en: "Pushing flush 1", entries: [107, 94, 106, 124, 125] },
  10: { km: "ត្រួយផ្កា និងភ្ជួរដី", en: "Flower flush and ploughing", entries: [109, 108, 113, 124, 101] },
  11: { km: "ចេញកញ្ចុំផ្កា", en: "Panicles emerging", entries: [110, 99, 127, 111, 112] },
  12: { km: "ផ្ការីក", en: "Bloom", entries: [111, 141, 121, 126, 112] },
};

export const KHMER_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
];

export function currentMonth(date = new Date()) {
  return date.getMonth() + 1;
}

export function seasonFor(month: number): Season & { questions: KbEntry[] } {
  const s = SEASONS[month];
  return { ...s, questions: s.entries.map((id) => ENTRY_BY_ID.get(id)).filter((e): e is KbEntry => !!e) };
}

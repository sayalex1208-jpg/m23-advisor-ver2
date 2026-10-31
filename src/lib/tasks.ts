// The farm calendar: what to do each month, and which pests to watch, taken
// from the book's own timings. Each item links to the knowledge base entry
// that explains it. Ages are tree age in whole years (0 = planted this year).

import { toKhmerDigits as kh } from "./kb";

export type Task = {
  id: string;
  months: number[];
  minAge?: number;
  maxAge?: number;
  km: string;
  en: string;
  entry: number;
};

export const TASKS: Task[] = [
  // Rainy season: planting, fertilizer, pruning
  { id: "plant", months: [5, 6, 7], maxAge: 0, entry: 86, km: "ដាំកូនចន្ទីផ្សាំ ក្នុងរដូវភ្លៀង កុំឲ្យបែកដីក្នុងថង់", en: "Plant grafted seedlings in the rains without breaking the root ball" },
  { id: "fert-young", months: [6, 7, 8, 9], maxAge: 0, entry: 87, km: "កូនចន្ទីឆ្នាំទី១៖ ដាក់ជី ៣ ដង ដងចុងក្រោយមុនចុងខែ៩", en: "First-year trees: fertilize 3 times, the last before end of month 9" },
  { id: "rootstock-shoots", months: [6, 7, 8], maxAge: 0, entry: 89, km: "កាត់មែកដុះពីជើងទម្រ (ក្រោមមុខផ្សាំ) ចោល", en: "Remove shoots growing from the rootstock, below the graft" },
  { id: "fert-1", months: [5, 6], minAge: 1, entry: 92, km: "ដាក់ជីដីលើកទី១ ពេលភ្លៀងដើមរដូវ", en: "Soil fertilizer, 1st application, with the first rains" },
  { id: "prune", months: [5, 6], minAge: 2, entry: 146, km: "កាត់មែកក្រោយប្រមូលផល ហើយលាបស្នាមកាត់ភ្លាម", en: "Prune after harvest and paint the cuts right away" },
  { id: "stem-borer", months: [5, 6, 7, 8], minAge: 1, entry: 133, km: "ការពារដង្កូវដួង៖ កុំឲ្យគល់មានរបួស បាញ់ថ្នាំលើដើម ២ ដង", en: "Protect against stem borer: avoid trunk wounds, spray trunks twice" },
  { id: "fert-2", months: [7, 8], minAge: 1, maxAge: 4, entry: 92, km: "ដាក់ជីដីលើកទី២ (ខែ៧-៨)", en: "Soil fertilizer, 2nd application (month 7-8)" },
  { id: "late-fert-pk", months: [7, 8], minAge: 5, entry: 98, km: "ជីដីលើកចុងក្រោយ ប្រើ P និង K ខ្ពស់ (N1:P3:K3) កុំប្រើ N ខ្ពស់", en: "Last soil fertilizer: high P and K (N1:P3:K3), not high N" },
  { id: "fert-3-young", months: [8, 9], minAge: 1, maxAge: 3, entry: 92, km: "ដើមអាយុ ៣ ឆ្នាំចុះ៖ ដាក់ជីដីលើកទី៣ មុនចុងខែ៩", en: "Trees up to 3 years: 3rd soil fertilizer before end of month 9" },

  // Flower induction (trees 5+)
  { id: "no-induce-young", months: [8], minAge: 1, maxAge: 4, entry: 100, km: "ដើមក្រោម ៥ ឆ្នាំ មិនទាន់គួរបញ្ចុះផ្កាទេ", en: "Trees under 5 years should not be induced to flower yet" },
  { id: "induce-start", months: [8], minAge: 5, entry: 102, km: "ចាប់ផ្ដើមបាញ់បញ្ចុះត្រួយទី១ ដើម ឬពាក់កណ្ដាលខែ៨", en: "Start the flush 1 spray in early or mid month 8" },
  { id: "flush1-care", months: [9], minAge: 5, entry: 107, km: "ថែត្រួយទី១៖ ការពារមូសតែ និងចិញ្ចឹមត្រួយ", en: "Care for flush 1: protect from tea mosquito bug and feed it" },
  { id: "no-fert-after-9", months: [9], minAge: 1, entry: 94, km: "កុំដាក់ជីដីក្រោយចុងខែ៩ (ដីស្ងួត ឫសស្រូបមិនបាន)", en: "No soil fertilizer after month 9: dry soil can't dissolve it" },
  { id: "plough", months: [9, 10], minAge: 1, entry: 108, km: "ភ្ជួរដី ឬកាត់ស្មៅ មុន ឬក្រោយភ្ជុំបិណ្ឌ", en: "Plough or cut weeds around Pchum Ben" },
  { id: "flower-flush", months: [10], minAge: 5, entry: 109, km: "ត្រួយទី១ ចាស់ហើយ៖ បាញ់ជីស្លឹក P K ខ្ពស់ ឲ្យចេញត្រួយផ្កា", en: "Flush 1 mature: spray high-P/K foliar feed for the flower flush" },
  { id: "old-tree-method", months: [10], minAge: 7, entry: 113, km: "ដើម ៧-៨ ឆ្នាំឡើង៖ អាចប្រើវិធីសន្សំថ្លៃ ចេញត្រួយតែម្ដង", en: "Trees 7-8+ years: the cheaper single-flush method is an option" },
  { id: "top-young", months: [10, 11], maxAge: 0, entry: 89, km: "កូនខ្ពស់ ៨-៩ តឹក៖ កាត់ចុងឲ្យបែកមែក ២-៤", en: "Seedlings 8-9 tuek tall: top them to get 2-4 branches" },

  // Bloom
  { id: "before-bloom", months: [11], minAge: 2, entry: 110, km: "កញ្ចុំផ្កាចេញ៖ កម្ចាត់សត្វល្អិត និងបាញ់ថ្នាំផ្សិតមុនផ្ការីក", en: "Panicles out: clear pests and spray fungicide before flowers open" },
  { id: "bloom-spray-time", months: [12, 1, 2], minAge: 2, entry: 141, km: "ពេលផ្ការីក៖ បាញ់តែពីម៉ោង ១ រសៀល ដល់យប់ ហើយកុំបាញ់ញឹក", en: "During bloom: spray only from 1 pm into the night, and not often" },
  { id: "acid-dew", months: [12, 1, 2], minAge: 2, entry: 121, km: "ពិនិត្យសន្សើមប្រៃរាល់ព្រឹក (សំណើមខ្យល់លើស ៨២%)", en: "Check for acid dew every morning (humidity above 82%)" },
  { id: "first-year-dry", months: [12, 1, 2, 3, 4], maxAge: 0, entry: 90, km: "កូនចន្ទីឆ្នាំទី១៖ ក្រោយខែ១២ កុំដកស្មៅ កុំដាក់ជី រហូតដល់រដូវភ្លៀង", en: "First-year trees: from month 12 until the rains, no weeding or fertilizer" },
  { id: "black-fruit", months: [1, 2], minAge: 2, entry: 116, km: "ក្ដិបខ្មៅជ្រុះ? រកមូលហេតុពិតមុនទិញថ្នាំ", en: "Young fruit blackening? Find the real cause before buying products" },

  // Harvest
  { id: "harvest", months: [2, 3, 4, 5], minAge: 2, entry: 147, km: "រើសតែគ្រាប់ទុំជ្រុះ កុំបេះគ្រាប់ខ្ចី", en: "Collect only ripe fallen nuts; never pick unripe ones" },
  { id: "drying", months: [3, 4, 5], minAge: 2, entry: 149, km: "ហាលលើការ៉ូ ២-៣ ថ្ងៃ ឲ្យសំណើមក្រោម ១១%", en: "Dry on cement 2-3 days, to under 11% moisture" },
  { id: "sell", months: [3, 4], minAge: 2, entry: 148, km: "លក់ស្រស់ ឬហាលស្ងួតសិន? គិតមុនលក់", en: "Sell fresh or dry first? Decide before selling" },
  { id: "storage", months: [4, 5], minAge: 2, entry: 150, km: "ទុកគ្រាប់ស្ងួតលើប៉ាឡែត ក្នុងឃ្លាំងខ្យល់ចេញចូល", en: "Store dried nuts on pallets in a ventilated store" },
  { id: "thinning", months: [4, 5], minAge: 4, maxAge: 6, entry: 144, km: "គុម្ពប៉ះគ្នា? ពិចារណាកាប់ស្រឡះក្រោយប្រមូលផល", en: "Canopies touching? Consider thinning after harvest" },
];

export type Pest = { id: string; months: number[]; km: string; en: string; entry: number };

// From the book's pest calendar (#134, p.66-72).
export const PESTS: Pest[] = [
  { id: "tmb", months: [6, 7, 8, 9, 10, 11, 12, 1, 2], entry: 124, km: "មូសតែ", en: "Tea mosquito bug" },
  { id: "thrips", months: [11, 12, 1, 2, 3, 4, 5], entry: 127, km: "ទ្រីប (ក្រាភ្លើង)", en: "Thrips" },
  { id: "mealybugs", months: [1, 2, 3, 4, 5], entry: 129, km: "ចៃស", en: "Mealybugs" },
  { id: "beetles", months: [6, 7, 8, 9, 10, 11, 12, 1, 2, 3], entry: 131, km: "គោម៉ និងខ្ទុង", en: "Beetles and weevils" },
  { id: "stem-borer", months: [5, 6, 7, 8], entry: 133, km: "ដង្កូវដួង (ពង)", en: "Stem borer (egg-laying)" },
  { id: "caterpillars", months: [8, 9, 10, 11, 12, 1, 2], entry: 126, km: "ដង្កូវស៊ីផ្កា និងចោះផ្លែ", en: "Flower and fruit caterpillars" },
  { id: "acid-dew", months: [12, 1, 2], entry: 120, km: "សន្សើមប្រៃ (ផ្សិត)", en: "Acid dew (fungus)" },
];

/** Tasks for a month, filtered to the tree age when it is known. */
export function tasksFor(month: number, age: number | null): Task[] {
  return TASKS.filter(
    (t) =>
      t.months.includes(month) &&
      (age === null || ((t.minAge ?? 0) <= age && age <= (t.maxAge ?? Infinity))),
  );
}

export const pestsFor = (month: number) => PESTS.filter((p) => p.months.includes(month));

/** "trees 5+ years" style label, shown when the farm isn't set up. */
export function ageLabel(t: Task): { km: string; en: string } | null {
  if (t.maxAge === 0) return { km: "កូនចន្ទីឆ្នាំទី១", en: "first-year trees" };
  if (t.minAge !== undefined && t.maxAge !== undefined) return { km: `ដើម ${kh(t.minAge)}-${kh(t.maxAge)} ឆ្នាំ`, en: `trees ${t.minAge}-${t.maxAge} years` };
  if (t.minAge && t.minAge >= 2) return { km: `ដើម ${kh(t.minAge)} ឆ្នាំឡើង`, en: `trees ${t.minAge}+ years` };
  return null;
}

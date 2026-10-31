// The spray journal: what was sprayed when, and when the next spray is due.
// Kept on the phone only, like the farm profile.

import { useEffect, useState } from "react";
import { KHMER_MONTHS } from "./season";
import { toKhmerDigits as kh } from "./kb";

export type Purpose = "insect" | "fungus" | "foliar" | "induction" | "weed" | "other";
export type Formulation = "" | "EC" | "SC" | "SL" | "WP" | "other";
export type SprayProduct = { name: string; dose: string; formulation: Formulation };

export type SprayLog = {
  id: string;
  date: string; // YYYY-MM-DD, local
  purpose: Purpose;
  target: string; // pest id from PEST_TARGETS, or free text
  products: SprayProduct[];
  area: string;
  notes: string;
  nextDate: string | null;
  nextDone: boolean; // the follow-up was sprayed or dismissed
  cost?: number | null; // riel for the products in this spray; older records have none
};

export const PURPOSES: Record<Purpose, { km: string; en: string }> = {
  insect: { km: "សត្វល្អិត", en: "Insects" },
  fungus: { km: "ផ្សិត", en: "Fungus" },
  foliar: { km: "ជីស្លឹក", en: "Foliar feed" },
  induction: { km: "បញ្ចុះផ្កា", en: "Flower induction" },
  weed: { km: "ស្មៅ", en: "Weeds" },
  other: { km: "ផ្សេងៗ", en: "Other" },
};

// Pests a farmer sprays for, with the book's outbreak spray rhythm.
export const PEST_TARGETS: { id: string; km: string; en: string; days: number[]; entry: number; ruleKm: string; ruleEn: string }[] = [
  { id: "tmb", km: "មូសតែ", en: "Tea mosquito bug", days: [3, 5, 7], entry: 125, ruleKm: "ពេលផ្ទុះ បាញ់ ៣ ដង៖ លើកទី២ ៣ ឬ ៥ ថ្ងៃក្រោយ លើកទី៣ ៧ ថ្ងៃក្រោយលើកទី២", ruleEn: "Outbreak: 3 sprays — 2nd after 3 or 5 days, 3rd 7 days after the 2nd" },
  { id: "caterpillars", km: "ដង្កូវ", en: "Caterpillars", days: [3, 5, 7], entry: 126, ruleKm: "ពេលផ្ទុះ បាញ់ ៣ ដង៖ លើកទី២ ៣-៥ ថ្ងៃក្រោយ លើកទី៣ ៥-៧ ថ្ងៃក្រោយ", ruleEn: "Outbreak: 3 sprays — 2nd after 3-5 days, 3rd 5-7 days later" },
  { id: "thrips", km: "ទ្រីប", en: "Thrips", days: [5, 7], entry: 128, ruleKm: "ពេលផ្ទុះ បាញ់ ៣ ដង ៥-៧ ថ្ងៃម្ដង", ruleEn: "Outbreak: 3 sprays, 5-7 days apart" },
  { id: "mealybugs", km: "ចៃស", en: "Mealybugs", days: [3, 5], entry: 130, ruleKm: "បាញ់យ៉ាងតិច ៣ ដង ៣-៥ ថ្ងៃម្ដង", ruleEn: "At least 3 sprays, 3-5 days apart" },
  { id: "beetles", km: "គោម៉ និងខ្ទុង", en: "Beetles and weevils", days: [5, 7], entry: 131, ruleKm: "ខ្ទុងស៊ីយប់ បាញ់ពេលយប់ គោម៉ស៊ីថ្ងៃ បាញ់ពេលថ្ងៃ", ruleEn: "Weevils feed at night, spray at night; chafers by day" },
  { id: "stem-borer", km: "ដង្កូវដួង", en: "Stem borer", days: [10, 15], entry: 133, ruleKm: "បាញ់លើដើមទាំងអស់ ២ ដង ១០-១៥ ថ្ងៃម្ដង", ruleEn: "Spray all trunks twice, 10-15 days apart" },
];

type Suggestion = { days: number[]; km: string; en: string; entry: number };

/** The book's interval to the next spray, for this purpose, pest and month. */
export function suggestNext(purpose: Purpose, target: string, month: number): Suggestion | null {
  const inBloom = [12, 1, 2].includes(month);
  if (purpose === "insect") {
    const pest = PEST_TARGETS.find((p) => p.id === target);
    if (pest) return { days: pest.days, km: pest.ruleKm, en: pest.ruleEn, entry: pest.entry };
  }
  if (inBloom && (purpose === "insect" || purpose === "fungus" || purpose === "foliar")) {
    return { days: [15, 20], entry: 111, km: "ពេលផ្ការីក បាញ់ ១០-១៥ ឬ ១៥-២០ ថ្ងៃម្ដង កុំញឹកពេក", en: "During bloom: every 10-15 or 15-20 days, not more often" };
  }
  if (purpose === "fungus") {
    return { days: [7, 10, 15], entry: 110, km: "មុនផ្ការីក បាញ់ ៧-១០ ឬ ១០-១៥ ថ្ងៃម្ដង", en: "Before bloom: every 7-10 or 10-15 days" };
  }
  if (purpose === "induction" || purpose === "foliar") {
    return { days: [5, 7], entry: 104, km: "ការបាញ់បញ្ចុះផ្កា ជាធម្មតាបាញ់ម្ដងទៀត ៥-៧ ថ្ងៃក្រោយ", en: "Induction sprays are usually repeated 5-7 days later" };
  }
  return null;
}

// Active ingredients and inputs named in the book, for quick entry.
export const COMMON_PRODUCTS = [
  "Cypermethrin", "Chlorpyrifos", "Abamectin", "Emamectin", "Imidacloprid", "Thiamethoxam", "Fipronil",
  "Chlorfenapyr", "Lufenuron", "Buprofezin", "Copper Hydroxide", "Mancozeb", "Hexaconazole", "Azoxystrobin",
  "Metalaxyl", "Carbendazim", "Propineb", "Zineb", "Thiourea", "KNO3 13-0-46", "Atonik", "NPK 6-30-30",
  "NPK 8-52-34", "NPK 21-21-21", "NPK 30-10-10", "Calcium-Boron", "ថ្នាំជ្រាប/ស្អិត (spreader)", "សាប៊ូលាងចាន (dish soap)",
];

// ---------- dates (local calendar days, as YYYY-MM-DD) ----------

export const todayIso = () => new Date().toLocaleDateString("en-CA");

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00`) - Date.parse(`${fromIso}T12:00:00`)) / 86_400_000);
}

export function formatDate(iso: string): { km: string; en: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    km: `${kh(d.getDate())} ${KHMER_MONTHS[d.getMonth()]} ${kh(d.getFullYear())}`,
    en: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  };
}

/** "today" / "in 3 days" / "2 days late" for a due date. */
export function dueLabel(iso: string): { km: string; en: string; overdue: boolean; soon: boolean } {
  const n = daysBetween(todayIso(), iso);
  if (n === 0) return { km: "ថ្ងៃនេះ", en: "today", overdue: false, soon: true };
  if (n === 1) return { km: "ថ្ងៃស្អែក", en: "tomorrow", overdue: false, soon: true };
  if (n > 1) return { km: `ក្នុង ${kh(n)} ថ្ងៃ`, en: `in ${n} days`, overdue: false, soon: false };
  return { km: `ហួស ${kh(-n)} ថ្ងៃ`, en: n === -1 ? "1 day late" : `${-n} days late`, overdue: true, soon: true };
}

export const productSummary = (log: SprayLog) =>
  log.products.map((p) => p.name.trim()).filter(Boolean).join(" + ") || PURPOSES[log.purpose].en;

// ---------- book safety checks ----------

export type Check = { km: string; en: string; entry: number };

export function checkSpray(draft: Omit<SprayLog, "id">, history: SprayLog[], month: number, rainChanceToday: number | null): Check[] {
  const checks: Check[] = [];
  const named = draft.products.filter((p) => p.name.trim());

  if ([11, 12, 1, 2].includes(month) && named.some((p) => p.formulation === "EC")) {
    checks.push({
      entry: 119,
      km: "ថ្នាំទម្រង់ EC (ថ្នាំក្ដៅ) ធ្វើឲ្យផ្កា និងក្ដិបខូច។ ពេលមានផ្កា ប្ដូរទៅថ្នាំ SC ឬ SL។",
      en: "EC (\"hot\") products damage flowers and young fruit. When flowers are out, switch to SC or SL.",
    });
  }
  if (named.length > 3) {
    checks.push({
      entry: 139,
      km: "សៀវភៅណែនាំ កុំលាយថ្នាំគីមីលើស ៣ មុខក្នុងមួយធុង។",
      en: "The book advises against mixing more than 3 chemical products in one tank.",
    });
  }
  // Same active ingredient in this spray and the two before it.
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const norm = (s: string) => s.trim().toLowerCase();
  const repeated = named.find(
    (p) => recent.length === 2 && recent.every((log) => log.products.some((q) => norm(q.name) === norm(p.name))),
  );
  if (repeated && draft.purpose !== "foliar" && draft.purpose !== "induction") {
    checks.push({
      entry: 54,
      km: `${repeated.name.trim()} ប្រើ ៣ ដងជាប់គ្នាហើយ។ ប្ដូរសារធាតុសកម្ម កុំឲ្យសត្វល្អិតស៊ាំថ្នាំ។`,
      en: `${repeated.name.trim()} used 3 times in a row. Rotate active ingredients so pests don't become resistant.`,
    });
  }
  if (draft.date === todayIso() && rainChanceToday !== null && rainChanceToday >= 60) {
    checks.push({
      entry: 24,
      km: `ថ្ងៃនេះអាចមានភ្លៀង (${kh(rainChanceToday)}%)។ ភ្លៀងក្រោយបាញ់ភ្លាមៗ លាងថ្នាំចេញ។`,
      en: `Rain is likely today (${rainChanceToday}%). Rain right after spraying washes it off.`,
    });
  }
  return checks;
}

// ---------- storage ----------

const KEY = "m23.sprays";

export function useSprays() {
  const [logs, setLogs] = useState<SprayLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(logs));
    } catch {
      // Not saved; kept for this visit only.
    }
  }, [logs]);

  const save = (log: SprayLog) =>
    setLogs((all) => (all.some((l) => l.id === log.id) ? all.map((l) => (l.id === log.id ? log : l)) : [...all, log]));
  const remove = (id: string) => setLogs((all) => all.filter((l) => l.id !== id));
  const markNextDone = (id: string) => setLogs((all) => all.map((l) => (l.id === id ? { ...l, nextDone: true } : l)));

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = logs
    .filter((l) => l.nextDate && !l.nextDone)
    .sort((a, b) => a.nextDate!.localeCompare(b.nextDate!));
  const dueCount = upcoming.filter((l) => daysBetween(todayIso(), l.nextDate!) <= 1).length;

  return { logs: sorted, upcoming, dueCount, save, remove, markNextDone };
}

// ---------- phone calendar ----------

/** Google Calendar "add event" link for an all-day spray reminder. */
export function googleCalendarLink(log: SprayLog): string {
  const start = log.nextDate!.replaceAll("-", "");
  const end = addDays(log.nextDate!, 1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `បាញ់ថ្នាំចន្ទី · Spray cashew: ${productSummary(log)}`,
    dates: `${start}/${end}`,
    details: `ការបាញ់មុន ${log.date}${log.area ? ` · ${log.area}` : ""}\nPrevious spray ${log.date}. From M23 Cashew Advisor.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** An .ics calendar file with a reminder at 6 am on the day, for iPhone. */
export function icsFile(log: SprayLog): Blob {
  const start = log.nextDate!.replaceAll("-", "");
  const end = addDays(log.nextDate!, 1).replaceAll("-", "");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//M23 Cashew Advisor//Spray journal//KM",
    "BEGIN:VEVENT",
    `UID:${log.id}@m23-cashew-advisor`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(`បាញ់ថ្នាំចន្ទី · Spray cashew: ${productSummary(log)}`)}`,
    `DESCRIPTION:${esc(`Previous spray ${log.date}. From M23 Cashew Advisor.`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Spray cashew today",
    "TRIGGER:-PT12H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Blob([lines.join("\r\n")], { type: "text/calendar" });
}

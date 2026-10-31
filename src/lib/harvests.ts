// The harvest log: each sale of raw nuts, and what the season cost. Kept on
// the phone only, like the spray journal. The Farm passport sums it up for a
// bank or a buyer, and the farmer decides who gets it.

import { useEffect, useState } from "react";
import { toKhmerDigits as kh } from "./kb";
import type { SprayLog } from "./sprays";

export type NutState = "dry" | "fresh";

export type Sale = {
  id: string;
  date: string; // YYYY-MM-DD, local
  kg: number;
  pricePerKg: number; // riel
  buyer: string;
  state: NutState;
  nutCount: number | null; // nuts per kg, a common quality check
  notes: string;
};

export type CostKind = "fertilizer" | "pesticide" | "labour" | "other";
export type SeasonCosts = Record<CostKind, number>; // riel

export const NUT_STATES: Record<NutState, { km: string; en: string }> = {
  dry: { km: "គ្រាប់ស្ងួត", en: "Dry nuts" },
  fresh: { km: "គ្រាប់ស្រស់", en: "Fresh nuts" },
};

export const COST_KINDS: Record<CostKind, { km: string; en: string }> = {
  fertilizer: { km: "ជី", en: "Fertilizer" },
  pesticide: { km: "ថ្នាំ", en: "Pesticides" },
  labour: { km: "កម្លាំងពលកម្ម", en: "Labour" },
  other: { km: "ផ្សេងៗ", en: "Other" },
};

const NO_COSTS: SeasonCosts = { fertilizer: 0, pesticide: 0, labour: 0, other: 0 };

// Only for showing a rough dollar figure next to riel; farmers sell in riel.
export const RIEL_PER_USD = 4000;

export const riel = (n: number) => ({
  km: `${kh(Math.round(n).toLocaleString("en"))} ៛`,
  en: `${Math.round(n).toLocaleString("en")} riel`,
});
export const usd = (n: number) => `≈ $${Math.round(n / RIEL_PER_USD).toLocaleString("en")}`;

/** Harvest runs from about January to May, so a season is the calendar year of the sale. */
export const seasonOf = (sale: Sale) => Number(sale.date.slice(0, 4));

/** Sprays from June on are for next year's harvest (induction runs month 8-10), so they count there. */
export function sprayCostSeason(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 6 ? year + 1 : year;
}

// Foliar feed is fertilizer; everything else sprayed is a pesticide cost.
const sprayCostKind = (log: SprayLog): "fertilizer" | "pesticide" => (log.purpose === "foliar" ? "fertilizer" : "pesticide");

export type SprayCosts = { fertilizer: number; pesticide: number };

export type SeasonSummary = {
  season: number;
  sales: Sale[];
  kg: number;
  income: number;
  avgPrice: number;
  costs: SeasonCosts; // typed in by the farmer
  sprayCosts: SprayCosts; // from sprays logged with a cost
  totalCosts: number;
  profit: number;
  kgPerHa: number | null;
};

export function summarize(
  season: number,
  sales: Sale[],
  costs: SeasonCosts | undefined,
  hectares: number | null,
  sprayCosts: SprayCosts = { fertilizer: 0, pesticide: 0 },
): SeasonSummary {
  const kg = sales.reduce((s, x) => s + x.kg, 0);
  const income = sales.reduce((s, x) => s + x.kg * x.pricePerKg, 0);
  const c = { ...NO_COSTS, ...costs };
  const totalCosts = c.fertilizer + c.pesticide + c.labour + c.other + sprayCosts.fertilizer + sprayCosts.pesticide;
  return {
    season,
    sales,
    kg,
    income,
    avgPrice: kg ? income / kg : 0,
    costs: c,
    sprayCosts,
    totalCosts,
    profit: income - totalCosts,
    kgPerHa: hectares ? kg / hectares : null,
  };
}

// ---------- storage ----------

const KEY = "m23.harvests";
type Stored = { sales: Sale[]; costs: Record<string, SeasonCosts> };

export function useHarvests(hectares: number | null, sprays: SprayLog[]) {
  const [data, setData] = useState<Stored>(() => {
    try {
      return { sales: [], costs: {}, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
    } catch {
      return { sales: [], costs: {} };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Not saved; kept for this visit only.
    }
  }, [data]);

  const save = (sale: Sale) =>
    setData((d) => ({
      ...d,
      sales: d.sales.some((s) => s.id === sale.id) ? d.sales.map((s) => (s.id === sale.id ? sale : s)) : [...d.sales, sale],
    }));
  const remove = (id: string) => setData((d) => ({ ...d, sales: d.sales.filter((s) => s.id !== id) }));
  const setCosts = (season: number, patch: Partial<SeasonCosts>) =>
    setData((d) => ({ ...d, costs: { ...d.costs, [season]: { ...NO_COSTS, ...d.costs[season], ...patch } } }));

  const sales = [...data.sales].sort((a, b) => b.date.localeCompare(a.date));
  const sprayCosts: Record<number, SprayCosts> = {};
  for (const log of sprays) {
    if (!log.cost) continue;
    const season = (sprayCosts[sprayCostSeason(log.date)] ??= { fertilizer: 0, pesticide: 0 });
    season[sprayCostKind(log)] += log.cost;
  }
  // Every season with a sale or a cost, plus this year so costs can be entered before the first sale.
  const years = new Set([
    new Date().getFullYear(),
    ...sales.map(seasonOf),
    ...Object.keys(data.costs).map(Number),
    ...Object.keys(sprayCosts).map(Number),
  ]);
  const seasons = [...years]
    .sort((a, b) => b - a)
    .map((y) => summarize(y, sales.filter((s) => seasonOf(s) === y), data.costs[y], hectares, sprayCosts[y]));

  return { sales, seasons, save, remove, setCosts };
}

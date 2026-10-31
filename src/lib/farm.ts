// The farmer's own farm, kept only on this phone (localStorage). Storage can
// be blocked (private mode, cleared data), so every read and write is
// guarded and the app works without it.

import { useEffect, useState } from "react";
import type { FarmLocation } from "./weather";

export type SoilType = 1 | 2 | 3;

export type Farm = {
  plantedYear: number | null; // tree age is worked out from this, so it stays right next year
  soil: SoilType | null;
  hectares: number | null;
  village: string;
  location: FarmLocation | null; // exact GPS spot or a chosen province; never leaves the phone
};

const EMPTY: Farm = { plantedYear: null, soil: null, hectares: null, village: "", location: null };

// The book's three soil classes (p.2), which change spacing and yield.
export const SOILS: Record<SoilType, { km: string; en: string; detailKm: string; detailEn: string }> = {
  1: {
    km: "ដីក្រហមចម្ការលើ",
    en: "Red upland soil",
    detailKm: "ដីល្អ មានជីជាតិ",
    detailEn: "Good, fertile soil",
  },
  2: {
    km: "ដីខ្សាច់ល្បាយ មានសំណើមរដូវប្រាំង",
    en: "Sandy loam, moist in dry season",
    detailKm: "ដីនៅសើមនៅពេលជីកក្នុងរដូវប្រាំង",
    detailEn: "Still damp when dug in the dry season",
  },
  3: {
    km: "ដីខ្សាច់ល្បាយ គ្មានសំណើមរដូវប្រាំង",
    en: "Sandy loam, dry in dry season",
    detailKm: "ដីស្ងួតខ្លាំងនៅរដូវប្រាំង",
    detailEn: "Dries out completely in the dry season",
  },
};

export function treeAge(farm: Farm, now = new Date()): number | null {
  return farm.plantedYear === null ? null : Math.max(0, now.getFullYear() - farm.plantedYear);
}

export const isSetUp = (farm: Farm) => farm.plantedYear !== null && farm.soil !== null;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved; the app still works for this visit.
  }
}

export function useFarm() {
  const [farm, setFarm] = useState<Farm>(() => read("m23.farm", EMPTY));
  useEffect(() => write("m23.farm", farm), [farm]);
  const update = (patch: Partial<Farm>) => setFarm((f) => ({ ...f, ...patch }));
  return [farm, update] as const;
}

/** Ticked tasks for one calendar month, e.g. key "2026-10". */
export function useDoneTasks(monthKey: string) {
  const storageKey = `m23.done.${monthKey}`;
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => write(storageKey, done), [storageKey, done]);
  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  return [new Set(done), toggle] as const;
}

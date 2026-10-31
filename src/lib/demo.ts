// Demo mode for presentations: opening /#demo fills the app with a sample
// farmer (farm, spray journal, three seasons of sales). The phone's own data
// is set aside first and comes back on "Exit demo", so a farmer's real
// records are never lost by trying the demo.

import { PROVINCES } from "./weather";
import { addDays, todayIso } from "./sprays";

const BACKUP_KEY = "m23.demo";
// Device settings, not farm data: left alone by the demo.
const KEEP = new Set(["m23.iosHint", "m23.inAppHint", "m23.lastBackup", "m23.weather", BACKUP_KEY]);

function appKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("m23.") && !KEEP.has(k)) keys.push(k);
  }
  return keys;
}

export function isDemo(): boolean {
  try {
    return localStorage.getItem(BACKUP_KEY) !== null;
  } catch {
    return false;
  }
}

function writeDemoData() {
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const month = today.slice(0, 7);
  const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
  const province = PROVINCES[0];

  for (const k of appKeys()) localStorage.removeItem(k);

  set("m23.account", { status: "registered", name: "សុខ ដារា (សាកល្បង)", phone: "010000000", village: "ឃុំខ្នារសណ្ដាយ", at: `${today}T00:00:00Z` });
  set("m23.farm", {
    plantedYear: year - 6,
    soil: 1,
    hectares: 2,
    village: "ឃុំខ្នារសណ្ដាយ",
    location: { lat: province.lat, lon: province.lon, accuracy: null, label: province.km, capturedAt: `${today}T00:00:00Z` },
  });

  const spray = (id: string, daysAgo: number, purpose: string, target: string, products: [string, string, string][], next: number | null, nextDone: boolean) => ({
    id,
    date: addDays(today, -daysAgo),
    purpose,
    target,
    products: products.map(([name, dose, formulation]) => ({ name, dose, formulation })),
    area: "",
    notes: "",
    nextDate: next === null ? null : addDays(today, next),
    nextDone,
  });
  set("m23.sprays", [
    spray("demo-s1", 280, "insect", "tmb", [["Thiamethoxam", "", "SC"]], null, true),
    spray("demo-s2", 265, "fungus", "", [["Hexaconazole", "", "SC"]], null, true),
    spray("demo-s3", 30, "fungus", "", [["Mancozeb", "2 kg / 1000 L", "WP"]], null, true),
    spray("demo-s4", 15, "foliar", "", [["NPK 6-30-30", "", "other"]], null, true),
    // Due today, so the home screen shows the spray reminder.
    spray("demo-s5", 5, "insect", "tmb", [["Imidacloprid", "", "SC"], ["Cypermethrin", "", "EC"]], 0, false),
  ]);

  const sale = (id: string, y: number, md: string, kg: number, price: number, buyer: string) => ({
    id,
    date: `${y}-${md}`,
    kg,
    pricePerKg: price,
    buyer,
    state: "dry",
    nutCount: null,
    notes: "",
  });
  set("m23.harvests", {
    sales: [
      sale("demo-h1", year - 2, "03-10", 1800, 5200, "ឈ្មួញភូមិ"),
      sale("demo-h2", year - 2, "04-12", 1500, 5400, "ឈ្មួញភូមិ"),
      sale("demo-h3", year - 1, "03-08", 2200, 6000, "សហគមន៍កសិកម្មចន្ទី"),
      sale("demo-h4", year - 1, "04-20", 1700, 6200, "ឈ្មួញភូមិ"),
      sale("demo-h5", year, "03-15", 2600, 6500, "សហគមន៍កសិកម្មចន្ទី"),
      sale("demo-h6", year, "04-18", 2100, 6300, "សហគមន៍កសិកម្មចន្ទី"),
    ],
    costs: {
      [year - 1]: { fertilizer: 4_000_000, pesticide: 2_500_000, labour: 3_000_000, other: 500_000 },
      [year]: { fertilizer: 4_500_000, pesticide: 2_800_000, labour: 3_200_000, other: 600_000 },
    },
  });
  set(`m23.done.${month}`, ["plough"]);
}

/** Called before the app renders: /#demo starts (or restarts) the demo. */
export function startDemoFromLink() {
  if (location.hash !== "#demo") return;
  try {
    if (!isDemo()) {
      const backup: Record<string, string> = {};
      for (const k of appKeys()) backup[k] = localStorage.getItem(k)!;
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    }
    writeDemoData();
  } catch {
    // Storage blocked: the app opens normally.
  }
  history.replaceState(null, "", "/#month");
}

/** Fresh sample data, for the next audience. */
export function resetDemo() {
  try {
    writeDemoData();
  } catch {
    // Nothing to reset.
  }
  location.replace("/#month");
  location.reload();
}

/** Puts the phone's own data back. */
export function exitDemo() {
  try {
    const backup: Record<string, string> = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "{}");
    for (const k of appKeys()) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(backup)) localStorage.setItem(k, v);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // Leave things as they are.
  }
  location.replace("/");
}

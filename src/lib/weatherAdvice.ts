// What the coming days' weather means for cashew, using only the book's own
// thresholds. Each piece of advice links to the entry it comes from.

import { toKhmerDigits as kh } from "./kb";
import type { Forecast } from "./weather";

export type Advice = { id: string; tone: "warn" | "good"; km: string; en: string; entry: number };

const BLOOM_MONTHS = [11, 12, 1, 2, 3];
const ACID_DEW_MONTHS = [12, 1, 2]; // late month 12 to early month 2 (#120)
const HARVEST_MONTHS = [2, 3, 4, 5];
const FERTILIZER_MONTHS = [5, 6, 7, 8, 9];

const KHMER_WEEKDAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(date: string, index: number): { km: string; en: string } {
  if (index === 0) return { km: "ថ្ងៃនេះ", en: "Today" };
  if (index === 1) return { km: "ថ្ងៃស្អែក", en: "Tomorrow" };
  const wd = new Date(`${date}T12:00:00`).getDay();
  return { km: `ថ្ងៃ${KHMER_WEEKDAYS[wd]}`, en: EN_WEEKDAYS[wd] };
}

const deg = (n: number) => `${kh(Math.round(n))}°C`;

export function adviceFor(f: Forecast, month: number, treeAge: number | null): Advice[] {
  const out: Advice[] = [];
  const next3 = f.days.slice(0, 3);
  const flowering = treeAge === null || treeAge >= 2;
  const inBloom = flowering && BLOOM_MONTHS.includes(month);

  if (flowering && ACID_DEW_MONTHS.includes(month)) {
    const i = f.dawns.slice(0, 3).findIndex((d) => d.maxHumidity > 82);
    if (i >= 0) {
      const day = dayName(f.dawns[i].date, i);
      const south = f.dawns[i].southWind;
      out.push({
        id: "acid-dew",
        tone: "warn",
        entry: 121,
        km: `ព្រឹក${day.km.replace("ថ្ងៃ", "")} សំណើមខ្យល់ ${kh(f.dawns[i].maxHumidity)}%${south ? " និងខ្យល់បក់ពីត្បូង" : ""}៖ ហានិភ័យសន្សើមប្រៃ${south ? "ខ្ពស់" : ""}។ ពិនិត្យព្រលឹម ហើយត្រៀមថ្នាំផ្សិត។`,
        en: `${day.en} morning: humidity ${f.dawns[i].maxHumidity}%${south ? " with wind from the south" : ""}. ${south ? "High" : "Possible"} acid dew risk: check at dawn and have fungicide ready.`,
      });
    }
  }

  if (inBloom) {
    const hot = next3.findIndex((d) => d.max >= 35);
    if (hot >= 0) {
      const day = dayName(next3[hot].date, hot);
      out.push({
        id: "heat",
        tone: "warn",
        entry: 68,
        km: `${day.km} ក្ដៅដល់ ${deg(next3[hot].max)}៖ ផ្កា និងក្ដិបតូចអាចក្រៀម។ បើត្រូវបាញ់ថ្នាំ បាញ់ព្រឹកព្រលឹម ឬពេលយប់។`,
        en: `${day.en} reaches ${Math.round(next3[hot].max)}°C: flowers and small fruit can wither. If you must spray, do it early morning or at night.`,
      });
      if (next3[hot].rainMm > 0 && next3[hot].rainMm < 5) {
        out.push({
          id: "hot-shower",
          tone: "warn",
          entry: 117,
          km: "ក្ដៅខ្លាំង ហើយភ្លៀងរលឹមតិចៗ (មិនជោកដី)៖ ក្ដិបតូចអាចខ្មៅខូច។",
          en: "Very hot with only a light shower (not soaking the soil): small fruit can turn black.",
        });
      }
    }
    const cold = next3.findIndex((d) => d.min < 20);
    if (cold >= 0) {
      const day = dayName(next3[cold].date, cold);
      out.push({
        id: "cold",
        tone: "warn",
        entry: 68,
        km: `យប់${day.km.replace("ថ្ងៃ", "")} ត្រជាក់ដល់ ${deg(next3[cold].min)}៖ ក្រោម ២០°C ផ្កា និងក្ដិបតូចអាចក្រៀម។`,
        en: `${cold === 0 ? "Tonight" : `${day.en} night`} drops to ${Math.round(next3[cold].min)}°C: below 20°C, flowers and small fruit can wither.`,
      });
    }
    const dry = next3.findIndex((d) => d.minHumidity < 45);
    if (dry >= 0) {
      const day = dayName(next3[dry].date, dry);
      out.push({
        id: "dry-air",
        tone: "warn",
        entry: 68,
        km: `${day.km} ខ្យល់ស្ងួត (សំណើម ${kh(next3[dry].minHumidity)}%)៖ ក្រោម ៤៥% ក្ដិបកើតពិបាក។`,
        en: `${day.en} the air is dry (humidity ${next3[dry].minHumidity}%): below 45%, fruit set is difficult.`,
      });
    }
  }

  // "Likely" from 60%; a heavy forecast at 40-59% is still worth a word, as "possible".
  const wet = f.days.slice(0, 2).findIndex((d) => d.rainChance >= 60 || (d.rainChance >= 40 && d.rainMm >= 2));
  if (wet >= 0) {
    const d = f.days[wet];
    const day = dayName(d.date, wet);
    const likely = d.rainChance >= 60;
    out.push({
      id: "rain-spray",
      tone: "warn",
      entry: 24,
      km: `${day.km} ${likely ? "ទំនងជាមានភ្លៀង" : "អាចមានភ្លៀង"} (${kh(d.rainChance)}%)៖ កុំបាញ់ថ្នាំ ឬជីស្លឹកមុនភ្លៀង ព្រោះភ្លៀងលាងចេញ។`,
      en: `Rain ${likely ? "likely" : "possible"} ${day.en.toLowerCase()} (${d.rainChance}%): don't spray pesticide or foliar feed before rain; it washes off.`,
    });
  }

  if (FERTILIZER_MONTHS.includes(month) && next3.some((d) => d.rainMm >= 5)) {
    out.push({
      id: "fertilize",
      tone: "good",
      entry: 92,
      km: "ភ្លៀងនឹងធ្លាក់ក្នុង ៣ ថ្ងៃ៖ ពេលល្អដាក់ជីដី ព្រោះត្រូវការសំណើមដើម្បីរលាយ។",
      en: "Rain is coming in the next 3 days: a good time for soil fertilizer, which needs moisture to dissolve.",
    });
  }

  if (flowering && HARVEST_MONTHS.includes(month)) {
    const rain = next3.reduce((sum, d) => sum + d.rainMm, 0);
    out.push(
      rain < 1
        ? {
            id: "drying-good",
            tone: "good",
            entry: 149,
            km: "ស្ងួត ៣ ថ្ងៃខាងមុខ៖ ល្អសម្រាប់ហាលគ្រាប់ចន្ទី។",
            en: "Dry for the next 3 days: good for drying nuts.",
          }
        : {
            id: "drying-rain",
            tone: "warn",
            entry: 149,
            km: "មានភ្លៀង៖ ប្រមូលគ្រាប់ហាលជាគំនរ ហើយគ្របប្លាស្ទិក។",
            en: "Rain expected: pile drying nuts and cover them with plastic.",
          },
    );
  }

  return out;
}

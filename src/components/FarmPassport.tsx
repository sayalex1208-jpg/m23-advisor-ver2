import { useState } from "react";
import type { Account } from "../lib/account";
import { SOILS, treeAge, type Farm } from "../lib/farm";
import { riel, usd, type SeasonSummary, type Sale } from "../lib/harvests";
import { count, toKhmerDigits as kh } from "../lib/kb";
import { addDays, formatDate, todayIso, type SprayLog } from "../lib/sprays";
import { PROVINCES } from "../lib/weather";

// A one-page summary of the farm's record that the farmer can show a bank
// officer or buyer, or send it on Telegram. Nothing leaves the phone until the
// farmer taps Share.

export function FarmPassport({
  farm,
  account,
  seasons,
  sales,
  sprays,
  onBack,
  onRegister,
}: {
  farm: Farm;
  account: Account;
  seasons: SeasonSummary[];
  sales: Sale[];
  sprays: SprayLog[];
  onBack: () => void;
  onRegister: () => void;
}) {
  const [shared, setShared] = useState<"copied" | "failed" | null>(null);
  const withSales = seasons.filter((s) => s.sales.length > 0);
  const age = treeAge(farm);
  const firstRecord = [...sales.map((s) => s.date), ...sprays.map((s) => s.date)].sort()[0];
  const buyerNamed = sales.filter((s) => s.buyer).length;
  const yearAgo = addDays(todayIso(), -365);
  const recentSprays = sprays.filter((s) => s.date >= yearAgo);
  const products = [...new Set(recentSprays.flatMap((s) => s.products.map((p) => p.name.trim())).filter(Boolean))];
  const avgIncome = withSales.length ? withSales.reduce((t, s) => t + s.income, 0) / withSales.length : 0;
  const name = account.status === "registered" ? account.name : null;

  async function share() {
    const text = passportText({ farm, account, withSales, products, recentSprays: recentSprays.length, buyerNamed, sales: sales.length });
    try {
      if (navigator.share) {
        await navigator.share({ title: "M23 Farm passport", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared("copied");
    } catch (e) {
      // Closing the share sheet is not an error.
      if ((e as Error).name !== "AbortError") setShared("failed");
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <button onClick={onBack} className="km self-start text-[15px] text-muted underline">
        ‹ ត្រឡប់ · Back to harvest log
      </button>

      <article className="overflow-hidden rounded-2xl border border-line bg-surface">
        <header className="bg-brand px-4 py-4 text-brand-ink">
          <p className="text-[13px] font-semibold uppercase tracking-wider opacity-85">M23 Cashew Advisor · Farm passport</p>
          <h3 className="km mt-1 text-[22px] font-semibold leading-snug">{name ?? "កសិករចន្ទី M23"}</h3>
          <p className="text-[15px] opacity-90 tabular-nums">
            {account.status === "registered" ? account.phone : "Cashew farmer (guest)"}
            {farm.village && ` · ${farm.village}`}
          </p>
        </header>

        {account.status !== "registered" && (
          <p className="flex items-center justify-between gap-2 bg-warn-soft px-4 py-2.5 text-[14px] text-warn">
            <span>
              <span className="km block">ចុះឈ្មោះ ដើម្បីដាក់ឈ្មោះ និងលេខទូរស័ព្ទរបស់អ្នក។</span>
              Register to put your name and phone on it.
            </span>
            <button onClick={onRegister} className="km shrink-0 rounded-lg bg-warn px-3 py-1.5 text-[15px] text-white">
              ចុះឈ្មោះ
            </button>
          </p>
        )}

        <Section km="ចម្ការ" en="Farm">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Row km="ផ្ទៃដី" en="Area" value={farm.hectares ? `${kh(farm.hectares)} ហិកតា` : "—"} sub={farm.hectares ? `${farm.hectares} ha` : "not set"} />
            <Row
              km="អាយុដើម"
              en="Tree age"
              value={age === null ? "—" : age === 0 ? "ទើបដាំ" : `${kh(age)} ឆ្នាំ`}
              sub={age === null ? "not set" : `planted ${farm.plantedYear}`}
            />
            <Row km="ដី" en="Soil" value={farm.soil ? SOILS[farm.soil].km : "—"} sub={farm.soil ? SOILS[farm.soil].en : "not set"} wide />
            <Row
              km="ទីតាំង"
              en="Location"
              value={farm.location ? (farm.location.label ?? "GPS") : "—"}
              sub={farm.location ? (provinceEn(farm) ?? "farm GPS saved on the phone") : "not set"}
              wide
            />
          </dl>
        </Section>

        <Section km="ផល និងចំណូល" en="Yield and income">
          {withSales.length === 0 ? (
            <p className="text-[15px] text-muted">
              <span className="km block">មិនទាន់មានការលក់ទេ។ កត់ត្រាការលក់ក្នុងផ្ទាំង ផល និងលក់។</span>
              No sales logged yet. Add them in the harvest log.
            </p>
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[22rem] text-[15px] tabular-nums">
                  <thead>
                    <tr className="text-left text-[13px] text-muted">
                      <th className="py-1 pr-2 font-medium">Season</th>
                      <th className="py-1 pr-2 text-right font-medium">kg</th>
                      {farm.hectares ? <th className="py-1 pr-2 text-right font-medium">kg/ha</th> : null}
                      <th className="py-1 pr-2 text-right font-medium">riel/kg</th>
                      <th className="py-1 pr-2 text-right font-medium">Income</th>
                      <th className="py-1 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withSales.map((s) => (
                      <tr key={s.season} className="border-t border-line">
                        <td className="py-1.5 pr-2 font-medium">{s.season}</td>
                        <td className="py-1.5 pr-2 text-right">{Math.round(s.kg).toLocaleString("en")}</td>
                        {s.kgPerHa !== null ? <td className="py-1.5 pr-2 text-right">{Math.round(s.kgPerHa).toLocaleString("en")}</td> : null}
                        <td className="py-1.5 pr-2 text-right">{Math.round(s.avgPrice).toLocaleString("en")}</td>
                        <td className="py-1.5 pr-2 text-right">{short(s.income)}</td>
                        <td className={`py-1.5 text-right ${s.profit < 0 ? "text-danger" : ""}`}>
                          {s.totalCosts > 0 ? short(s.profit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[14px] text-muted">
                Income and profit in riel (M = million). Profit is shown when season costs were entered.
              </p>
              <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2.5">
                <span className="km block text-[15px] font-semibold text-brand">ចំណូលមធ្យមក្នុងមួយរដូវ {riel(avgIncome).km}</span>
                <span className="block text-[14px] text-muted tabular-nums">
                  Average income per season {riel(avgIncome).en} {usd(avgIncome)} · {withSales.length}{" "}
                  {withSales.length === 1 ? "season" : "seasons"}
                </span>
              </p>
            </>
          )}
        </Section>

        <Section km="ការបាញ់ថ្នាំ ១២ ខែចុងក្រោយ" en="Spraying, last 12 months">
          {recentSprays.length === 0 ? (
            <p className="text-[15px] text-muted">No sprays logged.</p>
          ) : (
            <>
              <p className="km text-[15px]">
                បាញ់ {kh(recentSprays.length)} ដង · <span className="text-muted">{count(recentSprays.length, "spray")} logged</span>
              </p>
              <p className="mt-1 text-[15px] text-muted">{products.join(", ")}</p>
            </>
          )}
        </Section>

        <footer className="border-t border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
          <p>
            <span className="km">កសិករកត់ត្រាដោយខ្លួនឯង មិនទាន់ផ្ទៀងផ្ទាត់។ </span>
            Self-reported by the farmer, not verified.
            {sales.length > 0 && ` Buyer named on ${buyerNamed} of ${count(sales.length, "sale")}.`}
            {firstRecord && ` Records since ${formatDate(firstRecord).en}.`} Made {formatDate(todayIso()).en}.
          </p>
        </footer>
      </article>

      <button onClick={share} className="km h-12 rounded-xl bg-brand text-[16px] font-medium text-brand-ink">
        ចែករំលែក · Share (Telegram, Messenger…)
      </button>
      {shared && (
        <p className="km text-center text-[15px] text-muted">
          {shared === "copied" ? "បានចម្លង។ បិទភ្ជាប់ក្នុង Telegram។ · Copied. Paste it in Telegram." : "ចែករំលែកមិនបាន។ · Couldn't share."}
        </p>
      )}
      <p className="text-[14px] text-muted">
        <span className="km">ព័ត៌មាននេះនៅតែក្នុងទូរស័ព្ទ រហូតដល់អ្នកចុច ចែករំលែក។ </span>
        This stays on your phone until you tap Share. You choose who sees it.
      </p>
    </div>
  );
}

const provinceEn = (farm: Farm) => PROVINCES.find((p) => p.km === farm.location?.label)?.en ?? null;

/** Riel in millions for the table, e.g. 3.6M. */
const short = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.round(n).toLocaleString("en"));

function passportText({
  farm,
  account,
  withSales,
  products,
  recentSprays,
  buyerNamed,
  sales,
}: {
  farm: Farm;
  account: Account;
  withSales: SeasonSummary[];
  products: string[];
  recentSprays: number;
  buyerNamed: number;
  sales: number;
}): string {
  const age = treeAge(farm);
  const lines = [
    "M23 Cashew Advisor · Farm passport",
    account.status === "registered" ? `${account.name} · ${account.phone}` : "Cashew farmer",
    [farm.village, provinceEn(farm)].filter(Boolean).join(", "),
    [
      farm.hectares && `${farm.hectares} ha`,
      age !== null && (age === 0 ? "planted this year" : `trees ${age} years old`),
      farm.soil && SOILS[farm.soil].en,
    ]
      .filter(Boolean)
      .join(" · "),
    "",
    "Yield and income:",
    ...(withSales.length
      ? withSales.map(
          (s) =>
            `${s.season}: ${Math.round(s.kg).toLocaleString("en")} kg` +
            (s.kgPerHa !== null ? ` (${Math.round(s.kgPerHa).toLocaleString("en")} kg/ha)` : "") +
            ` · avg ${Math.round(s.avgPrice).toLocaleString("en")} riel/kg · income ${riel(s.income).en}` +
            (s.totalCosts > 0 ? ` · profit ${riel(s.profit).en}` : ""),
        )
      : ["No sales logged yet"]),
    "",
    `Spraying, last 12 months: ${count(recentSprays, "spray")}${products.length ? ` (${products.join(", ")})` : ""}`,
    "",
    `Self-reported by the farmer, not verified.${sales ? ` Buyer named on ${buyerNamed} of ${count(sales, "sale")}.` : ""} Made ${todayIso()}.`,
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}

function Section({ km, en, children }: { km: string; en: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-3.5 first-of-type:border-t-0">
      <h4 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-brand">
        <span className="km normal-case text-[15px] tracking-normal">{km}</span> · {en}
      </h4>
      {children}
    </section>
  );
}

function Row({ km, en, value, sub, wide }: { km: string; en: string; value: string; sub: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[13px] text-muted">
        <span className="km">{km}</span> · {en}
      </dt>
      <dd className="km text-[15px] font-medium">{value}</dd>
      <dd className="text-[13px] text-muted">{sub}</dd>
    </div>
  );
}

import { SOILS, treeAge, type Farm, type SoilType } from "../lib/farm";
import { ENTRY_BY_ID, toKhmerDigits as kh } from "../lib/kb";
import { useState } from "react";
import type { Account } from "../lib/account";
import type { useHarvests } from "../lib/harvests";
import type { useSprays } from "../lib/sprays";
import { FarmPassport } from "./FarmPassport";
import { HarvestLog } from "./HarvestLog";
import { RegisterForm } from "./RegisterForm";
import { BackupCard, needsBackup } from "./BackupCard";
import { LinkTelegramCard } from "./LinkTelegramCard";
import { AlertIcon } from "./icons";
import { LocationField } from "./LocationField";
import { SprayJournal } from "./SprayJournal";

const AGES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// The book's figures for each soil (p.2 yields, p.30-31 spacing).
const SPACING: Record<SoilType, { km: string; en: string }> = {
  1: { km: "៧x៧ ម៉ែត្រ · ១៨០-១៩០ ដើម/ហិកតា", en: "7x7 m · 180-190 trees/ha" },
  2: { km: "៨x៨ ម៉ែត្រ មានដើមកណ្ដាល · ២៧០-២៨០ ដើម/ហិកតា", en: "8x8 m with a centre tree · 270-280 trees/ha" },
  3: { km: "៨x៨ ម៉ែត្រ មានដើមកណ្ដាល · ២៧០-២៨០ ដើម/ហិកតា", en: "8x8 m with a centre tree · 270-280 trees/ha" },
};
const YEAR5_YIELD: Record<SoilType, [number, number]> = { 1: [3000, 3500], 2: [1800, 2000], 3: [1000, 1300] };

export type FarmView = "details" | "journal" | "harvest" | "passport";

export function FarmScreen({
  farm,
  update,
  onDone,
  view,
  setView,
  sprays,
  harvests,
  account,
  setAccount,
  repeatOf,
  onRepeatHandled,
}: {
  farm: Farm;
  update: (p: Partial<Farm>) => void;
  onDone: () => void;
  view: FarmView;
  setView: (v: FarmView) => void;
  sprays: ReturnType<typeof useSprays>;
  harvests: ReturnType<typeof useHarvests>;
  account: Account;
  setAccount: (a: Account) => void;
  repeatOf: string | null;
  onRepeatHandled: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-4">
      <h2 className="km text-[20px] font-semibold">ចម្ការរបស់ខ្ញុំ</h2>
      <p className="text-[13px] text-muted">
        <span className="km">ព័ត៌មាននេះរក្សាទុកតែក្នុងទូរស័ព្ទនេះ។</span> Saved only on this phone.
      </p>
      {view !== "details" && needsBackup() && (
        <button
          onClick={() => {
            setView("details");
            setTimeout(() => document.getElementById("backup")?.scrollIntoView({ behavior: "smooth" }), 50);
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-left text-[13px] text-warn"
        >
          <AlertIcon size={15} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="km">បម្រុងទុកកំណត់ត្រា កុំឲ្យបាត់ពេលបាត់ទូរស័ព្ទ ›</span>
            <span className="block text-[12px] opacity-85">Back up your records so a lost phone doesn't lose them</span>
          </span>
        </button>
      )}

      <div className="mt-4 grid grid-cols-3 rounded-xl border border-line bg-surface p-1" role="tablist">
        {(
          [
            ["details", "ព័ត៌មានចម្ការ", "Farm details"],
            ["journal", "បាញ់ថ្នាំ", "Spray journal"],
            ["harvest", "ផល និងលក់", "Harvest"],
          ] as const
        ).map(([id, km, en]) => {
          const selected = view === id || (id === "harvest" && view === "passport");
          return (
          <button
            key={id}
            role="tab"
            aria-selected={selected}
            onClick={() => setView(id)}
            className={`relative rounded-lg px-1.5 py-2 text-center ${selected ? "bg-brand text-brand-ink" : "text-ink"}`}
          >
            <span className="km block text-[14px] font-medium">{km}</span>
            <span className={`block text-[11px] ${selected ? "opacity-85" : "text-muted"}`}>{en}</span>
            {id === "journal" && sprays.dueCount > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" aria-label="Spray due" />
            )}
          </button>
          );
        })}
      </div>

      <div className="mt-5">
        {view === "details" ? (
          <>
            <AccountCard account={account} setAccount={setAccount} village={farm.village} />
            {account.status === "registered" && <LinkTelegramCard phone={account.phone} />}
            <FarmDetails farm={farm} update={update} onDone={onDone} />
            <BackupCard />
          </>
        ) : view === "journal" ? (
          <SprayJournal farm={farm} sprays={sprays} repeatOf={repeatOf} onRepeatHandled={onRepeatHandled} />
        ) : view === "harvest" ? (
          <HarvestLog harvests={harvests} onPassport={() => setView("passport")} />
        ) : (
          <FarmPassport
            farm={farm}
            account={account}
            seasons={harvests.seasons}
            sales={harvests.sales}
            sprays={sprays.logs}
            onBack={() => setView("harvest")}
            onRegister={() => setView("details")}
          />
        )}
      </div>
    </div>
  );
}

function AccountCard({ account, setAccount, village }: { account: Account; setAccount: (a: Account) => void; village: string }) {
  const [open, setOpen] = useState(false);

  if (account.status === "registered") {
    return (
      <p className="mb-6 rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px]">
        <span className="km block text-[15px] font-medium">បានចុះឈ្មោះ៖ {account.name}</span>
        <span className="tabular-nums text-muted">Registered · {account.phone}</span>
      </p>
    );
  }
  return (
    <section className="mb-6 rounded-2xl bg-brand-soft p-4">
      {open ? (
        <RegisterForm
          initialVillage={village}
          onDone={(a) => {
            setAccount(a);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
          cancelLabel={{ km: "មិនទាន់", en: "Not now" }}
        />
      ) : (
        <>
          <p className="km text-[15px] font-medium">អ្នកកំពុងប្រើជាភ្ញៀវ។ ចុះឈ្មោះ ដើម្បីទទួលដំបូន្មាន និងសេវាពីក្រុមការងារយើង។</p>
          <p className="text-[12px] text-muted">You're using the app as a guest. Register to get advice and services from our team.</p>
          <button onClick={() => setOpen(true)} className="km mt-3 h-11 rounded-xl bg-brand px-4 text-[15px] text-brand-ink">
            ចុះឈ្មោះ · Register
          </button>
        </>
      )}
    </section>
  );
}

function FarmDetails({ farm, update, onDone }: { farm: Farm; update: (p: Partial<Farm>) => void; onDone: () => void }) {
  const age = treeAge(farm);
  const thisYear = new Date().getFullYear();

  return (
    <div>

      <Field km="ដើមចន្ទីរបស់អ្នក អាយុប៉ុន្មានឆ្នាំ?" en="How old are your trees?">
        <div className="grid grid-cols-5 gap-2">
          {AGES.map((a) => {
            const selected = age !== null && (a === 8 ? age >= 8 : age === a);
            return (
              <button
                key={a}
                onClick={() => update({ plantedYear: thisYear - a })}
                aria-pressed={selected}
                className={`km h-12 rounded-xl border text-[15px] ${a === 0 ? "col-span-2" : ""} ${
                  selected ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface"
                }`}
              >
                {a === 0 ? "ទើបដាំ" : a === 8 ? `${kh(8)}+` : kh(a)}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[12px] text-muted">
          <span className="km">ទើបដាំ = ដាំក្នុងឆ្នាំនេះ</span> · "ទើបដាំ" means planted this year
        </p>
      </Field>

      <Field km="ដីប្រភេទណា?" en="Which soil type?">
        <div className="flex flex-col gap-2">
          {([1, 2, 3] as SoilType[]).map((t) => (
            <button
              key={t}
              onClick={() => update({ soil: t })}
              aria-pressed={farm.soil === t}
              className={`rounded-xl border px-3.5 py-3 text-left ${
                farm.soil === t ? "border-brand bg-brand-soft" : "border-line bg-surface"
              }`}
            >
              <span className="km block text-[15px] font-medium">{SOILS[t].km}</span>
              <span className="km block text-[13px] text-muted">{SOILS[t].detailKm}</span>
              <span className="block text-[12px] text-muted">
                {SOILS[t].en} · {SOILS[t].detailEn}
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field km="ផ្ទៃដីប៉ុន្មានហិកតា? (មិនចាំបាច់)" en="How many hectares? (optional)">
        <input
          id="farm-hectares"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={farm.hectares ?? ""}
          onChange={(e) => update({ hectares: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
          placeholder="ឧ. 2"
          className="h-12 w-32 rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Field>

      <Field km="ទីតាំងចម្ការ (សម្រាប់អាកាសធាតុ)" en="Farm location (for weather)">
        <LocationField location={farm.location} onChange={(location) => update({ location })} />
      </Field>

      <Field km="ភូមិ ឬឃុំ (មិនចាំបាច់)" en="Village or commune (optional)">
        <input
          id="farm-village"
          type="text"
          value={farm.village}
          onChange={(e) => update({ village: e.target.value })}
          placeholder="ឧ. ឃុំខ្នារសណ្ដាយ"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Field>

      {farm.soil !== null && <BookFigures soil={farm.soil} hectares={farm.hectares} />}

      <button
        onClick={onDone}
        disabled={age === null || farm.soil === null}
        className="km mt-6 h-12 w-full rounded-xl bg-brand text-[16px] font-medium text-brand-ink disabled:opacity-40"
      >
        មើលការងារខែនេះ · See this month's tasks
      </button>
    </div>
  );
}

function Field({ km, en, children }: { km: string; en: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="km text-[16px] font-semibold">{km}</h3>
      <p className="mb-2.5 text-[12px] text-muted">{en}</p>
      {children}
    </section>
  );
}

function BookFigures({ soil, hectares }: { soil: SoilType; hectares: number | null }) {
  const [lo, hi] = YEAR5_YIELD[soil];
  const total = hectares ? ([lo * hectares, hi * hectares].map((kg) => (kg / 1000).toFixed(1)) as [string, string]) : null;
  const unverified = ENTRY_BY_ID.get(69)?.needs_verification || ENTRY_BY_ID.get(84)?.needs_verification;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-brand">
        <span className="km normal-case">តាមសៀវភៅ សម្រាប់ដីរបស់អ្នក</span> · From the book, for your soil
      </h3>
      <dl className="mt-3 flex flex-col gap-3">
        <div>
          <dt className="km text-[13px] text-muted">គម្លាតដាំ · Spacing (ទំព័រ ៣០-៣១)</dt>
          <dd className="km text-[15px]">{SPACING[soil].km}</dd>
          <dd className="text-[12px] text-muted">{SPACING[soil].en}</dd>
        </div>
        <div>
          <dt className="km text-[13px] text-muted">ទិន្នផលឆ្នាំទី៥ · Yield in year 5 (ទំព័រ ២)</dt>
          <dd className="km text-[15px] tabular-nums">
            {kh(lo.toLocaleString("en"))}-{kh(hi.toLocaleString("en"))} គ.ក្រ គ្រាប់ស្ងួត/ហិកតា
            {total && ` · សរុប ${kh(total[0])}-${kh(total[1])} តោន`}
          </dd>
          <dd className="text-[12px] text-muted tabular-nums">
            {lo.toLocaleString("en")}-{hi.toLocaleString("en")} kg dry nuts/ha{total && ` · ${total[0]}-${total[1]} t in total`}
          </dd>
        </div>
      </dl>
      {unverified && (
        <p className="mt-3 flex gap-2 text-[12px] text-warn">
          <AlertIcon size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="km">តួលេខប៉ាន់ស្មាន មិនទាន់ផ្ទៀងផ្ទាត់ ហើយអាស្រ័យលើអាកាសធាតុ និងការថែទាំ។</span> Estimates, not yet
            verified; real yield depends on weather and care.
          </span>
        </p>
      )}
    </section>
  );
}

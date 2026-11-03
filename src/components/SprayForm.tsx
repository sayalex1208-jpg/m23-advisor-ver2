import { useState } from "react";
import { toKhmerDigits as kh } from "../lib/kb";
import {
  COMMON_PRODUCTS,
  PEST_TARGETS,
  PURPOSES,
  addDays,
  checkSpray,
  formatDate,
  suggestNext,
  todayIso,
  type Formulation,
  type Purpose,
  type SprayLog,
} from "../lib/sprays";
import { EntryBody } from "./AnswerParts";
import { AlertIcon } from "./icons";

const FORMULATIONS: Formulation[] = ["EC", "SC", "SL", "WP", "other"];

export function SprayForm({
  initial,
  history,
  rainChanceToday,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: SprayLog;
  history: SprayLog[];
  rainChanceToday: number | null;
  onSave: (log: SprayLog) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [log, setLog] = useState<SprayLog>(initial);
  // A saved record without a next date chose "no more"; a new one starts on the book's interval.
  const [nextMode, setNextMode] = useState<"suggested" | "custom" | "none">(
    initial.nextDate ? "custom" : onDelete ? "none" : "suggested",
  );
  const [pickedDays, setPickedDays] = useState<number | null>(null);
  const [showRule, setShowRule] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const month = Number(log.date.slice(5, 7));
  const suggestion = suggestNext(log.purpose, log.target, month);
  const dayChoices = suggestion?.days ?? [7, 14];
  // Until the farmer picks, the book's first interval is the reminder, so it can't be skipped by accident;
  // not for a spray logged late, whose book reminder would already be past.
  const autoDays = suggestion && addDays(log.date, suggestion.days[0]) >= todayIso() ? suggestion.days[0] : null;
  const days = pickedDays !== null && dayChoices.includes(pickedDays) ? pickedDays : autoDays;
  const nextDate =
    nextMode === "custom" ? log.nextDate : nextMode === "suggested" && days !== null ? addDays(log.date, days) : null;
  const nextChosen = nextMode === "none" || nextDate !== null;
  const others = history.filter((h) => h.id !== log.id && h.date <= log.date);
  const checks = checkSpray(log, others, month, rainChanceToday);
  const set = (patch: Partial<SprayLog>) => setLog((l) => ({ ...l, ...patch }));
  const setProduct = (i: number, patch: Partial<SprayLog["products"][number]>) =>
    set({ products: log.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const canSave = log.products.some((p) => p.name.trim()) && nextChosen;

  return (
    <form
      className="flex flex-col gap-5 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({ ...log, products: log.products.filter((p) => p.name.trim()), nextDate, nextDone: false });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="km text-[18px] font-semibold">{initial.products.some((p) => p.name) ? "កែការបាញ់" : "កត់ត្រាការបាញ់"}</h3>
        <button type="button" onClick={onCancel} className="km text-[15px] text-muted underline">
          បោះបង់ · Cancel
        </button>
      </div>

      <Block km="ថ្ងៃបាញ់" en="Date sprayed">
        <input
          id="spray-date"
          type="date"
          value={log.date}
          onChange={(e) => e.target.value && set({ date: e.target.value })}
          className="h-12 rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Block>

      <Block km="បាញ់សម្រាប់អ្វី?" en="What for?">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PURPOSES) as Purpose[]).map((p) => (
            <Chip key={p} active={log.purpose === p} onClick={() => set({ purpose: p, target: "" })}>
              {PURPOSES[p].km}
            </Chip>
          ))}
        </div>
        {log.purpose === "insect" && (
          <div className="mt-3">
            <p className="mb-2 text-[14px] text-muted">
              <span className="km">សត្វល្អិតអ្វី?</span> · Which pest?
            </p>
            <div className="flex flex-wrap gap-2">
              {PEST_TARGETS.map((t) => (
                <Chip key={t.id} active={log.target === t.id} onClick={() => set({ target: log.target === t.id ? "" : t.id })}>
                  {t.km}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </Block>

      <Block km="ថ្នាំ ឬជីដែលបានលាយ" en="Products in the tank">
        <datalist id="spray-products">
          {COMMON_PRODUCTS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="flex flex-col gap-3">
          {log.products.map((p, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex gap-2">
                <input
                  id={`spray-product-${i}`}
                  list="spray-products"
                  value={p.name}
                  onChange={(e) => setProduct(i, { name: e.target.value })}
                  placeholder="ឈ្មោះថ្នាំ ឧ. Imidacloprid"
                  aria-label="ឈ្មោះថ្នាំ · Product or active ingredient"
                  className="km h-12 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[16px] outline-none focus:border-brand"
                />
                {log.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set({ products: log.products.filter((_, j) => j !== i) })}
                    className="h-12 shrink-0 px-2 text-[15px] text-muted underline"
                    aria-label="លុបថ្នាំនេះ · Remove this product"
                  >
                    លុប
                  </button>
                )}
              </div>
              <input
                id={`spray-dose-${i}`}
                value={p.dose}
                onChange={(e) => setProduct(i, { dose: e.target.value })}
                placeholder="កម្រិត ឧ. ១ លីត្រ / ទឹក ១០០០ លីត្រ"
                aria-label="កម្រិតថ្នាំ · Dose"
                className="km mt-2 h-12 w-full rounded-lg border border-line bg-bg px-3 text-[16px] outline-none focus:border-brand"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[14px] text-muted">
                  <span className="km">ទម្រង់</span> · Type:
                </span>
                {FORMULATIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setProduct(i, { formulation: p.formulation === f ? "" : f })}
                    aria-pressed={p.formulation === f}
                    className={`rounded-md border px-2 py-1 text-[14px] ${
                      p.formulation === f ? "border-brand bg-brand text-brand-ink" : "border-line"
                    }`}
                  >
                    {f === "other" ? "ផ្សេង" : f}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {log.products.length < 6 && (
            <button
              type="button"
              onClick={() => set({ products: [...log.products, { name: "", dose: "", formulation: "" }] })}
              className="km h-12 rounded-xl border border-dashed border-brand text-[15px] text-brand"
            >
              + បន្ថែមថ្នាំ · Add product
            </button>
          )}
        </div>
      </Block>

      <Block km="ថ្លៃថ្នាំលើកនេះ (មិនចាំបាច់)" en="Cost of this spray (optional)">
        <input
          id="spray-cost"
          type="number"
          inputMode="numeric"
          min={0}
          value={log.cost || ""}
          onChange={(e) => set({ cost: Math.max(0, Number(e.target.value) || 0) || null })}
          placeholder="៛"
          className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] tabular-nums outline-none focus:border-brand"
        />
        <p className="mt-1 text-[14px] text-muted">
          <span className="km">ប្រាក់រៀល សម្រាប់ថ្នាំ ឬជីក្នុងធុង។ បូកចូលចំណាយរដូវ ក្នុង «ផល និងលក់»។</span> Riel for the products
          in the tank. Added to season costs in Harvest.
        </p>
      </Block>

      <Block km="កន្លែង ឬចម្ការណា? (មិនចាំបាច់)" en="Which block? (optional)">
        <input
          id="spray-area"
          value={log.area}
          onChange={(e) => set({ area: e.target.value })}
          placeholder="ឧ. ចម្ការខាងជើង"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Block>

      <Block km="កំណត់ចំណាំ (មិនចាំបាច់)" en="Notes (optional)">
        <textarea
          id="spray-notes"
          value={log.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          placeholder="ឧ. ឃើញមូសតែច្រើននៅជួរខាងកើត"
          className="km w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[16px] outline-none focus:border-brand"
        />
      </Block>

      <Block km="បាញ់ម្ដងទៀតនៅពេលណា?" en="When is the next spray?">
        {suggestion && (
          <div className="mb-3 rounded-xl bg-brand-soft p-3">
            <button type="button" onClick={() => setShowRule(!showRule)} className="w-full text-left" aria-expanded={showRule}>
              <span className="km block text-[15px]">សៀវភៅ៖ {suggestion.km}</span>
              <span className="block text-[14px] text-muted">Book: {suggestion.en}</span>
            </button>
            {showRule && (
              <div className="mt-2 border-t border-brand/20 pt-2">
                <EntryBody id={suggestion.entry} />
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {dayChoices.map((d) => (
            <Chip
              key={d}
              active={nextMode === "suggested" && days === d}
              onClick={() => {
                setNextMode("suggested");
                setPickedDays(d);
              }}
            >
              +{kh(d)} ថ្ងៃ
            </Chip>
          ))}
          <Chip active={nextMode === "custom"} onClick={() => setNextMode("custom")}>
            ជ្រើសថ្ងៃ
          </Chip>
          <Chip active={nextMode === "none"} onClick={() => setNextMode("none")}>
            មិនបាញ់ទៀត
          </Chip>
        </div>
        {nextMode === "custom" && (
          <input
            id="spray-next-date"
            type="date"
            min={log.date}
            value={log.nextDate ?? ""}
            onChange={(e) => set({ nextDate: e.target.value || null })}
            className="mt-2 h-12 rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
          />
        )}
        {nextDate && (
          <p className="km mt-2 text-[15px] text-brand">
            រំលឹក៖ {formatDate(nextDate).km} <span className="text-[14px] text-muted">· Reminder {formatDate(nextDate).en}</span>
          </p>
        )}
        {!nextChosen && (
          <p className="km mt-2 text-[15px] text-warn">
            ជ្រើសថ្ងៃបាញ់ម្ដងទៀត ឬចុច «មិនបាញ់ទៀត»។{" "}
            <span className="text-[14px]">· Pick when to spray again, or "no more", to save.</span>
          </p>
        )}
      </Block>

      {checks.length > 0 && (
        <div className="flex flex-col gap-2">
          {checks.map((c) => (
            <p key={c.entry} className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-[15px] text-warn">
              <AlertIcon size={16} className="mt-1 shrink-0" />
              <span>
                <span className="km block">{c.km}</span>
                <span className="block opacity-85">{c.en}</span>
              </span>
            </p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSave}
        className="km h-12 rounded-xl bg-brand text-[16px] font-medium text-brand-ink disabled:opacity-40"
      >
        រក្សាទុក · Save
      </button>

      {onDelete &&
        (confirmDelete ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-danger/30 px-3 py-2.5">
            <span className="km text-[15px] text-danger">លុបកំណត់ត្រានេះ? · Delete this record?</span>
            <span className="flex gap-2">
              <button type="button" onClick={onDelete} className="km rounded-lg bg-danger px-3 py-1.5 text-[15px] text-white">
                លុប
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="km rounded-lg border border-line px-3 py-1.5 text-[15px]">
                ទេ
              </button>
            </span>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="km text-[15px] text-danger underline">
            លុបកំណត់ត្រានេះ · Delete this record
          </button>
        ))}
    </form>
  );
}

function Block({ km, en, children }: { km: string; en: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="km text-[15px] font-semibold">{km}</h4>
      <p className="mb-2 text-[14px] text-muted">{en}</p>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`km rounded-full border px-3.5 py-2 text-[15px] ${
        active ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

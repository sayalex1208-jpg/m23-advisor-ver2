import { useState } from "react";
import { NUT_STATES, riel, usd, type NutState, type Sale } from "../lib/harvests";
import { formatDate } from "../lib/sprays";

export function HarvestForm({
  initial,
  buyers,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Sale;
  buyers: string[]; // names used before, for quick entry
  onSave: (sale: Sale) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [sale, setSale] = useState<Sale>(initial);
  // Number fields keep the typed text, so "1." or "" don't jump while typing.
  const [kg, setKg] = useState(initial.kg ? String(initial.kg) : "");
  const [price, setPrice] = useState(initial.pricePerKg ? String(initial.pricePerKg) : "");
  const [count, setCount] = useState(initial.nutCount ? String(initial.nutCount) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Sale>) => setSale((s) => ({ ...s, ...patch }));

  const kgNum = Number(kg);
  const priceNum = Number(price.replace(/,/g, ""));
  const canSave = kgNum > 0 && priceNum > 0;
  const total = canSave ? kgNum * priceNum : 0;

  return (
    <form
      className="flex flex-col gap-5 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({
          ...sale,
          kg: kgNum,
          pricePerKg: priceNum,
          nutCount: Number(count) > 0 ? Number(count) : null,
          buyer: sale.buyer.trim(),
          notes: sale.notes.trim(),
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="km text-[18px] font-semibold">{onDelete ? "កែការលក់" : "កត់ត្រាការលក់"}</h3>
        <button type="button" onClick={onCancel} className="km text-[15px] text-muted underline">
          បោះបង់ · Cancel
        </button>
      </div>

      <Block km="ថ្ងៃលក់" en="Date sold">
        <input
          id="sale-date"
          type="date"
          value={sale.date}
          onChange={(e) => e.target.value && set({ date: e.target.value })}
          className="h-12 rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Block>

      <Block km="គ្រាប់ស្ងួត ឬស្រស់?" en="Dry or fresh nuts?">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NUT_STATES) as NutState[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ state: s })}
              aria-pressed={sale.state === s}
              className={`km rounded-full border px-3.5 py-2 text-[15px] ${
                sale.state === s ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface"
              }`}
            >
              {NUT_STATES[s].km} · {NUT_STATES[s].en}
            </button>
          ))}
        </div>
      </Block>

      <div className="grid grid-cols-2 gap-3">
        <Block km="ទម្ងន់ (គ.ក្រ)" en="Weight (kg)">
          <input
            id="sale-kg"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="ឧ. 500"
            className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] tabular-nums outline-none focus:border-brand"
          />
        </Block>
        <Block km="តម្លៃ (៛/គ.ក្រ)" en="Price (riel/kg)">
          <input
            id="sale-price"
            type="number"
            inputMode="numeric"
            min={0}
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ឧ. 6000"
            className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] tabular-nums outline-none focus:border-brand"
          />
        </Block>
      </div>

      {canSave && (
        <p className="rounded-xl bg-brand-soft px-3.5 py-2.5">
          <span className="km block text-[15px] font-semibold text-brand">សរុប {riel(total).km}</span>
          <span className="block text-[14px] text-muted tabular-nums">
            Total {riel(total).en} {usd(total)}
          </span>
        </p>
      )}

      <Block km="អ្នកទិញ (មិនចាំបាច់)" en="Buyer (optional)">
        <datalist id="sale-buyers">
          {buyers.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <input
          id="sale-buyer"
          list="sale-buyers"
          value={sale.buyer}
          onChange={(e) => set({ buyer: e.target.value })}
          placeholder="ឧ. ឈ្មួញភូមិ ឬរោងចក្រ"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
        <p className="mt-1.5 text-[14px] text-muted">
          <span className="km">ធនាគារ និងអ្នកទិញ ជឿជាងនៅពេលមានឈ្មោះអ្នកទិញ។</span> Banks and buyers trust records with a buyer
          named.
        </p>
      </Block>

      <Block km="ចំនួនគ្រាប់ក្នុង ១ គ.ក្រ (មិនចាំបាច់)" en="Nuts per kg (optional)">
        <input
          id="sale-count"
          type="number"
          inputMode="numeric"
          min={0}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          placeholder="ឧ. 160"
          className="h-12 w-32 rounded-xl border border-line bg-surface px-3.5 text-[16px] tabular-nums outline-none focus:border-brand"
        />
        <p className="mt-1.5 text-[14px] text-muted">
          <span className="km">គ្រាប់តិចក្នុង ១ គ.ក្រ = គ្រាប់ធំ តម្លៃល្អ។</span> Fewer nuts per kg means bigger nuts.
        </p>
      </Block>

      <Block km="កំណត់ចំណាំ (មិនចាំបាច់)" en="Notes (optional)">
        <textarea
          id="sale-notes"
          value={sale.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          placeholder="ឧ. ទទួលវិក្កយបត្រ"
          className="km w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[16px] outline-none focus:border-brand"
        />
      </Block>

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
            <span className="km text-[15px] text-danger">លុបការលក់ {formatDate(sale.date).km}? · Delete?</span>
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
    <section className="min-w-0">
      <h4 className="km text-[15px] font-semibold">{km}</h4>
      <p className="mb-2 text-[14px] text-muted">{en}</p>
      {children}
    </section>
  );
}

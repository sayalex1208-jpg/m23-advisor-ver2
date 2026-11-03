import { useState } from "react";
import { COST_KINDS, NUT_STATES, riel, usd, type CostKind, type Sale, type SeasonSummary, type useHarvests } from "../lib/harvests";
import { count, toKhmerDigits as kh } from "../lib/kb";
import { formatDate, todayIso } from "../lib/sprays";
import { HarvestForm } from "./HarvestForm";

type Harvests = ReturnType<typeof useHarvests>;

const newSale = (last?: Sale): Sale => ({
  id: crypto.randomUUID(),
  date: todayIso(),
  kg: 0,
  pricePerKg: last?.pricePerKg ?? 0,
  buyer: last?.buyer ?? "",
  state: last?.state ?? "dry",
  nutCount: null,
  notes: "",
});

export function HarvestLog({ harvests, onPassport }: { harvests: Harvests; onPassport: () => void }) {
  const [editing, setEditing] = useState<{ sale: Sale; isNew: boolean } | null>(null);
  const buyers = [...new Set(harvests.sales.map((s) => s.buyer).filter(Boolean))];

  if (editing) {
    return (
      <HarvestForm
        key={editing.sale.id}
        initial={editing.sale}
        buyers={buyers}
        onCancel={() => setEditing(null)}
        onSave={(sale) => {
          harvests.save(sale);
          setEditing(null);
        }}
        onDelete={
          editing.isNew
            ? undefined
            : () => {
                harvests.remove(editing.sale.id);
                setEditing(null);
              }
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={onPassport}
        className="flex items-center gap-3 rounded-2xl bg-brand px-4 py-3.5 text-left text-brand-ink"
      >
        <span className="min-w-0 flex-1">
          <span className="km block text-[16px] font-semibold">ប័ណ្ណកំណត់ត្រាចម្ការ · Farm passport</span>
          <span className="block text-[14px] opacity-85">Your yield and income record, to show a bank or buyer</span>
        </span>
        <span aria-hidden="true" className="text-[20px]">›</span>
      </button>

      <button
        onClick={() => setEditing({ sale: newSale(harvests.sales[0]), isNew: true })}
        className="km h-12 rounded-xl border border-brand bg-surface text-[16px] font-medium text-brand"
      >
        + កត់ត្រាការលក់គ្រាប់ · Log a sale
      </button>

      {harvests.sales.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-4">
          <p className="km text-[15px]">
            កត់ត្រារាល់ពេលលក់គ្រាប់ស្វាយចន្ទី៖ ទម្ងន់ តម្លៃ និងអ្នកទិញ។ កំណត់ត្រា ២-៣ រដូវ ជួយពេលខ្ចីប្រាក់ពីធនាគារ ឬចុះកិច្ចសន្យាជាមួយអ្នកទិញ។
          </p>
          <p className="mt-1 text-[15px] text-muted">
            Log every sale of cashew nuts: weight, price and buyer. Two or three seasons of records help when you borrow from a
            bank or sign a contract with a buyer.
          </p>
        </div>
      )}

      {harvests.seasons
        .filter((s) => s.sales.length > 0 || s.totalCosts > 0 || s.season === new Date().getFullYear())
        .map((s) => (
          <SeasonCard
            key={s.season}
            summary={s}
            onEdit={(sale) => setEditing({ sale, isNew: false })}
            onCost={(kind, value) => harvests.setCosts(s.season, { [kind]: value })}
          />
        ))}
    </div>
  );
}

function SeasonCard({
  summary: s,
  onEdit,
  onCost,
}: {
  summary: SeasonSummary;
  onEdit: (sale: Sale) => void;
  onCost: (kind: CostKind, value: number) => void;
}) {
  const [costsOpen, setCostsOpen] = useState(false);

  return (
    <section>
      <h3 className="km text-[17px] font-semibold">រដូវ {kh(s.season)}</h3>
      <p className="mb-2.5 text-[14px] text-muted">{s.season} season</p>

      {s.sales.length > 0 && (
        <dl className="grid grid-cols-2 gap-2">
          <Stat km="ផលសរុប" en="Harvest" value={`${kh(Math.round(s.kg).toLocaleString("en"))} គ.ក្រ`} sub={`${Math.round(s.kg).toLocaleString("en")} kg`} />
          <Stat km="ចំណូល" en="Income" value={riel(s.income).km} sub={usd(s.income)} />
          <Stat
            km="តម្លៃមធ្យម"
            en="Average price"
            value={`${riel(s.avgPrice).km}/គ.ក្រ`}
            sub={`${riel(s.avgPrice).en}/kg`}
          />
          {s.kgPerHa !== null ? (
            <Stat km="ផលក្នុង ១ ហិកតា" en="Per hectare" value={`${kh(Math.round(s.kgPerHa).toLocaleString("en"))} គ.ក្រ`} sub={`${Math.round(s.kgPerHa).toLocaleString("en")} kg/ha`} />
          ) : (
            <Stat km="ចំនួនលក់" en="Sales" value={kh(s.sales.length)} sub={count(s.sales.length, "sale")} />
          )}
          {s.totalCosts > 0 && (
            <Stat
              km="ប្រាក់ចំណេញ"
              en="Profit"
              value={riel(s.profit).km}
              sub={`after ${riel(s.totalCosts).en} costs`}
              wide
              tone={s.profit < 0 ? "danger" : "brand"}
            />
          )}
        </dl>
      )}

      <div className="mt-2 rounded-xl border border-line bg-surface">
        <button
          onClick={() => setCostsOpen(!costsOpen)}
          aria-expanded={costsOpen}
          className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
        >
          <span>
            <span className="km block text-[15px] font-medium">ចំណាយរដូវនេះ</span>
            <span className="block text-[14px] text-muted">
              Season costs · {s.totalCosts > 0 ? riel(s.totalCosts).en : "not added yet"}
            </span>
          </span>
          <span className="km text-[15px] text-brand">{costsOpen ? "បិទ" : "បញ្ចូល"}</span>
        </button>
        {costsOpen && (
          <div className="grid grid-cols-2 gap-3 border-t border-line px-3.5 py-3">
            {s.sprayCosts.fertilizer + s.sprayCosts.pesticide > 0 && (
              <p className="col-span-2 rounded-lg bg-brand-soft px-3 py-2 text-[15px]">
                <span className="km block">
                  ពីការបាញ់ថ្នាំ៖ {riel(s.sprayCosts.fertilizer + s.sprayCosts.pesticide).km}
                </span>
                <span className="block text-[14px] text-muted">
                  From the spray journal (sprays Jun {s.season - 1} to May {s.season}):{" "}
                  {riel(s.sprayCosts.fertilizer + s.sprayCosts.pesticide).en}, added automatically
                </span>
              </p>
            )}
            {(Object.keys(COST_KINDS) as CostKind[]).map((k) => (
              <label key={k} className="min-w-0">
                <span className="km block text-[15px] font-medium">
                  {COST_KINDS[k].km} <span className="font-normal text-muted">· {COST_KINDS[k].en}</span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={s.costs[k] || ""}
                  onChange={(e) => onCost(k, Math.max(0, Number(e.target.value) || 0))}
                  placeholder="៛"
                  className="mt-1 h-12 w-full rounded-lg border border-line bg-bg px-3 text-[16px] tabular-nums outline-none focus:border-brand"
                />
              </label>
            ))}
            <p className="col-span-2 text-[14px] text-muted">
              <span className="km">ប្រាក់រៀល សរុបសម្រាប់រដូវ ក្រៅពីការបាញ់ដែលបានកត់ថ្លៃរួច។</span> Riel, total for the season, not
              counting sprays already logged with a cost.
            </p>
          </div>
        )}
      </div>

      {s.sales.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {s.sales.map((sale) => (
            <li key={sale.id}>
              <button onClick={() => onEdit(sale)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-left">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="km text-[15px] text-muted">{formatDate(sale.date).km}</span>
                  <span className="km rounded-full bg-brand-soft px-2 py-0.5 text-[13px] text-brand">{NUT_STATES[sale.state].km}</span>
                </span>
                <span className="km mt-1 block text-[15px] font-medium tabular-nums">
                  {kh(sale.kg.toLocaleString("en"))} គ.ក្រ × {riel(sale.pricePerKg).km} = {riel(sale.kg * sale.pricePerKg).km}
                </span>
                <span className="block text-[14px] text-muted tabular-nums">
                  {sale.kg.toLocaleString("en")} kg × {sale.pricePerKg.toLocaleString("en")} riel
                  {sale.buyer && ` · ${sale.buyer}`}
                  {sale.nutCount && ` · ${sale.nutCount} nuts/kg`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  km,
  en,
  value,
  sub,
  wide,
  tone,
}: {
  km: string;
  en: string;
  value: string;
  sub: string;
  wide?: boolean;
  tone?: "brand" | "danger";
}) {
  return (
    <div className={`min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[13px] text-muted">
        <span className="km">{km}</span> · {en}
      </dt>
      <dd className={`km text-[16px] font-semibold tabular-nums ${tone === "danger" ? "text-danger" : tone === "brand" ? "text-brand" : ""}`}>
        {value}
      </dd>
      <dd className="truncate text-[13px] text-muted tabular-nums">{sub}</dd>
    </div>
  );
}

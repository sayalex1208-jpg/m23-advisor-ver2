import { useMemo, useState } from "react";
import { ENTRIES, pageLabel, toKhmerDigits, type KbEntry } from "../lib/kb";
import { EntryBody } from "./AnswerParts";
import { ChatIcon } from "./icons";

// "B. បណ្ដុះកូន និងផ្សាំ · Nursery & Grafting" -> {key: "B", km, en}
type Section = { key: string; km: string; en: string; entries: KbEntry[] };

const SECTIONS: Section[] = (() => {
  const byKey = new Map<string, Section>();
  for (const e of ENTRIES) {
    const label = e.section ?? "Z. ផ្សេងៗ · Other";
    const key = label.slice(0, 1);
    if (!byKey.has(key)) {
      const [km, en] = label.slice(3).split(" · ");
      byKey.set(key, { key, km, en, entries: [] });
    }
    byKey.get(key)!.entries.push(e);
  }
  // Answers with a book page first, older v1 entries after.
  const hasPage = (e: KbEntry) => (pageLabel(e.id) ? 0 : 1);
  for (const s of byKey.values()) s.entries.sort((a, b) => hasPage(a) - hasPage(b) || a.id - b.id);
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
})();

// Khmer has no spaces between words and phones insert zero-width spaces, so
// search compares text with all spacing removed.
const squash = (s: string) => s.toLowerCase().replace(/[\s​‌‍]+/g, "");
const SEARCH_TEXT = new Map(
  ENTRIES.map((e) => [e.id, squash([e.q_km, e.q_en, ...e.variants_km, e.a_km, e.a_en].join(" "))]),
);

export function GuideScreen({ onAsk }: { onAsk: (question: string) => void }) {
  const [query, setQuery] = useState("");
  const [sectionKey, setSectionKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = squash(query);
    return SECTIONS.filter((s) => !sectionKey || s.key === sectionKey)
      .map((s) => ({ ...s, entries: q ? s.entries.filter((e) => SEARCH_TEXT.get(e.id)!.includes(q)) : s.entries }))
      .filter((s) => s.entries.length > 0);
  }, [query, sectionKey]);
  const count = visible.reduce((n, s) => n + s.entries.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line bg-bg px-4 pb-3 pt-3">
        <label htmlFor="guide-search" className="sr-only">
          ស្វែងរក · Search
        </label>
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ស្វែងរក ឧ. មូសតែ, ជី, Thiourea…"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none placeholder:text-muted focus:border-brand"
        />
        <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          <Chip active={!sectionKey} onClick={() => setSectionKey(null)} label="ទាំងអស់" />
          {SECTIONS.map((s) => (
            <Chip key={s.key} active={sectionKey === s.key} onClick={() => setSectionKey(s.key)} label={s.km} />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <p className="km pt-3 text-[13px] text-muted">
          {toKhmerDigits(count)} ចម្លើយពីសៀវភៅ · {count} answers from the book
        </p>

        {visible.length === 0 && (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-center">
            <p className="km text-[15px]">រកមិនឃើញក្នុងសៀវភៅទេ។</p>
            <p className="text-[13px] text-muted">Nothing in the book matches.</p>
            {query.trim() && (
              <button
                onClick={() => onAsk(query.trim())}
                className="km mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[15px] text-brand-ink"
              >
                <ChatIcon size={18} /> សួរ AI · Ask the AI
              </button>
            )}
          </div>
        )}

        {visible.map((s) => (
          <section key={s.key} className="mt-4">
            <h2 className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2">
              <span className="km block text-[16px] font-semibold">{s.km}</span>
              <span className="block text-[12px] text-muted">{s.en}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {s.entries.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  open={openId === e.id}
                  onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                  onAsk={onAsk}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`km shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[14px] ${
        active ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function EntryCard({
  entry: e,
  open,
  onToggle,
  onAsk,
}: {
  entry: KbEntry;
  open: boolean;
  onToggle: () => void;
  onAsk: (question: string) => void;
}) {
  return (
    <article className="rounded-xl border border-line bg-surface">
      <button onClick={onToggle} aria-expanded={open} className="w-full px-3.5 py-3 text-left">
        <span className="km block text-[15px] font-medium">{e.q_km}</span>
        <span className="block text-[12px] text-muted">{e.q_en}</span>
      </button>
      {open && (
        <div className="border-t border-line px-3.5 pb-3.5 pt-3">
          <EntryBody id={e.id} onAsk={onAsk} />
        </div>
      )}
    </article>
  );
}

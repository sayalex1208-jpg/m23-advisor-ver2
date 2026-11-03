import { useState } from "react";
import { SOILS, isSetUp, treeAge, useDoneTasks, type Farm } from "../lib/farm";
import { count, toKhmerDigits as kh } from "../lib/kb";
import { KHMER_MONTHS, currentMonth, seasonFor } from "../lib/season";
import { ageLabel, pestsFor, tasksFor } from "../lib/tasks";
import { EntryBody } from "./AnswerParts";
import { WeatherCard } from "./WeatherCard";
import { dueLabel, productSummary, todayIso, daysBetween, type SprayLog } from "../lib/sprays";
import { AlertIcon, FarmIcon } from "./icons";

export function MonthScreen({
  farm,
  onEditFarm,
  onAsk,
  upcoming,
  onOpenJournal,
}: {
  farm: Farm;
  onEditFarm: () => void;
  onAsk: (question: string) => void;
  upcoming: SprayLog[];
  onOpenJournal: (logId?: string) => void;
}) {
  // Sprays due within the next 2 days, or late.
  const due = upcoming.filter((l) => daysBetween(todayIso(), l.nextDate!) <= 2);
  const now = new Date();
  const month = currentMonth(now);
  const next = (month % 12) + 1;
  const age = treeAge(farm, now);
  const season = seasonFor(month);
  const tasks = tasksFor(month, age);
  const pests = pestsFor(month);
  const [done, toggle] = useDoneTasks(`${now.getFullYear()}-${String(month).padStart(2, "0")}`);
  const [openId, setOpenId] = useState<string | null>(null);
  const doneCount = tasks.filter((t) => done.has(t.id)).length;

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 pt-4">
      <header>
        <p className="text-[14px] font-semibold uppercase tracking-wide text-accent">
          <span className="km normal-case">ខែ{kh(month)}</span> · Month {month}
        </p>
        <h2 className="km text-[26px] font-bold leading-snug">ខែ{KHMER_MONTHS[month - 1]}</h2>
        <p className="km mt-0.5 text-[17px] font-medium">{season.km}</p>
        <p className="text-[15px] text-muted">{season.en}</p>
      </header>

      {isSetUp(farm) ? (
        <button
          onClick={onEditFarm}
          className="mt-3 flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left"
        >
          <FarmIcon size={18} className="shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="km block text-[15px] font-medium">
              {age === 0 ? "ទើបដាំ" : `ដើមអាយុ ${kh(age!)} ឆ្នាំ`} · {SOILS[farm.soil!].km}
            </span>
            <span className="block text-[14px] text-muted">
              {age === 0 ? "Planted this year" : `Trees ${age} years old`} · {SOILS[farm.soil!].en}
            </span>
          </span>
          <span className="km text-[15px] text-brand">កែ · Edit</span>
        </button>
      ) : (
        <div className="mt-3 rounded-xl bg-brand-soft px-3.5 py-3">
          <p className="km text-[15px] font-medium">ប្រាប់អាយុដើម និងប្រភេទដី ដើម្បីឃើញតែការងារសម្រាប់ចម្ការអ្នក។</p>
          <p className="text-[14px] text-muted">Add your tree age and soil to see only the tasks for your farm.</p>
          <button onClick={onEditFarm} className="km mt-2.5 h-11 rounded-lg bg-brand px-4 text-[15px] font-medium text-brand-ink">
            រៀបចំចម្ការ · Set up my farm
          </button>
        </div>
      )}

      {due.length > 0 && (
        <section className="mt-3 overflow-hidden rounded-xl bg-warn-soft pb-3.5">
          <h3 className="km flex items-center gap-2 px-3.5 pt-3 text-[16px] font-semibold text-warn">
            <AlertIcon size={17} className="shrink-0" /> ដល់ពេលបាញ់ថ្នាំ · Spray due
          </h3>
          <ul className="mt-2 flex flex-col gap-2 px-3.5">
            {due.map((log) => {
              const label = dueLabel(log.nextDate!);
              return (
                <li key={log.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{productSummary(log)}</span>
                    <span className={`km block text-[14px] ${label.overdue ? "font-medium text-danger" : "text-muted"}`}>
                      {label.km} · {label.en}
                    </span>
                  </span>
                  <button
                    onClick={() => onOpenJournal(log.id)}
                    className="km h-11 shrink-0 rounded-lg bg-brand px-3.5 text-[15px] font-medium text-brand-ink"
                  >
                    កត់ត្រា · Log
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <WeatherCard farm={farm} month={month} onEditFarm={onEditFarm} onAsk={onAsk} />

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="km text-[19px] font-semibold">ការងារខែនេះ</h3>
          {tasks.length > 0 && (
            <span className="km shrink-0 text-[15px] font-medium text-muted tabular-nums">
              រួច {kh(doneCount)}/{kh(tasks.length)}
            </span>
          )}
        </div>
        <p className="mb-2 text-[14px] text-muted">Tasks this month · tap a task to read how</p>

        {tasks.length > 0 && (
          <div
            className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-bg-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-valuenow={doneCount}
            aria-label="ការងារបានរួច · Tasks completed"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
        )}

        {tasks.length === 0 ? (
          <p className="km rounded-xl border border-line bg-surface p-4 text-[15px]">
            គ្មានការងារធំខែនេះទេ។ <span className="text-muted">No major tasks this month.</span>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => {
              const isDone = done.has(t.id);
              const open = openId === t.id;
              const label = age === null ? ageLabel(t) : null;
              return (
                <li
                  key={t.id}
                  className={`rounded-xl border transition-colors ${
                    isDone ? "border-line/60 bg-bg-sunken" : "border-line bg-surface"
                  }`}
                >
                  <div className="flex items-start gap-1">
                    <button
                      onClick={() => toggle(t.id)}
                      aria-pressed={isDone}
                      aria-label={isDone ? "សម្គាល់ថាមិនទាន់រួច · Mark not done" : "សម្គាល់ថារួច · Mark done"}
                      className="flex h-14 w-12 shrink-0 items-center justify-center"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                          isDone ? "border-brand bg-brand text-brand-ink" : "border-line bg-bg-sunken"
                        }`}
                      >
                        {isDone && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="check-pop"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        )}
                      </span>
                    </button>
                    <button
                      onClick={() => setOpenId(open ? null : t.id)}
                      aria-expanded={open}
                      className="min-w-0 flex-1 py-3 pr-3.5 text-left"
                    >
                      <span
                        className={`km block text-[16px] ${
                          isDone ? "text-muted line-through decoration-muted/50" : "font-medium"
                        }`}
                      >
                        {t.km}
                      </span>
                      <span className={`block text-[14px] ${isDone ? "text-muted/80" : "text-muted"}`}>{t.en}</span>
                      {label && (
                        <span className="km mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[13px] text-brand">
                          {label.km} · {label.en}
                        </span>
                      )}
                    </button>
                  </div>
                  {open && (
                    <div className="border-t border-line px-3.5 pb-3.5 pt-3">
                      <EntryBody id={t.entry} onAsk={onAsk} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pests.length > 0 && (
        <section className="mt-6">
          <h3 className="km text-[19px] font-semibold">ប្រយ័ត្នខែនេះ</h3>
          <p className="mb-2.5 text-[14px] text-muted">Watch out for this month · from the book's pest calendar</p>
          <ul className="flex flex-col gap-2">
            {pests.map((p) => {
              const open = openId === `pest-${p.id}`;
              return (
                <li key={p.id} className="overflow-hidden rounded-xl border border-warn/35 bg-warn-soft/40">
                  <button
                    onClick={() => setOpenId(open ? null : `pest-${p.id}`)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
                  >
                    <AlertIcon size={18} className="shrink-0 text-warn" />
                    <span className="min-w-0">
                      <span className="km block text-[16px] font-medium">{p.km}</span>
                      <span className="block text-[14px] text-muted">{p.en}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-line px-3.5 pb-3.5 pt-3">
                      <EntryBody id={p.entry} onAsk={onAsk} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-dashed border-line p-4">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-muted">
          <span className="km normal-case">ខែក្រោយ</span> · Next month
        </p>
        <p className="km mt-1 text-[16px] font-medium">
          ខែ{KHMER_MONTHS[next - 1]} · {seasonFor(next).km}
        </p>
        <p className="km text-[15px] text-muted">
          ការងារ {kh(tasksFor(next, age).length)} · {count(tasksFor(next, age).length, "task")} · {seasonFor(next).en}
        </p>
      </section>
    </div>
  );
}

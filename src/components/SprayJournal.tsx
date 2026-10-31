import { Fragment, useEffect, useState } from "react";
import type { Farm } from "../lib/farm";
import {
  PEST_TARGETS,
  PURPOSES,
  dueLabel,
  formatDate,
  googleCalendarLink,
  icsFile,
  productSummary,
  todayIso,
  type SprayLog,
  useSprays,
} from "../lib/sprays";
import { riel } from "../lib/harvests";
import { useWeather } from "../lib/weather";
import { SprayForm } from "./SprayForm";
import { CalendarIcon } from "./icons";

type Sprays = ReturnType<typeof useSprays>;

const newLog = (from?: SprayLog): SprayLog => ({
  id: crypto.randomUUID(),
  date: todayIso(),
  purpose: from?.purpose ?? "insect",
  target: from?.target ?? "",
  products: from ? from.products.map((p) => ({ ...p })) : [{ name: "", dose: "", formulation: "" }],
  area: from?.area ?? "",
  notes: "",
  nextDate: null,
  nextDone: false,
});

export function SprayJournal({
  farm,
  sprays,
  repeatOf,
  onRepeatHandled,
}: {
  farm: Farm;
  sprays: Sprays;
  repeatOf: string | null; // a reminder tapped on the home screen
  onRepeatHandled: () => void;
}) {
  // editing: a record being created or changed; followUpOf: the reminder it answers
  const [editing, setEditing] = useState<{ log: SprayLog; isNew: boolean; followUpOf?: string } | null>(null);
  const { forecast } = useWeather(farm.location);
  const rainToday = forecast?.days[0]?.rainChance ?? null;

  useEffect(() => {
    if (!repeatOf) return;
    const original = sprays.logs.find((l) => l.id === repeatOf);
    if (original) setEditing({ log: newLog(original), isNew: true, followUpOf: original.id });
    onRepeatHandled();
  }, [repeatOf, sprays.logs, onRepeatHandled]);

  if (editing) {
    return (
      <SprayForm
        key={editing.log.id}
        initial={editing.log}
        history={sprays.logs}
        rainChanceToday={rainToday}
        onCancel={() => setEditing(null)}
        onSave={(log) => {
          sprays.save(log);
          if (editing.followUpOf) sprays.markNextDone(editing.followUpOf);
          setEditing(null);
        }}
        onDelete={
          editing.isNew
            ? undefined
            : () => {
                sprays.remove(editing.log.id);
                setEditing(null);
              }
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={() => setEditing({ log: newLog(), isNew: true })}
        className="km h-12 rounded-xl bg-brand text-[16px] font-medium text-brand-ink"
      >
        + កត់ត្រាការបាញ់ · Log a spray
      </button>

      {sprays.upcoming.length > 0 && (
        <section>
          <h3 className="km text-[17px] font-semibold">ការបាញ់បន្ទាប់</h3>
          <p className="mb-2.5 text-[12px] text-muted">Next sprays · reminders</p>
          <ul className="flex flex-col gap-2">
            {sprays.upcoming.map((log) => (
              <UpcomingItem
                key={log.id}
                log={log}
                onLog={() => setEditing({ log: newLog(log), isNew: true, followUpOf: log.id })}
                onDismiss={() => sprays.markNextDone(log.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="km text-[17px] font-semibold">ប្រវត្តិការបាញ់</h3>
        <p className="mb-2.5 text-[12px] text-muted">Spray history · tap a record to edit</p>
        {sprays.logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-4">
            <p className="km text-[15px]">មិនទាន់មានកំណត់ត្រាទេ។ កត់ត្រារាល់ពេលបាញ់ ដើម្បីដឹងថាបាញ់អ្វី ពេលណា ហើយត្រូវបាញ់ម្ដងទៀតពេលណា។</p>
            <p className="mt-1 text-[13px] text-muted">
              No records yet. Log each spray to keep track of what you used, when, and when the next spray is due.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sprays.logs.map((log) => (
              <li key={log.id}>
                <button
                  onClick={() => setEditing({ log, isNew: false })}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-left"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="km text-[13px] text-muted">{formatDate(log.date).km}</span>
                    <span className="km rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                      {PURPOSES[log.purpose].km}
                      {log.target && ` · ${PEST_TARGETS.find((t) => t.id === log.target)?.km ?? log.target}`}
                    </span>
                  </span>
                  <span className="mt-1 block text-[15px] font-medium">
                    {log.products.some((p) => p.name.trim())
                      ? log.products
                          .filter((p) => p.name.trim())
                          .map((p, i) => (
                            <Fragment key={i}>
                              {i > 0 && " + "}
                              {p.name.trim()}
                              {p.dose && <span className="km text-[13px] font-normal text-muted"> {p.dose}</span>}
                            </Fragment>
                          ))
                      : productSummary(log)}
                  </span>
                  {log.area && <span className="km block text-[13px] text-muted">{log.area}</span>}
                  {!!log.cost && <span className="km block text-[13px] text-muted tabular-nums">{riel(log.cost).km}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function UpcomingItem({ log, onLog, onDismiss }: { log: SprayLog; onLog: () => void; onDismiss: () => void }) {
  const due = dueLabel(log.nextDate!);
  const date = formatDate(log.nextDate!);

  function downloadIcs() {
    const url = URL.createObjectURL(icsFile(log));
    const a = document.createElement("a");
    a.href = url;
    a.download = `spray-${log.nextDate}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <li className={`rounded-xl border p-3.5 ${due.soon ? "border-warn bg-warn-soft" : "border-line bg-surface"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">{productSummary(log)}</p>
          <p className="km text-[13px] text-muted">
            {date.km} · {date.en}
          </p>
        </div>
        <span
          className={`km shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
            due.overdue ? "bg-danger text-white" : due.soon ? "bg-warn text-white" : "bg-brand-soft text-brand"
          }`}
        >
          {due.km}
        </span>
      </div>
      <p className="km mt-1 text-[12px] text-muted">
        បាញ់មុន {formatDate(log.date).km} · last sprayed {formatDate(log.date).en}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onLog} className="km h-10 rounded-lg bg-brand px-3.5 text-[14px] text-brand-ink">
          បាញ់រួច កត់ត្រា · Log it
        </button>
        <a
          href={googleCalendarLink(log)}
          target="_blank"
          rel="noreferrer"
          className="km inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[14px]"
        >
          <CalendarIcon size={16} /> Google Calendar
        </a>
        <button onClick={downloadIcs} className="km h-10 rounded-lg border border-line bg-surface px-3 text-[14px]">
          iPhone
        </button>
        <button onClick={onDismiss} className="km h-10 px-2 text-[13px] text-muted underline">
          មិនបាញ់ · Skip
        </button>
      </div>
      {due.overdue && (
        <p className="km mt-2 text-[12px] text-danger">
          ការបាញ់យឺត ធ្វើឲ្យសត្វល្អិតកើតឡើងវិញ។ · Late follow-up sprays let pests come back.
        </p>
      )}
    </li>
  );
}

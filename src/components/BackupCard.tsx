import { useRef, useState } from "react";
import { lastBackup, readBackup, recordCounts, saveBackup, type BackupSummary } from "../lib/backup";
import { isDemo } from "../lib/demo";
import { count, toKhmerDigits as kh } from "../lib/kb";
import { daysBetween, formatDate, todayIso } from "../lib/sprays";

const REMIND_AFTER_DAYS = 30;

/** Records on the phone, and no backup in the last month. */
export function needsBackup(): boolean {
  const { sprays, sales } = recordCounts();
  if (sprays + sales === 0 || isDemo()) return false;
  const last = lastBackup();
  return last === null || daysBetween(last, todayIso()) > REMIND_AFTER_DAYS;
}

export function BackupCard() {
  const [last, setLast] = useState(lastBackup);
  const [status, setStatus] = useState<"downloaded" | "bad_file" | null>(null);
  const [pending, setPending] = useState<{ summary: BackupSummary; apply: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isDemo()) {
    return (
      <section id="backup" className="mt-6 rounded-2xl border border-line bg-surface p-4 text-[13px] text-muted">
        <span className="km">ការបម្រុងទុក មិនប្រើក្នុងការបង្ហាញទេ។</span> Backup is off in the demo.
      </section>
    );
  }

  async function backup() {
    setStatus(null);
    const result = await saveBackup();
    if (result !== "cancelled") setLast(lastBackup());
    if (result === "downloaded") setStatus("downloaded");
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    const read = await readBackup(file);
    if (read) setPending(read);
    else setStatus("bad_file");
  }

  const here = recordCounts();
  const overdue = needsBackup();

  return (
    <section id="backup" className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <h3 className="km text-[16px] font-semibold">បម្រុងទុកកំណត់ត្រា</h3>
      <p className="text-[12px] text-muted">Back up your records</p>
      <p className="km mt-2 text-[14px]">
        បើបាត់ ឬខូចទូរស័ព្ទ កំណត់ត្រាបាញ់ថ្នាំ និងការលក់នឹងបាត់អស់។ រក្សាទុកឯកសារបម្រុង ក្នុង Telegram (Saved Messages) ឬកន្លែងផ្សេង។
      </p>
      <p className="mt-1 text-[12px] text-muted">
        If this phone is lost or broken, your spray and sales records go with it. Save a backup file to Telegram (Saved
        Messages) or anywhere safe, and restore it on a new phone.
      </p>
      <p className={`km mt-2 text-[13px] ${overdue ? "text-warn" : "text-muted"}`}>
        {last ? `បម្រុងចុងក្រោយ ${formatDate(last).km}` : "មិនទាន់បានបម្រុងទុកទេ"}
        <span className="text-[12px]"> · {last ? `Last backup ${formatDate(last).en}` : "Never backed up"}</span>
      </p>

      <button onClick={backup} className="km mt-3 h-12 w-full rounded-xl bg-brand text-[15px] font-medium text-brand-ink">
        រក្សាទុកឯកសារបម្រុង · Save a backup
      </button>
      {status === "downloaded" && (
        <p className="km mt-2 text-[13px] text-brand">
          បានទាញយកក្នុង Downloads។ ផ្ញើវាទៅ Telegram ដើម្បីកុំឲ្យបាត់។{" "}
          <span className="text-[12px] text-muted">· Saved to Downloads. Send it to Telegram so it isn't lost with the phone.</span>
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {pending ? (
        <div className="mt-3 rounded-xl border border-warn/40 bg-warn-soft p-3">
          <p className="km text-[14px]">
            ឯកសារបម្រុងថ្ងៃ {formatDate(pending.summary.savedAt).km}៖ បាញ់ថ្នាំ {kh(pending.summary.sprays)} ដង លក់ {kh(pending.summary.sales)} ដង។
            វានឹងជំនួសកំណត់ត្រាក្នុងទូរស័ព្ទនេះ (បាញ់ {kh(here.sprays)} លក់ {kh(here.sales)})។
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Backup from {formatDate(pending.summary.savedAt).en}: {count(pending.summary.sprays, "spray")},{" "}
            {count(pending.summary.sales, "sale")}. It replaces the records on this phone ({count(here.sprays, "spray")},{" "}
            {count(here.sales, "sale")}).
          </p>
          <div className="mt-2.5 flex gap-2">
            <button onClick={pending.apply} className="km h-11 flex-1 rounded-lg bg-warn text-[14px] text-white">
              ស្ដារ · Restore
            </button>
            <button onClick={() => setPending(null)} className="km h-11 flex-1 rounded-lg border border-line bg-surface text-[14px]">
              បោះបង់ · Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="km mt-2 h-11 w-full rounded-xl border border-line text-[14px]">
          ស្ដារពីឯកសារបម្រុង · Restore from a backup
        </button>
      )}
      {status === "bad_file" && (
        <p className="km mt-2 text-[13px] text-danger">
          ឯកសារនេះ មិនមែនជាឯកសារបម្រុងរបស់កម្មវិធីនេះទេ។ <span className="text-[12px]">· This isn't a backup file from this app.</span>
        </p>
      )}
    </section>
  );
}

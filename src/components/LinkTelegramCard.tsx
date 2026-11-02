import { useState } from "react";
import { linkTelegram, type LinkErrorCode } from "../lib/account";

const ERRORS: Record<LinkErrorCode, { km: string; en: string }> = {
  bad_code: {
    km: "លេខកូដត្រូវមាន ៤ លេខ។ ឧ. 1234",
    en: "The code needs 4 digits. Example: 1234",
  },
  not_found: {
    km: "រកមិនឃើញលេខកូដនេះទេ។ សូមពិនិត្យម្តងទៀត ឬចុះឈ្មោះម្តងទៀតនៅគេហទំព័រ។",
    en: "No code matches. Check it again, or register on the web app first.",
  },
  expired: {
    km: "លេខកូដបានផុតកំណត់។ សូមចុះឈ្មោះម្តងទៀតដើម្បីបានលេខកូដថ្មី។",
    en: "That code has expired. Register again to get a fresh one.",
  },
  self: {
    km: "លេខកូដនេះជារបស់អ្នកឯង។ សូមប្រើលេខកូដពី Telegram។",
    en: "That is your own code. Use the code shown in Telegram.",
  },
  conflict: {
    km: "លេខកូដនេះជាការចុះឈ្មោះមួយផ្សេងទៀត។ សូមសួរម្នាក់ការងារយើង។",
    en: "That code belongs to a different registration. Please contact our team.",
  },
  not_registered: {
    km: "រកមិនឃើញការចុះឈ្មោះជាមួយលេខទូរស័ព្ទនេះទេ។",
    en: "We could not find a registration for this phone number.",
  },
  offline: {
    km: "មិនមានអ៊ីនធឺណិត។ សូមសាកម្ដងទៀតពេលមានសេវា។",
    en: "No internet. Try again when you have signal.",
  },
  unavailable: {
    km: "មិនអាចភ្ជាក់បានទេ។ សូមសាកម្ដងទៀតបន្តិចទៀត។",
    en: "Could not link right now. Please try again shortly.",
  },
};

/**
 * Lets a farmer connect their web registration to their Telegram account
 * with the 4-digit code the bot shows them.
 */
export function LinkTelegramCard({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LinkErrorCode | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <section className="mb-6 rounded-2xl bg-brand-soft p-4">
        <p className="km text-[15px] font-medium text-brand">✅ បានភ្ជាក់ជាមួយ Telegram រួចហើយ</p>
        <p className="text-[12px] text-muted">
          Linked to Telegram. Your farm records now show in both places.
        </p>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
        <p className="km text-[15px] font-medium">🔗 ភ្ជាក់ជាមួយ Telegram</p>
        <p className="text-[12px] text-muted">
          <span className="km">
            បើក Telegram ហើយចុច /start ដើម្បីបានលេខ ៤ ដង រួចយកលេខនោះមកដាក់នៅទីនេះ។
          </span>{" "}
          Open Telegram, tap /start, and enter the 4-digit code it gives you.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="km mt-3 h-11 rounded-xl bg-brand px-4 text-[15px] text-brand-ink"
        >
          ភ្ជាក់ · Link Telegram
        </button>
      </section>
    );
  }

  const ready = /^\d{4}$/.test(code) && !busy;

  return (
    <section className="mb-6 rounded-2xl border border-line bg-surface p-4">
      <p className="km text-[15px] font-medium">🔗 ភ្ជាក់ជាមួយ Telegram</p>
      <p className="text-[12px] text-muted">
        <span className="km">បញ្ចូលលេខកូដ ៤ ដងពី Telegram។</span> Enter the 4-digit code from Telegram.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="tg-link-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="1234"
          aria-label="Telegram linking code"
          className="h-12 w-28 rounded-xl border border-line bg-bg px-3.5 text-center text-[20px] tracking-[0.3em] tabular-nums outline-none focus:border-brand"
        />
        <button
          onClick={async () => {
            if (!ready) return;
            setBusy(true);
            setError(null);
            const result = await linkTelegram(phone, code);
            setBusy(false);
            if (result.ok) return setDone(true);
            setError(result.code);
          }}
          disabled={!ready}
          className="km h-12 flex-1 rounded-xl bg-brand text-[15px] font-medium text-brand-ink disabled:opacity-40"
        >
          {busy ? "កំពុងភ្ជាក់…" : "ភ្ជាក់ · Link"}
        </button>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
          <span className="km block">{ERRORS[error].km}</span>
          <span className="block opacity-85">{ERRORS[error].en}</span>
        </p>
      )}

      <button onClick={() => setOpen(false)} className="km mt-2 text-[13px] text-muted underline">
        បិទ · Close
      </button>
    </section>
  );
}

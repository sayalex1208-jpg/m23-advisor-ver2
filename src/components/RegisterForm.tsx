import { useState } from "react";
import { register, type Account } from "../lib/account";

const ERRORS = {
  bad_phone: { km: "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។ ឧទាហរណ៍៖ 012 345 678", en: "That phone number doesn't look right. Example: 012 345 678" },
  offline: { km: "មិនមានអ៊ីនធឺណិត។ សូមសាកម្ដងទៀតពេលមានសេវា។", en: "No internet. Try again when you have signal." },
  unavailable: { km: "ចុះឈ្មោះមិនបានទេ។ សូមសាកម្ដងទៀតបន្តិចទៀត។", en: "Couldn't register right now. Please try again shortly." },
};

export function RegisterForm({
  initialVillage = "",
  onDone,
  onCancel,
  cancelLabel,
}: {
  initialVillage?: string;
  onDone: (account: Extract<Account, { status: "registered" }>, linkingCode: string | null) => void;
  onCancel: () => void;
  cancelLabel: { km: string; en: string };
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState(initialVillage);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof ERRORS | null>(null);

  const ready = name.trim() !== "" && phone.trim() !== "" && consent && !busy;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError(null);
        const result = await register(name.trim(), phone, village.trim());
        setBusy(false);
        if (!result.ok) return setError(result.code);
        onDone(
          { status: "registered", name: name.trim(), phone: result.phone, village: village.trim(), at: new Date().toISOString() },
          result.linkingCode,
        );
      }}
    >
      <Field id="reg-name" km="ឈ្មោះ" en="Name">
        <input
          id="reg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="ឧ. សុខ ដារា"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Field>
      <Field id="reg-phone" km="លេខទូរស័ព្ទ" en="Phone number">
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="012 345 678"
          className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] tabular-nums outline-none focus:border-brand"
        />
      </Field>
      <Field id="reg-village" km="ភូមិ ឬឃុំ (មិនចាំបាច់)" en="Village or commune (optional)">
        <input
          id="reg-village"
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          placeholder="ឧ. ឃុំខ្នារសណ្ដាយ"
          className="km h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] outline-none focus:border-brand"
        />
      </Field>

      <label htmlFor="reg-consent" className="flex gap-3 rounded-xl border border-line bg-surface p-3">
        <input
          id="reg-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]"
        />
        <span>
          <span className="km block text-[15px]">ខ្ញុំយល់ព្រមឲ្យក្រុមការងារ M23 Cashew Advisor ទាក់ទងខ្ញុំតាមទូរស័ព្ទ អំពីដំបូន្មាន និងសេវាដាំចន្ទី។</span>
          <span className="block text-[14px] text-muted">
            I agree that the M23 Cashew Advisor team may contact me by phone about cashew advice and services.
          </span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-[15px] text-warn">
          <span className="km block">{ERRORS[error].km}</span>
          <span className="block opacity-85">{ERRORS[error].en}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={!ready}
        className="km h-12 rounded-xl bg-brand text-[16px] font-medium text-brand-ink disabled:opacity-40"
      >
        {busy ? "កំពុងចុះឈ្មោះ… · Registering…" : "ចុះឈ្មោះ · Register"}
      </button>
      <button type="button" onClick={onCancel} className="km text-[15px] text-muted underline">
        {cancelLabel.km} · {cancelLabel.en}
      </button>
      <p className="text-[14px] text-muted">
        <span className="km">ទិន្នន័យចម្ការ និងកំណត់ត្រាបាញ់ថ្នាំ នៅតែរក្សាទុកក្នុងទូរស័ព្ទនេះ។ </span>
        Your farm details and spray records stay on this phone.
      </p>
    </form>
  );
}

function Field({ id, km, en, children }: { id: string; km: string; en: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block">
        <span className="km text-[15px] font-semibold">{km}</span>
        <span className="text-[14px] text-muted"> · {en}</span>
      </label>
      {children}
    </div>
  );
}

import { useState } from "react";
import type { Account } from "../lib/account";
import { BookIcon, CalendarIcon, SprayIcon, SunIcon } from "./icons";
import { RegisterForm } from "./RegisterForm";

const FEATURES = [
  { Icon: CalendarIcon, km: "ការងារប្រចាំខែ សម្រាប់ចម្ការអ្នក", en: "This month's tasks for your farm" },
  { Icon: SunIcon, km: "ការព្រមានអាកាសធាតុ សម្រាប់ចន្ទី", en: "Weather warnings for cashew" },
  { Icon: SprayIcon, km: "កត់ត្រា និងរំលឹកពេលបាញ់ថ្នាំ", en: "Spray records and reminders" },
  { Icon: BookIcon, km: "ចម្លើយពីសៀវភៅបច្ចេកទេសដាំចន្ទី", en: "Answers from the cashew guidebook" },
];

export function Welcome({ onFinish }: { onFinish: (account: Account) => void }) {
  const [step, setStep] = useState<"intro" | "register" | "thanks">("intro");
  const [registered, setRegistered] = useState<Extract<Account, { status: "registered" }> | null>(null);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col overflow-y-auto bg-bg">
      <header className="shrink-0 bg-brand px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-brand-ink">
        <div className="flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="" className="h-11 w-11 shrink-0 rounded-[10px] ring-1 ring-brand-ink/25" />
          <div className="leading-tight">
            <p className="km text-[16px] font-semibold">ជំនួយការចន្ទី M23</p>
            <p className="text-[12px] opacity-80">M23 Cashew Advisor</p>
          </div>
        </div>
        {step !== "register" && (
          <div className="mt-8">
            <p className="km text-[34px] font-bold leading-[1.35] [text-wrap:balance]">កើនផល កើនលុយ</p>
            <p className="km mt-1 text-[20px] font-semibold leading-snug">ប្រើប្រាស់សេវារបស់ពួកយើង!</p>
            <p className="mt-3 text-[16px] font-medium opacity-90">More Yields, More Income, Use Our Service!</p>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        {step === "intro" && (
          <>
            <ul className="flex flex-col gap-3.5">
              {FEATURES.map(({ Icon, km, en }) => (
                <li key={en} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="km block text-[15px] font-medium">{km}</span>
                    <span className="block text-[12px] text-muted">{en}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <div className="rounded-xl bg-brand-soft p-3 mb-2">
                <p className="km text-[14px] font-medium text-brand">
                  ចុះឈ្មោះឥឡូវ ទទួលបានគំរោងប្រើថ្នាំពិសេស · Register now, get custom spray calendar
                </p>
              </div>
              <button
                onClick={() => setStep("register")}
                className="km h-13 rounded-xl bg-brand py-3.5 text-[17px] font-semibold text-brand-ink"
              >
                ចុះឈ្មោះ · Register
              </button>
              <button
                onClick={() => onFinish({ status: "guest" })}
                className="km h-13 rounded-xl border border-brand bg-surface py-3.5 text-[17px] font-semibold text-brand"
              >
                ប្រើជាភ្ញៀវ · Continue as guest
              </button>
              <p className="km text-center text-[13px] text-muted">
                ឥតគិតថ្លៃ · អាចចុះឈ្មោះពេលក្រោយ · Free, and you can register later
              </p>
            </div>
          </>
        )}

        {step === "register" && (
          <>
            <h1 className="km text-[22px] font-semibold">ចុះឈ្មោះ</h1>
            <p className="mb-5 text-[13px] text-muted">
              <span className="km">ចុះឈ្មោះ ដើម្បីទទួលដំបូន្មាន និងសេវាពីក្រុមការងារយើង។ </span>Register to get advice and services from our team.
            </p>
            <RegisterForm
              onDone={(account, code) => {
                setRegistered(account);
                setLinkingCode(code);
                setStep("thanks");
              }}
              onCancel={() => onFinish({ status: "guest" })}
              cancelLabel={{ km: "ប្រើជាភ្ញៀវជំនួសវិញ", en: "Continue as guest instead" }}
            />
          </>
        )}

        {step === "thanks" && registered && (
          <div className="flex flex-1 flex-col">
            <h1 className="km text-[24px] font-semibold">អរគុណ {registered.name}!</h1>
            <p className="km mt-2 text-[15px]">អ្នកបានចុះឈ្មោះរួចហើយ។ ក្រុមការងារយើងអាចទាក់ទងអ្នកតាមលេខ {registered.phone}។</p>
            <p className="mt-1 text-[13px] text-muted">You're registered. Our team may contact you on {registered.phone}.</p>

            {linkingCode && (
              <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
                <p className="km text-[14px] font-medium">🔗 ភ្ជាក់ជាមួយ Telegram</p>
                <p className="text-[12px] text-muted">
                  <span className="km">
                    បើក Telegram ហើយវាយ <b>/link</b> បន្ទាប់មកសូមដាក់លេខនេះ៖
                  </span>{" "}
                  Open Telegram, type <b>/link</b>, then enter this number:
                </p>
                <p className="km mt-3 rounded-xl bg-brand-soft py-3 text-center text-[30px] font-bold tracking-[0.25em] text-brand tabular-nums">
                  {linkingCode}
                </p>
              </div>
            )}

            <button
              onClick={() => onFinish(registered)}
              className="km mt-auto h-13 rounded-xl bg-brand py-3.5 text-[17px] font-semibold text-brand-ink"
            >
              ចាប់ផ្ដើម · Get started
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

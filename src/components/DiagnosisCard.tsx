import type { Diagnosis } from "../lib/api";
import { Feedback, ListenButton, Sources, type Rating } from "./AnswerParts";
import { AlertIcon, InfoIcon } from "./icons";

export function DiagnosisCard({ id, d, rated, onRate }: { id: string; d: Diagnosis; rated?: Rating; onRate: (r: Rating) => void }) {
  return (
    <article className="w-full max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-line bg-surface p-4">
      <header className="flex items-start gap-2">
        {d.matched ? (
          <AlertIcon size={20} className="mt-1 shrink-0 text-warn" />
        ) : (
          <InfoIcon size={20} className="mt-1 shrink-0 text-muted" />
        )}
        <div className="min-w-0">
          <h3 className="km text-[17px] font-semibold">
            {d.matched ? d.title_km : "មិនច្បាស់ — មិនត្រូវនឹងបញ្ហាដែលយើងស្គាល់"}
          </h3>
          <p className="text-[15px] text-muted">{d.matched ? d.title_en : "No confident match with known conditions"}</p>
        </div>
      </header>

      <ListenButton
        id={id}
        text={[d.matched ? d.title_km : "មិនច្បាស់", d.confidence_km, d.symptoms_km, ...d.steps_km].join("។ ")}
        className="mt-3"
      />

      <p className="mt-3 rounded-lg bg-warn-soft px-2.5 py-2 text-[15px] text-warn">
        <span className="km block">{d.confidence_km}</span>
        <span className="block opacity-85">{d.confidence_en}</span>
      </p>

      <p className="km mt-3 text-[15px]">{d.symptoms_km}</p>
      <p className="mt-1 text-[15px] text-muted">{d.symptoms_en}</p>

      {d.steps_km.length > 0 && (
        <>
          <h4 className="mt-4 text-[14px] font-semibold uppercase tracking-wide text-brand">
            <span className="km normal-case">អ្វីដែលត្រូវធ្វើ</span> · What to do
          </h4>
          <ol className="mt-2 flex flex-col gap-2.5">
            {d.steps_km.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="km text-[15px]">{step}</p>
                  {d.steps_en[i] && <p className="text-[15px] text-muted">{d.steps_en[i]}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      <Sources ids={d.sources} />
      <Feedback rated={rated} onRate={onRate} />
    </article>
  );
}

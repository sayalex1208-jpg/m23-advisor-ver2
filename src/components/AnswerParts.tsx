// Pieces shared by chat answers and diagnosis cards.

import { ENTRY_BY_ID, pageLabel } from "../lib/kb";
import { speak, stopSpeaking, useSpeech } from "../lib/voice";
import { AlertIcon, ChatIcon, SpeakerIcon, StopIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

/** Reads Khmer text aloud. Hidden on phones without a Khmer voice. */
export function ListenButton({ id, text, className = "" }: { id: string; text: string; className?: string }) {
  const { canSpeak, nowSpeaking } = useSpeech();
  if (!canSpeak) return null;
  const playing = nowSpeaking === id;
  return (
    <button
      type="button"
      onClick={() => (playing ? stopSpeaking() : speak(id, text))}
      aria-pressed={playing}
      className={`km inline-flex h-12 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-medium ${
        playing ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand"
      } ${className}`}
    >
      {playing ? <StopIcon size={16} /> : <SpeakerIcon size={18} />}
      {playing ? "ឈប់ · Stop" : "ស្ដាប់ · Listen"}
    </button>
  );
}

/** Book page chips, plus a dose caution when any cited entry is unverified. */
export function Sources({ ids }: { ids: number[] }) {
  const known = [...new Set(ids)].filter((id) => ENTRY_BY_ID.has(id));
  if (!known.length) return null;
  const pages = known.map(pageLabel).filter((p): p is NonNullable<typeof p> => p !== null);
  const needsCheck = known.some((id) => ENTRY_BY_ID.get(id)!.needs_verification);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {needsCheck && (
        <p className="flex gap-2 rounded-lg bg-warn-soft px-2.5 py-2 text-[15px] text-warn">
          <AlertIcon size={16} className="mt-1 shrink-0" />
          <span>
            <span className="km block">កម្រិតថ្នាំ និងលេខខាងលើ មិនទាន់បានផ្ទៀងផ្ទាត់។ សូមសួរអ្នកជំនាញ ឬហាងលក់ថ្នាំដែលទុកចិត្ត មុនបាញ់។</span>
            <span className="block opacity-85">Doses and figures not yet verified. Confirm with an agronomist or trusted shop first.</span>
          </span>
        </p>
      )}
      {pages.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-[14px] text-muted">
          <span className="km">ប្រភព · Source:</span>
          {pages.map((p) => (
            <span key={p.en} className="rounded-full border border-line px-2 py-0.5">
              <span className="km">សៀវភៅ {p.km}</span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-3">
      <span className="dot h-2 w-2 rounded-full bg-muted" />
      <span className="dot h-2 w-2 rounded-full bg-muted" />
      <span className="dot h-2 w-2 rounded-full bg-muted" />
      <span className="km sr-only">កំពុងគិត…</span>
    </div>
  );
}

/** A book answer in full: Khmer, English, dose caution, page, and "Ask more". */
export function EntryBody({ id, onAsk }: { id: number; onAsk?: (question: string) => void }) {
  const e = ENTRY_BY_ID.get(id);
  if (!e) return null;
  const page = pageLabel(id);
  return (
    <div>
      <ListenButton id={`entry-${id}`} text={e.a_km} className="mb-2" />
      <p className="km text-[15px]">{e.a_km}</p>
      <p className="mt-2 text-[15px] text-muted">{e.a_en}</p>
      {e.needs_verification && (
        <p className="mt-3 flex gap-2 rounded-lg bg-warn-soft px-2.5 py-2 text-[15px] text-warn">
          <AlertIcon size={16} className="mt-1 shrink-0" />
          <span>
            <span className="km block">លេខ និងកម្រិតថ្នាំ មិនទាន់បានផ្ទៀងផ្ទាត់។ សូមសួរអ្នកជំនាញមុនប្រើ។</span>
            <span className="block opacity-85">Figures not yet verified. Check with an agronomist first.</span>
          </span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {page ? (
          <span className="km rounded-full border border-line px-2 py-0.5 text-[14px] text-muted">សៀវភៅ {page.km}</span>
        ) : (
          <span />
        )}
        {onAsk && (
          <button
            onClick={() => onAsk(e.q_km)}
            className="km inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-[15px] text-brand"
          >
            <ChatIcon size={16} /> សួរបន្ថែម · Ask more
          </button>
        )}
      </div>
    </div>
  );
}

export type Rating = "up" | "down";

/** "Was this helpful?" with thumbs up/down; sent once per answer. */
export function Feedback({ rated, onRate }: { rated?: Rating; onRate: (r: Rating) => void }) {
  if (rated) {
    return (
      <p className="km mt-3 text-[14px] text-muted">
        អរគុណសម្រាប់មតិ · Thanks for the feedback{rated === "down" && " — we'll improve this answer"}
      </p>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
      <span className="km flex-1 text-[14px] text-muted">មានប្រយោជន៍ទេ? · Helpful?</span>
      <button
        onClick={() => onRate("up")}
        className="flex h-12 w-11 items-center justify-center rounded-lg border border-line text-brand"
        aria-label="មានប្រយោជន៍ · Helpful"
      >
        <ThumbUpIcon size={18} />
      </button>
      <button
        onClick={() => onRate("down")}
        className="flex h-12 w-11 items-center justify-center rounded-lg border border-line text-muted"
        aria-label="មិនមានប្រយោជន៍ · Not helpful"
      >
        <ThumbDownIcon size={18} />
      </button>
    </div>
  );
}

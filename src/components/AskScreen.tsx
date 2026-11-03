import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  ERROR_COPY,
  askAdvisor,
  diagnosePhoto,
  fetchAiStatus,
  sendFeedback,
  type ChatReply,
  type Diagnosis,
  type Turn,
} from "../lib/api";
import { shrinkPhoto, ImageError } from "../lib/image";
import { treeAge, type Farm } from "../lib/farm";
import { ENTRY_BY_ID, toKhmerDigits } from "../lib/kb";
import { findBookAnswers } from "../lib/match";
import { KHMER_MONTHS, currentMonth, seasonFor } from "../lib/season";
import { LISTEN_ERRORS, canListen, speak, stopSpeaking, useDictation, useSpeech } from "../lib/voice";
import { useOnline } from "../lib/pwa";
import { Feedback, ListenButton, Sources, Thinking, type Rating } from "./AnswerParts";
import { BookAnswer, NOT_FOUND_KM } from "./BookAnswer";
import { DiagnosisCard } from "./DiagnosisCard";
import { CameraIcon, LeafIcon, MicIcon, SendIcon, StopIcon } from "./icons";

type Message =
  | { kind: "question"; text: string }
  | { kind: "photo"; url: string } // url is "" once restored from storage (photos aren't kept)
  | { kind: "answer"; question: string; reply: ChatReply; rated?: Rating }
  | { kind: "diagnosis"; result: Diagnosis; rated?: Rating }
  | { kind: "error"; code: ApiError["code"] }
  // An answer looked up in the book on the phone, when the AI is off or failed.
  | { kind: "book"; question: string; best: number | null; related: number[]; aiFailed?: boolean; rated?: Rating };

/** The Khmer text a Listen button reads for an answer. */
function spokenText(msg: Message): string | null {
  switch (msg.kind) {
    case "answer":
      return msg.reply.reply_km;
    case "book": {
      const entry = msg.best === null ? undefined : ENTRY_BY_ID.get(msg.best);
      return entry ? `${entry.q_km} ${entry.a_km}` : NOT_FOUND_KM;
    }
    case "diagnosis":
      return [msg.result.matched ? msg.result.title_km : "", msg.result.symptoms_km, ...msg.result.steps_km].join("។ ");
    case "error":
      return ERROR_COPY[msg.code].km;
    default:
      return null;
  }
}

function bookMessage(question: string, aiFailed?: boolean): Message {
  const { best, related } = findBookAnswers(question);
  // Questions the book can't answer surely show what to add to the next knowledge base;
  // entryIds lists the guesses offered instead, if any.
  if (!best) sendFeedback({ kind: "no_answer", source: "book", question, entryIds: related.map((e) => e.id) });
  return { kind: "book", question, best: best?.id ?? null, related: related.map((e) => e.id), aiFailed };
}

// The chat survives closing the app. Photos are left out: they would fill
// the phone's storage for this site within a few dozen pictures.
const CHAT_KEY = "m23.chat";
type SavedChat = { messages: Message[]; turns: Turn[] };

function loadChat(): SavedChat {
  try {
    const saved: SavedChat | null = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null");
    if (saved && Array.isArray(saved.messages) && Array.isArray(saved.turns)) return saved;
  } catch {
    // Fall through to an empty chat.
  }
  return { messages: [], turns: [] };
}

function saveChat(chat: SavedChat) {
  try {
    const messages = chat.messages.map((m) => (m.kind === "photo" ? { ...m, url: "" } : m));
    localStorage.setItem(CHAT_KEY, JSON.stringify({ messages, turns: chat.turns }));
  } catch {
    // Not saved; the chat still works for this visit.
  }
}

export function AskScreen({
  handoff,
  onHandoffUsed,
  farm,
}: {
  handoff: string | null;
  onHandoffUsed: () => void;
  farm: Farm;
}) {
  const initialChat = loadChat();
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [turns, setTurns] = useState<Turn[]>(initialChat.turns);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // null while checking; false until an API key is set on the server.
  const [ai, setAi] = useState<boolean | null>(null);
  const online = useOnline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // A question asked by voice gets its answer read aloud, for farmers who don't read.
  const speakNextAnswer = useRef(false);
  const dictation = useDictation({
    onPartial: setDraft,
    onFinal: (text) => {
      speakNextAnswer.current = true;
      sendQuestion(text);
    },
  });

  useEffect(() => {
    if (!speakNextAnswer.current) return;
    const i = messages.length - 1;
    const text = i >= 0 ? spokenText(messages[i]) : null;
    if (!text) return;
    speakNextAnswer.current = false;
    speak(`msg-${i}`, text);
  }, [messages]);

  // A question handed over from the Guide lands in the box, not sent, so the
  // farmer can add details about their own trees first.
  useEffect(() => {
    if (handoff === null) return;
    setDraft(handoff);
    onHandoffUsed();
    inputRef.current?.focus();
  }, [handoff, onHandoffUsed]);

  useEffect(() => {
    fetchAiStatus().then(setAi);
  }, []);

  useEffect(() => saveChat({ messages, turns }), [messages, turns]);

  function newChat() {
    setMessages([]);
    setTurns([]);
    setDraft("");
    speakNextAnswer.current = false;
    stopSpeaking();
  }

  function rate(index: number, rating: Rating) {
    const msg = messages[index];
    setMessages((all) => all.map((m, i) => (i === index ? ({ ...m, rated: rating } as Message) : m)));
    if (msg.kind === "answer") {
      sendFeedback({ kind: "rating", rating, source: "ai", question: msg.question, answer: msg.reply.reply_km, entryIds: msg.reply.sources });
    } else if (msg.kind === "book") {
      const entry = msg.best === null ? undefined : ENTRY_BY_ID.get(msg.best);
      sendFeedback({ kind: "rating", rating, source: "book", question: msg.question, answer: entry?.a_km ?? "", entryIds: entry ? [entry.id] : [] });
    } else if (msg.kind === "diagnosis") {
      sendFeedback({ kind: "rating", rating, source: "photo", question: "(photo)", answer: `${msg.result.title_en} ${msg.result.symptoms_en}`, entryIds: msg.result.sources });
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function sendQuestion(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setDraft("");
    setMessages((m) => [...m, { kind: "question", text: question }]);
    if (!ai) {
      const answer = bookMessage(question);
      setMessages((m) => [...m, answer]);
      return;
    }
    const nextTurns: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(nextTurns);
    setBusy(true);
    try {
      const reply = await askAdvisor(nextTurns, { ...farm, age: treeAge(farm) });
      setMessages((m) => [...m, { kind: "answer", question, reply }]);
      setTurns((t) => [...t, { role: "assistant", content: `${reply.reply_km}\n(${reply.gloss_en})` }]);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "unavailable";
      // When the AI can't be reached, the book still answers.
      const next: Message = code === "unavailable" || code === "offline" ? bookMessage(question, true) : { kind: "error", code };
      setMessages((m) => [...m, next]);
    } finally {
      setBusy(false);
    }
  }

  function showEntry(id: number) {
    setMessages((m) => [...m, { kind: "book", question: ENTRY_BY_ID.get(id)?.q_km ?? "", best: id, related: [] }]);
  }

  async function sendPhoto(file: File) {
    if (busy || !ai) return;
    setBusy(true);
    try {
      const photo = await shrinkPhoto(file);
      setMessages((m) => [...m, { kind: "photo", url: photo.previewUrl }]);
      const result = await diagnosePhoto(photo.base64, photo.mediaType);
      setMessages((m) => [...m, { kind: "diagnosis", result }]);
    } catch (e) {
      if (e instanceof ImageError) {
        // Show user-friendly error for image issues
        const kmMsg = e.code === "too_large" 
          ? `រូបភាពធំពេក សូមថតម្ដងទៀតក្នុងគុណភាពទាប · Photo too large, retake in lower quality`
          : `រូបភាពមិនត្រឹមត្រូវ · Invalid image`;
        setMessages((m) => [...m, { kind: "error", code: "bad_request" }]);
        // Show the specific message
        alert(kmMsg);
      } else {
        setMessages((m) => [...m, { kind: "error", code: e instanceof ApiError ? e.code : "bad_request" }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end border-b border-line px-4 py-1.5">
          <button onClick={newChat} disabled={busy} className="km text-[15px] text-brand underline disabled:opacity-40">
            សំណួរថ្មី · New chat
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <Welcome onPick={sendQuestion} ai={ai} />}
        {messages.map((msg, i) =>
          msg.kind === "book" ? (
            <BookAnswer key={i} id={`msg-${i}`} {...msg} onShow={showEntry} onRate={(r) => rate(i, r)} />
          ) : (
            <MessageView key={i} id={`msg-${i}`} msg={msg} onRate={(r) => rate(i, r)} />
          ),
        )}
        {busy && <Thinking />}
      </div>

      <form
        className="shrink-0 border-t border-line bg-surface px-3 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <input
            ref={photoRef}
            id="photo-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) sendPhoto(file);
            }}
          />
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={busy || !ai}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line text-brand disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={ai ? "ថតរូបដើមចន្ទី · Take a photo of your tree" : "ត្រូវការអ៊ីនធឺណិត · Need internet"}
            title={ai ? undefined : "Photo diagnosis requires internet connection · ត្រូវការអ៊ីនធឺណិតសម្រាប់ពិនិត្យរូបភាព"}
          >
            <CameraIcon />
          </button>
          <label htmlFor="question-input" className="sr-only">
            សំណួររបស់អ្នក · Your question
          </label>
          <textarea
            ref={inputRef}
            id="question-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuestion(draft);
              }
            }}
            placeholder={canListen ? "វាយ ឬចុច 🎤 ដើម្បីនិយាយ…" : "សួរអំពីដើមចន្ទីរបស់អ្នក…"}
            className="km max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-[16px] outline-none placeholder:text-muted focus:border-brand"
          />
          {canListen && (dictation.listening || !draft.trim()) ? (
            <button
              type="button"
              onClick={dictation.listening ? dictation.stop : dictation.start}
              disabled={busy}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-brand-ink disabled:opacity-40 ${
                dictation.listening ? "mic-live bg-danger" : "bg-brand"
              }`}
              aria-label={dictation.listening ? "ឈប់ស្ដាប់ · Stop listening" : "សួរដោយសំឡេង · Ask by voice"}
            >
              {dictation.listening ? <StopIcon size={20} /> : <MicIcon size={22} />}
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink disabled:opacity-40"
              aria-label="ផ្ញើ · Send"
            >
              <SendIcon size={20} />
            </button>
          )}
        </div>
        {dictation.listening && (
          <p className="km mt-1.5 text-center text-[15px] text-danger">កំពុងស្ដាប់… និយាយសំណួររបស់អ្នក · Listening… say your question</p>
        )}
        {dictation.error && !dictation.listening && (
          <p className="mt-1.5 text-center text-[14px] text-warn">
            <span className="km">{LISTEN_ERRORS[dictation.error].km}</span> {LISTEN_ERRORS[dictation.error].en}
          </p>
        )}
        {!online && (
          <p className="km mt-1.5 text-center text-[14px] text-warn">
            គ្មានអ៊ីនធឺណិត — មគ្គុទ្ទេសក៍អាចឆ្លើយពីសៀវភៅ ប៉ុន្តែមិនអាចពិនិត្យរូបភាព · Offline — answers from book only, no photo checks
          </p>
        )}
      </form>
    </div>
  );
}

function Welcome({ onPick, ai }: { onPick: (q: string) => void; ai: boolean | null }) {
  const { voiceMissing } = useSpeech();
  const month = currentMonth();
  const season = seasonFor(month);
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-brand-soft p-4">
        <div className="flex items-center gap-2 text-brand">
          <LeafIcon size={20} />
          <h2 className="km text-[18px] font-semibold">សួរអ្វីក៏បាន អំពីចន្ទី M23</h2>
        </div>
        <p className="km mt-1 text-[15px]">
          ចម្លើយផ្អែកលើសៀវភៅបច្ចេកទេសដាំចន្ទី។ ថតរូបស្លឹក ផ្កា ឬផ្លែ ដើម្បីរកបញ្ហា ៨ប្រភេទដែលមានក្នុងសៀវភៅ។
        </p>
        <p className="mt-1 text-[15px] text-muted">
          Answers come from a Khmer cashew-growing guidebook. Take a photo to check for 8 documented pests and diseases.
        </p>
        {canListen && (
          <p className="mt-3 flex items-center gap-2.5 border-t border-brand/20 pt-2.5">
            <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
              <MicIcon size={18} />
            </span>
            <span className="text-[15px] text-muted">
              <span className="km block text-[15px] text-ink">មិនចង់វាយ? ចុចមីក្រូហ្វូន ហើយនិយាយ។ ចម្លើយនឹងអានឲ្យស្ដាប់។</span>
              Don't want to type? Tap the mic and speak. The answer is read aloud.
            </span>
          </p>
        )}
        {voiceMissing && (
          <p className="mt-3 border-t border-brand/20 pt-2.5 text-[14px] text-muted">
            <span className="km block text-[15px] text-ink">
              ដើម្បីស្ដាប់ចម្លើយជាសំឡេង សូមដំឡើងសំឡេងខ្មែរ ក្នុងការកំណត់ទូរស័ព្ទ៖ Text-to-speech → Speech Services by Google។
            </span>
            To hear answers read aloud, add the Khmer voice in your phone's Text-to-speech settings (Speech Services by Google).
          </p>
        )}
        {ai === false && (
          <p className="mt-3 border-t border-brand/20 pt-2.5 text-[15px] text-muted">
            <span className="km block text-ink">ឥឡូវនេះ ចម្លើយមកពីសៀវភៅផ្ទាល់។ ការពិនិត្យរូបភាពដោយ AI ឆាប់ៗនេះ។</span>
            Answers come straight from the book for now. AI photo checks are coming soon.
          </p>
        )}
      </div>

      <div>
        <h3 className="km text-[15px] font-semibold">
          ខែ{KHMER_MONTHS[month - 1]} ({toKhmerDigits(month)}) · {season.km}
        </h3>
        <p className="mb-2 text-[14px] text-muted">Questions for this month · {season.en}</p>
        <div className="flex flex-col gap-2">
          {season.questions.slice(0, 4).map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.q_km)}
              className="rounded-xl border border-line bg-surface px-3.5 py-3 text-left active:bg-brand-soft"
            >
              <span className="km block text-[15px]">{e.q_km}</span>
              <span className="block text-[14px] text-muted">{e.q_en}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MessageView({ id, msg, onRate }: { id: string; msg: Message; onRate: (r: Rating) => void }) {
  switch (msg.kind) {
    case "question":
      return (
        <p className="km max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2.5 text-[15px] text-brand-ink">
          {msg.text}
        </p>
      );
    case "photo":
      return msg.url ? (
        <img src={msg.url} alt="រូបដែលអ្នកបានផ្ញើ · Your photo" className="max-h-64 max-w-[70%] self-end rounded-2xl object-cover" />
      ) : (
        <p className="km self-end rounded-2xl bg-brand px-3.5 py-2.5 text-[15px] text-brand-ink opacity-80">រូបភាព · Photo</p>
      );
    case "answer":
      return (
        <article className="max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-line bg-surface p-4">
          <ListenButton id={id} text={msg.reply.reply_km} className="mb-2" />
          <p className="km whitespace-pre-line text-[16px]">{msg.reply.reply_km}</p>
          {msg.reply.gloss_en && (
            <p className="mt-2 border-t border-line pt-2 text-[15px] text-muted">{msg.reply.gloss_en}</p>
          )}
          <Sources ids={msg.reply.sources} />
          <Feedback rated={msg.rated} onRate={onRate} />
        </article>
      );
    case "diagnosis":
      return <DiagnosisCard id={id} d={msg.result} rated={msg.rated} onRate={onRate} />;
    case "error":
      return (
        <p className="max-w-[92%] self-start rounded-2xl border border-danger/30 px-3.5 py-2.5 text-[15px] text-danger">
          <span className="km block">{ERROR_COPY[msg.code].km}</span>
          <span className="block text-[14px] opacity-85">{ERROR_COPY[msg.code].en}</span>
        </p>
      );
  }
}

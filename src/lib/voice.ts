// Voice in and out:
// - Reading aloud uses high-quality Microsoft Edge Neural TTS (Khmer) via /api/tts.
//   It falls back to the phone's native speech synthesis when offline.
// - Listening uses Chrome's speech recognition, which sends the audio to Google.
//   Safari on iPhone doesn't offer speech recognition in Khmer.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// ---------- reading aloud ----------

const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
const isKhmer = (lang: string) => lang.toLowerCase().replace("_", "-").startsWith("km");

let khmerVoice: SpeechSynthesisVoice | null = null;
let speakingId: string | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function findVoice() {
  const voices = synth?.getVoices() ?? [];
  khmerVoice = voices.find((v) => isKhmer(v.lang)) ?? null;
  notify();
}
if (synth) {
  findVoice();
  synth.addEventListener?.("voiceschanged", findVoice);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Short pieces, split at Khmer and Latin sentence ends: for fallback synthesis */
function chunks(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[។៕!?\n])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= 220) out.push(p);
    else for (let i = 0; i < p.length; i += 220) out.push(p.slice(i, i + 220));
  }
  return out;
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  synth?.cancel();
  speakingId = null;
  notify();
}

function fallbackLocalSpeak(id: string, text: string) {
  if (!synth || !khmerVoice) {
    if (speakingId === id) {
      speakingId = null;
      notify();
    }
    return;
  }
  const pieces = chunks(text);
  if (!pieces.length) return;
  pieces.forEach((piece, i) => {
    const u = new SpeechSynthesisUtterance(piece);
    u.voice = khmerVoice;
    u.lang = khmerVoice!.lang;
    u.rate = 0.9;
    if (i === pieces.length - 1) {
      const done = () => {
        if (speakingId === id) {
          speakingId = null;
          notify();
        }
      };
      u.onend = done;
      u.onerror = done;
    }
    synth.speak(u);
  });
}

export async function speak(id: string, text: string) {
  stopSpeaking();
  const clean = text.trim();
  if (!clean) return;

  speakingId = id;
  notify();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });

    if (!res.ok) throw new Error("Cloud TTS failed");
    const blob = await res.blob();

    // Check if another utterance was started while downloading
    if (speakingId !== id) return;

    const url = URL.createObjectURL(blob);
    currentAudioUrl = url;
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => {
      if (speakingId === id) {
        speakingId = null;
        notify();
      }
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      currentAudio = null;
    };

    audio.onerror = () => {
      if (speakingId === id) {
        speakingId = null;
        notify();
      }
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }
      currentAudio = null;
    };

    await audio.play();
  } catch {
    // If cloud TTS fails (e.g. offline), try local speech synthesis
    if (synth && khmerVoice) {
      fallbackLocalSpeak(id, clean);
    } else {
      if (speakingId === id) {
        speakingId = null;
        notify();
      }
    }
  }
}

// Reading aloud is supported everywhere via Edge Neural TTS audio
export function useSpeech() {
  const canSpeak = typeof window !== "undefined" && typeof Audio !== "undefined";
  const nowSpeaking = useSyncExternalStore(subscribe, () => speakingId, () => null);
  const voiceMissing = false;
  return { canSpeak, nowSpeaking, voiceMissing };
}

// ---------- listening ----------

// Chrome ships this as webkitSpeechRecognition; TypeScript's DOM types don't include it.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

const Recognizer: RecognitionCtor | null =
  typeof window === "undefined"
    ? null
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition ??
      null);

const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
export const canListen = Recognizer !== null && !isIos;

export type ListenError = "denied" | "no_speech" | "offline" | "failed";

/** Hold-free dictation: tap to start, it stops by itself when the farmer stops talking. */
export function useDictation({ onPartial, onFinal }: { onPartial: (text: string) => void; onFinal: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<ListenError | null>(null);
  const rec = useRef<Recognition | null>(null);
  const handlers = useRef({ onPartial, onFinal });
  handlers.current = { onPartial, onFinal };

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    if (!Recognizer || rec.current) return;
    stopSpeaking();
    setError(null);
    const r = new Recognizer();
    r.lang = "km-KH";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      handlers.current.onPartial((finalText + interim).trim());
    };
    r.onerror = (e) => {
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "denied"
          : e.error === "no-speech"
            ? "no_speech"
            : e.error === "network"
              ? "offline"
              : e.error === "aborted"
                ? null
                : "failed",
      );
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      if (finalText.trim()) handlers.current.onFinal(finalText.trim());
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
      setError("failed");
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { listening, error, start, stop };
}

export const LISTEN_ERRORS: Record<ListenError, { km: string; en: string }> = {
  denied: { km: "សូមអនុញ្ញាតឲ្យប្រើមីក្រូហ្វូន ក្នុងការកំណត់កម្មវិធីរុករក។", en: "Allow the microphone in your browser settings." },
  no_speech: { km: "មិនឮសំឡេងទេ។ ចុចមីក្រូហ្វូន ហើយនិយាយម្ដងទៀត។", en: "Didn't hear anything. Tap the mic and speak again." },
  offline: { km: "ការស្ដាប់សំឡេងត្រូវការអ៊ីនធឺណិត។", en: "Voice questions need internet." },
  failed: { km: "ស្ដាប់មិនបាន។ សូមសាកម្ដងទៀត ឬវាយសំណួរ។", en: "Couldn't listen. Try again, or type your question." },
};

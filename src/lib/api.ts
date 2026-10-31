// Calls the server's /api/advisor route. The response shapes come from the
// server's own schemas, so the app and the API cannot drift apart.

import type { AdvisorErrorCode, ChatReply, Diagnosis, FarmContext } from "../../api/_lib/advisor";
import { isDemo } from "./demo";

export type { ChatReply, Diagnosis };
export type Turn = { role: "user" | "assistant"; content: string };

export class ApiError extends Error {
  constructor(public code: AdvisorErrorCode | "offline") {
    super(code);
  }
}

async function post<T>(body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/advisor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("offline");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.code ?? "unavailable");
  return data as T;
}

export type FeedbackPayload = {
  kind: "rating" | "no_answer";
  rating?: "up" | "down";
  source: "ai" | "book" | "photo";
  question: string;
  answer?: string;
  entryIds?: number[];
};

/** Fire-and-forget: feedback must never get in the farmer's way. */
export function sendFeedback(payload: FeedbackPayload) {
  // Taps during a presentation shouldn't land in the real feedback sheet.
  if (isDemo()) return;
  fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/** Whether the server has an AI key. Offline or unreachable counts as no. */
export async function fetchAiStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/advisor");
    return res.ok && (await res.json()).ai === true;
  } catch {
    return false;
  }
}

export const askAdvisor = (turns: Turn[], farm: FarmContext) =>
  post<ChatReply>({ mode: "chat", turns, farm: { age: farm.age, soil: farm.soil, hectares: farm.hectares, village: farm.village } });

export const diagnosePhoto = (imageBase64: string, mediaType: string) =>
  post<Diagnosis>({ mode: "diagnose", imageBase64, mediaType });

export const ERROR_COPY: Record<ApiError["code"], { km: string; en: string }> = {
  offline: {
    km: "មិនមានអ៊ីនធឺណិត។ សូមពិនិត្យសេវាទូរស័ព្ទ ហើយសាកម្ដងទៀត។",
    en: "No internet connection. Check your signal and try again.",
  },
  rate_limited: {
    km: "សួរច្រើនពេកក្នុងពេលខ្លី។ សូមរង់ចាំប្រហែល ១០ នាទី។",
    en: "Too many questions in a short time. Wait about 10 minutes.",
  },
  refused: {
    km: "AI មិនអាចឆ្លើយសំណួរនេះបានទេ។ សូមសួរតាមរបៀបផ្សេង។",
    en: "The AI couldn't answer this one. Try asking another way.",
  },
  bad_request: {
    km: "សំណួរនេះមិនអាចផ្ញើបានទេ។ សូមសរសេរខ្លីជាងនេះ ឬសាករូបផ្សេង។",
    en: "This couldn't be sent. Try a shorter question or a different photo.",
  },
  unavailable: {
    km: "AI មិនដំណើរការនៅពេលនេះទេ។ សូមសាកម្ដងទៀតបន្តិចទៀត។",
    en: "The AI isn't working right now. Try again in a little while.",
  },
};

// The advisor's AI calls, shared by the Vercel Function (api/advisor.ts) and
// the local dev server (vite.config.ts). Runs server-side only, so the
// Gemini API key never reaches the farmer's phone.

import { GoogleGenAI, Type, type Content, type Schema } from "@google/genai";
import { z } from "zod";
import { KNOWLEDGE_BASE } from "./knowledge-base.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export const ChatReply = z.object({
  reply_km: z.string().describe("The answer in Khmer: a few short, practical sentences for a farmer on a phone."),
  gloss_en: z.string().describe("A 1-2 sentence English summary of the same answer."),
  sources: z.array(z.number().int()).describe("Knowledge base entry numbers (#) the answer is based on. Empty if none."),
});

export const Diagnosis = z.object({
  matched: z.boolean().describe("True only if the photo clearly matches one of the DIAGNOSABLE CONDITIONS."),
  title_km: z.string().describe("Khmer name of the matched condition; empty string if matched is false."),
  title_en: z.string().describe("English name, e.g. 'Likely: Tea mosquito bug damage'; empty string if matched is false."),
  confidence_km: z.string().describe("Short Khmer note on how sure this is and what to verify."),
  confidence_en: z.string().describe("The same note in English."),
  symptoms_km: z.string().describe("Khmer description of what the photo shows and why it matches, or why it doesn't."),
  symptoms_en: z.string().describe("The same description in English."),
  steps_km: z.array(z.string()).describe("Recommended steps in Khmer. General next steps (photograph again, ask an agronomist) when nothing matches."),
  steps_en: z.array(z.string()).describe("The same steps in English, same order."),
  sources: z.array(z.number().int()).describe("Knowledge base entry numbers (#) used. Empty if none."),
});

export type ChatReply = z.infer<typeof ChatReply>;
export type Diagnosis = z.infer<typeof Diagnosis>;

const ChatReplyJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reply_km: {
      type: Type.STRING,
      description: "The answer in Khmer: a few short, practical sentences for a farmer on a phone.",
    },
    gloss_en: {
      type: Type.STRING,
      description: "A 1-2 sentence English summary of the same answer.",
    },
    sources: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Knowledge base entry numbers (#) the answer is based on. Empty if none.",
    },
  },
  required: ["reply_km", "gloss_en", "sources"],
};

const DiagnosisJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matched: {
      type: Type.BOOLEAN,
      description: "True only if the photo clearly matches one of the DIAGNOSABLE CONDITIONS.",
    },
    title_km: {
      type: Type.STRING,
      description: "Khmer name of the matched condition; empty string if matched is false.",
    },
    title_en: {
      type: Type.STRING,
      description: "English name, e.g. 'Likely: Tea mosquito bug damage'; empty string if matched is false.",
    },
    confidence_km: {
      type: Type.STRING,
      description: "Short Khmer note on how sure this is and what to verify.",
    },
    confidence_en: {
      type: Type.STRING,
      description: "The same note in English.",
    },
    symptoms_km: {
      type: Type.STRING,
      description: "Khmer description of what the photo shows and why it matches, or why it doesn't.",
    },
    symptoms_en: {
      type: Type.STRING,
      description: "The same description in English.",
    },
    steps_km: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Recommended steps in Khmer. General next steps (photograph again, ask an agronomist) when nothing matches.",
    },
    steps_en: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The same steps in English, same order.",
    },
    sources: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Knowledge base entry numbers (#) used. Empty if none.",
    },
  },
  required: [
    "matched",
    "title_km",
    "title_en",
    "confidence_km",
    "confidence_en",
    "symptoms_km",
    "symptoms_en",
    "steps_km",
    "steps_en",
    "sources",
  ],
};

const DIAGNOSE_INSTRUCTION =
  "The farmer has attached this photo of their M-23 cashew tree and is asking what is wrong with it. " +
  "Diagnose ONLY from the DIAGNOSABLE CONDITIONS list. If nothing matches confidently, set matched to false " +
  "and explain what you see, recommending an in-person check by an agronomist.";

// Error codes the app shows farmer-friendly copy for.
export type AdvisorErrorCode = "bad_request" | "rate_limited" | "refused" | "unavailable";

export class AdvisorError extends Error {
  constructor(public code: AdvisorErrorCode, message: string, public status: number) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new AdvisorError("unavailable", "GEMINI_API_KEY is not set on the server.", 503);
  }
  return (client ??= new GoogleGenAI({ apiKey }));
}

async function ask<T extends z.ZodType>(
  zodSchema: T,
  geminiSchema: Schema,
  contents: Content[],
): Promise<z.infer<T>> {
  const ai = getClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: KNOWLEDGE_BASE,
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
      },
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    const msg = String(error?.message || "");
    const status = error?.status || error?.statusCode;
    if (status === 429 || msg.includes("429") || msg.toLowerCase().includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      throw new AdvisorError("rate_limited", "The AI service is busy.", 429);
    }
    if (msg.toLowerCase().includes("safety") || msg.toLowerCase().includes("blocked") || msg.toLowerCase().includes("recitation")) {
      throw new AdvisorError("refused", "The AI declined to answer this question.", 422);
    }
    throw new AdvisorError("unavailable", "The AI service could not answer.", 502);
  }

  const text = response.text?.trim();
  if (!text) {
    throw new AdvisorError("unavailable", "No answer returned from AI.", 502);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        json = JSON.parse(match[1]);
      } catch {
        // fall through
      }
    }
    if (!json) {
      throw new AdvisorError("unavailable", "Failed to parse structured response.", 502);
    }
  }

  const parsed = zodSchema.safeParse(json);
  if (!parsed.success) {
    console.error("Zod schema validation failed on Gemini output:", parsed.error);
    throw new AdvisorError("unavailable", "Structured answer did not match expected format.", 502);
  }
  return parsed.data;
}

// ---------- request validation ----------

const MAX_TURNS = 30;
const MAX_TURN_CHARS = 2000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

// What the farmer saved under "My farm", so answers fit their trees.
const FarmContext = z.object({
  age: z.number().int().min(0).max(80).nullable(),
  soil: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  hectares: z.number().min(0).max(10_000).nullable(),
  village: z.string().max(100),
});
export type FarmContext = z.infer<typeof FarmContext>;

const SOIL_NAMES = {
  1: "type 1, red upland soil",
  2: "type 2, sandy loam that keeps dry-season moisture",
  3: "type 3, sandy loam with no dry-season moisture",
} as const;

function describeFarm(farm: FarmContext): string | null {
  const parts = [
    farm.age !== null && (farm.age === 0 ? "trees planted this year" : `trees about ${farm.age} years old`),
    farm.soil !== null && `soil ${SOIL_NAMES[farm.soil]}`,
    farm.hectares !== null && `${farm.hectares} ha`,
    farm.village.trim() && `village/commune: ${farm.village.trim()}`,
  ].filter(Boolean);
  return parts.length ? `[The farmer's saved farm details: ${parts.join("; ")}. Use these when the answer depends on tree age or soil.]` : null;
}

const ChatRequest = z.object({
  mode: z.literal("chat"),
  farm: FarmContext.optional(),
  turns: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_TURN_CHARS) }))
    .min(1),
});

const DiagnoseRequest = z.object({
  mode: z.literal("diagnose"),
  imageBase64: z.string().min(1).max(6_000_000),
  mediaType: z.enum(IMAGE_TYPES),
  note: z.string().max(MAX_TURN_CHARS).optional(),
});

const AdvisorRequest = z.discriminatedUnion("mode", [ChatRequest, DiagnoseRequest]);

export async function handleAdvisor(body: unknown): Promise<ChatReply | Diagnosis> {
  const parsed = AdvisorRequest.safeParse(body);
  if (!parsed.success) {
    throw new AdvisorError("bad_request", parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  }
  const req = parsed.data;

  if (req.mode === "chat") {
    // Keep the newest turns, and start on a user turn as the API requires.
    let turns = req.turns.slice(-MAX_TURNS);
    while (turns.length && turns[0].role !== "user") turns = turns.slice(1);
    if (!turns.length || turns[turns.length - 1].role !== "user") {
      throw new AdvisorError("bad_request", "The conversation must end with the farmer's question.", 400);
    }
    // Farm details ride on the newest question, so the system prompt stays identical.
    const farmNote = req.farm && describeFarm(req.farm);
    if (farmNote) {
      const last = turns[turns.length - 1];
      turns = [...turns.slice(0, -1), { role: "user", content: `${farmNote}\n\n${last.content}` }];
    }

    const contents: Content[] = [];
    for (const turn of turns) {
      const role = turn.role === "assistant" ? "model" : "user";
      const last = contents[contents.length - 1];
      if (last && last.role === role && last.parts) {
        last.parts.push({ text: turn.content });
      } else {
        contents.push({ role, parts: [{ text: turn.content }] });
      }
    }

    return ask(ChatReply, ChatReplyJsonSchema, contents);
  }

  return ask(Diagnosis, DiagnosisJsonSchema, [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType: req.mediaType,
            data: req.imageBase64,
          },
        },
        {
          text: DIAGNOSE_INSTRUCTION + (req.note ? `\n\nThe farmer adds: ${req.note}` : ""),
        },
      ],
    },
  ]);
}

// ---------- rate limiting ----------

// In-memory and per server instance: enough to stop one phone (or a stranger
// who finds the URL) from draining the API credit during the demo. Swap for a
// shared store such as Upstash Redis before a wide launch.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const recent = new Map<string, number[]>();

export function checkRateLimit(clientId: string) {
  const now = Date.now();
  const hits = (recent.get(clientId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_REQUESTS_PER_WINDOW) {
    throw new AdvisorError("rate_limited", "Too many questions in a short time.", 429);
  }
  hits.push(now);
  recent.set(clientId, hits);
}

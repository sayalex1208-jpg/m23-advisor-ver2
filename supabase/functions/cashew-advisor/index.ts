// Supabase Edge Function: cashew-advisor
// Handles both text Q&A ("chat") and photo diagnosis ("diagnose") for the
// M23 Cashew Advisor app. Calls Google Gemini server-side so the API key
// never reaches the farmer's browser or phone.
//
// SETUP IN SUPABASE:
// 1. In your Supabase project: Edge Functions -> Create a new function ->
//    name it "cashew-advisor" -> paste this file in as index.ts.
// 2. Project Settings -> Edge Functions -> Secrets (or `supabase secrets set`)
//    add: GEMINI_API_KEY = <your Gemini API key from aistudio.google.com>
// 3. Optional secret: GEMINI_MODEL = gemini-3.5-flash-lite (default if omitted)
// 4. Deploy the function.
// 5. Frontend invokes via: supabase.functions.invoke('cashew-advisor', { body: {...} })

import { KNOWLEDGE_BASE } from "./knowledge-base.ts";

// Accept GEMINI_API_KEY or GOOGLE_API_KEY
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
//
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===================== JSON SCHEMAS & PROMPTS =====================

const CHAT_JSON_INSTRUCTION = `Reply with ONLY a JSON object:
{
  "reply_km": "<answer in Khmer, a few short, practical sentences for a farmer reading on a phone>",
  "gloss_en": "<1-2 sentence English summary of the same answer>",
  "sources": [<entry numbers # used, e.g. 121, 122; empty array if none>]
}`;

const VISION_JSON_INSTRUCTION = `The farmer has attached a photo of their M-23 cashew plant asking what's wrong with it.
Diagnose ONLY from the DIAGNOSABLE CONDITIONS list in the reference.
Reply with ONLY a JSON object in this exact format:
{
  "matched": true|false,
  "title_km": "<Khmer name of the matched condition, empty string if matched is false>",
  "title_en": "<English name, e.g. 'Likely: Tea mosquito bug damage', empty string if matched is false>",
  "confidence_km": "<short Khmer confidence/verify note>",
  "confidence_en": "<short English confidence/verify note>",
  "symptoms_km": "<Khmer description of what the photo shows and why it matches (or doesn't)>",
  "symptoms_en": "<English version>",
  "steps_km": ["<step 1 in Khmer>", "..."],
  "steps_en": ["<step 1 in English>", "..."],
  "sources": [<entry numbers # used, empty array if none>]
}
If nothing matches confidently, set matched to false, leave title fields empty, explain what you see in symptoms, and recommend an in-person agronomist check.`;

const CHAT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply_km: {
      type: "STRING",
      description: "The answer in Khmer: a few short, practical sentences for a farmer on a phone.",
    },
    gloss_en: {
      type: "STRING",
      description: "A 1-2 sentence English summary of the same answer.",
    },
    sources: {
      type: "ARRAY",
      items: { type: "INTEGER" },
      description: "Knowledge base entry numbers (#) the answer is based on. Empty if none.",
    },
  },
  required: ["reply_km", "gloss_en", "sources"],
};

const DIAGNOSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    matched: {
      type: "BOOLEAN",
      description: "True only if the photo clearly matches one of the DIAGNOSABLE CONDITIONS.",
    },
    title_km: {
      type: "STRING",
      description: "Khmer name of the matched condition; empty string if matched is false.",
    },
    title_en: {
      type: "STRING",
      description: "English name, e.g. 'Likely: Tea mosquito bug damage'; empty string if matched is false.",
    },
    confidence_km: {
      type: "STRING",
      description: "Short Khmer note on how sure this is and what to verify.",
    },
    confidence_en: {
      type: "STRING",
      description: "The same note in English.",
    },
    symptoms_km: {
      type: "STRING",
      description: "Khmer description of what the photo shows and why it matches, or why it doesn't.",
    },
    symptoms_en: {
      type: "STRING",
      description: "The same description in English.",
    },
    steps_km: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Recommended steps in Khmer.",
    },
    steps_en: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "The same steps in English, same order.",
    },
    sources: {
      type: "ARRAY",
      items: { type: "INTEGER" },
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

// ===================== HELPERS =====================

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function extractJson<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through
      }
    }
    throw new Error("Gemini reply did not contain valid JSON: " + text.slice(0, 200));
  }
}

// ===================== GEMINI API CALL =====================

interface GeminiContent {
  role?: "user" | "model";
  parts: Array<
    | { text: string }
    | { inline_data: { mime_type: string; data: string } }
  >;
}

async function callGemini(
  contents: GeminiContent[],
  responseSchema: Record<string, unknown>,
  maxOutputTokens = 2048,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. In Supabase, go to Project Settings -> Edge Functions -> Secrets and add GEMINI_API_KEY."
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const payload = {
    system_instruction: {
      parts: [{ text: KNOWLEDGE_BASE }],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  if (!candidate?.content?.parts) {
    const reason = candidate?.finishReason || "UNKNOWN";
    throw new Error(`Gemini returned no response (finishReason: ${reason})`);
  }

  const text = candidate.content.parts
    .map((p: { text?: string }) => p.text || "")
    .join("");

  if (!text) {
    throw new Error("Gemini returned empty text response");
  }

  return text;
}

// ===================== REQUEST HANDLER =====================

interface Turn {
  role: "user" | "assistant" | "model";
  content: string;
}

interface FarmContext {
  age?: number | null;
  soil?: number | null;
  hectares?: number | null;
  village?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method === "GET") {
    return jsonResponse({
      ai: Boolean(GEMINI_API_KEY),
      model: GEMINI_MODEL,
      status: "ready",
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let body: {
      mode?: string;
      turns?: Turn[];
      farm?: FarmContext;
      imageBase64?: string;
      mediaType?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }

    const mode = body?.mode;

    // 1. Text Q&A Chat
    if (mode === "chat") {
      const turns = Array.isArray(body.turns) ? body.turns : [];
      if (turns.length === 0) {
        return jsonResponse({ error: "turns array is required and must not be empty" }, 400);
      }

      // Convert conversation history to Gemini format (user / model)
      const contents: GeminiContent[] = turns.map((t) => ({
        role: t.role === "assistant" || t.role === "model" ? "model" : "user",
        parts: [{ text: t.content }],
      }));

      // Add farm context if provided
      if (body.farm) {
        const f = body.farm;
        const details = [
          f.age != null ? `tree age: ${f.age} years` : null,
          f.soil != null ? `soil type: ${f.soil}` : null,
          f.hectares != null ? `area: ${f.hectares} ha` : null,
          f.village ? `village: ${f.village}` : null,
        ]
          .filter(Boolean)
          .join(", ");

        if (details && contents.length > 0) {
          const first = contents[0];
          first.parts[0].text = `[Farmer profile: ${details}]\n\n${first.parts[0].text}`;
        }
      }

      // Append output instruction to the final user turn
      const last = contents[contents.length - 1];
      if (last.role === "user") {
        last.parts[0].text += "\n\n" + CHAT_JSON_INSTRUCTION;
      }

      const text = await callGemini(contents, CHAT_RESPONSE_SCHEMA, 1024);
      const parsed = extractJson<{ reply_km?: string; gloss_en?: string; sources?: number[] }>(text);

      return jsonResponse({
        reply_km: parsed.reply_km || "",
        gloss_en: parsed.gloss_en || "",
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      });
    }

    // 2. Photo Diagnosis
    if (mode === "diagnose") {
      const { imageBase64, mediaType = "image/jpeg" } = body;
      if (!imageBase64) {
        return jsonResponse({ error: "imageBase64 is required" }, 400);
      }

      // Strip potential data URL prefix: "data:image/jpeg;base64,..."
      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1].trim()
        : imageBase64.trim();

      const contents: GeminiContent[] = [
        {
          role: "user",
          parts: [
            { text: VISION_JSON_INSTRUCTION },
            {
              inline_data: {
                mime_type: mediaType,
                data: cleanBase64,
              },
            },
          ],
        },
      ];

      const text = await callGemini(contents, DIAGNOSIS_RESPONSE_SCHEMA, 1536);
      const parsed = extractJson<Record<string, unknown>>(text);

      return jsonResponse(parsed);
    }

    return jsonResponse({ error: "mode must be 'chat' or 'diagnose'" }, 400);
  } catch (err) {
    console.error("cashew-advisor handler error:", err);
    return jsonResponse(
      {
        error: {
          code: "unavailable",
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      500
    );
  }
});

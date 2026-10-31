// Vercel / Dev Server Function: GET or POST /api/tts
// Synthesizes Khmer speech using Microsoft Edge Neural TTS (Free, high quality).

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const cache = new Map<string, Buffer>();
const MAX_CACHE = 200;

export async function synthesizeKhmer(text: string, voice = "km-KH-PisethNeural"): Promise<Buffer> {
  const clean = text.trim().slice(0, 2000);
  const cacheKey = `${voice}:${clean}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(clean);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => resolve());
    audioStream.on("error", (err: Error) => reject(err));
  });

  const buffer = Buffer.concat(chunks);
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(cacheKey, buffer);
  return buffer;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const text = url.searchParams.get("text") ?? "";
    const voice = url.searchParams.get("voice") ?? "km-KH-PisethNeural";

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing text parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const audio = await synthesizeKhmer(text, voice);
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({ error: "TTS synthesis failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const voice = typeof body?.voice === "string" ? body.voice : "km-KH-PisethNeural";

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing text parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const audio = await synthesizeKhmer(text, voice);
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({ error: "TTS synthesis failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

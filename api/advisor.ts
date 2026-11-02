// Vercel Function: POST /api/advisor
// POST body: {mode: "chat", turns: [{role, content}, ...]}
//    or {mode: "diagnose", imageBase64, mediaType, note?}

import { AdvisorError, checkRateLimit, handleAdvisor } from "./_lib/advisor.js";

// GET /api/advisor -> {ai: boolean}: lets the app fall back to book answers
// until a Gemini API key is set in the environment.
export function GET() {
  return Response.json({ ai: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) });
}

export async function POST(request: Request) {
  try {
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AdvisorError("bad_request", "Body must be JSON.", 400);
    }
    
    // Check if this is a photo request for separate rate limiting
    const isPhoto = typeof body === "object" && body !== null && "mode" in body && body.mode === "diagnose";
    checkRateLimit(clientId, isPhoto);
    
    return Response.json(await handleAdvisor(body));
  } catch (error) {
    if (error instanceof AdvisorError) {
      return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: { code: "unavailable", message: "Unexpected server error." } }, { status: 500 });
  }
}

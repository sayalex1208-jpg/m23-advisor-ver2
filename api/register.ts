// Vercel Function: POST /api/register
// A farmer's sign-up (name, phone, village, consent), forwarded to the
// "Farmers" tab of the Google Sheet behind FEEDBACK_WEBHOOK_URL
// (docs/feedback-sheet.md). There is no password and no account: the farm
// data itself stays on the phone.

import { z } from "zod";
import { AdvisorError, checkRateLimit } from "./_lib/advisor.js";

// Cambodian numbers: 0XX XXX XXX(X) or +855 XX XXX XXX(X). Spaces and dashes are fine.
const normalizePhone = (s: string) => s.replace(/[\s\-().]/g, "").replace(/^\+?855/, "0");

const Registration = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^0\d{8,9}$/, "Phone number should look like 012 345 678")),
  village: z.string().trim().max(100),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    checkRateLimit(`register:${request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"}`);
    const parsed = Registration.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: { code: "bad_request", message: parsed.error.issues[0]?.message } }, { status: 400 });
    }

    const webhook = process.env.FEEDBACK_WEBHOOK_URL;
    if (!webhook) {
      console.error("register: FEEDBACK_WEBHOOK_URL is not set");
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    const { name, phone, village } = parsed.data;
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "register", at: new Date().toISOString(), name, phone, village }),
    }).catch(() => null);
    if (!res?.ok) {
      console.error("register: sheet webhook failed", res?.status);
      return Response.json({ error: { code: "unavailable" } }, { status: 502 });
    }
    return Response.json({ phone });
  } catch (error) {
    if (error instanceof AdvisorError) return Response.json({ error: { code: error.code } }, { status: error.status });
    console.error(error);
    return Response.json({ error: { code: "unavailable" } }, { status: 500 });
  }
}

// Vercel Function: POST /api/register
// A farmer's sign-up (name, phone, village, consent). Saved to the `farmers`
// table in Supabase so the web app and the Telegram bot share one record.
// If FEEDBACK_WEBHOOK_URL is also set (docs/feedback-sheet.md), the sign-up is
// forwarded to the Google Sheet too, for the team's spreadsheet view.
// There is no password and no account: the farm data itself stays on the phone.

import { z } from "zod";
import { AdvisorError, checkRateLimit } from "./_lib/advisor.js";
import { registerFarmer } from "./_lib/db.js";

// Cambodian numbers: 0XX XXX XXX(X) or +855 XX XXX XXX(X). Spaces and dashes are fine.
const normalizePhone = (s: string) => s.replace(/[\s\-().]/g, "").replace(/^\+?855/, "0");

const Registration = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^0\d{8,9}$/, "Phone number should look like 012 345 678")),
  village: z.string().trim().max(100).optional().default(""),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    checkRateLimit(`register:${request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"}`);
    const parsed = Registration.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: { code: "bad_request", message: parsed.error.issues[0]?.message } }, { status: 400 });
    }

    const { name, phone, village } = parsed.data;

    // 1. The real record: Supabase. This is what the Telegram bot can match on.
    const saved = await registerFarmer({ name, phone, village });
    if (!saved.ok && saved.reason === "no_db") {
      console.error("register: Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
      return Response.json({ error: { code: "unavailable" } }, { status: 503 });
    }
    if (!saved.ok) {
      return Response.json({ error: { code: "unavailable" } }, { status: 502 });
    }

    // 2. Optional: mirror to the team's Google Sheet. Never blocks the sign-up.
    const webhook = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "register", at: new Date().toISOString(), name, phone, village }),
      }).catch(() => null);
      if (!res?.ok) console.warn("register: sheet webhook failed", res?.status);
    }

    // The linking code lets the farmer connect this account to Telegram.
    return Response.json({ phone, linking_code: saved.linkingCode });
  } catch (error) {
    if (error instanceof AdvisorError) return Response.json({ error: { code: error.code } }, { status: error.status });
    console.error(error);
    return Response.json({ error: { code: "unavailable" } }, { status: 500 });
  }
}

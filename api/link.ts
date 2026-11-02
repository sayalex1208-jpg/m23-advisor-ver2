// Vercel Function: POST /api/link
// Links a farmer's web account with their Telegram account.
//
// Two ways in, both ending in the same place:
//   - The web app shows a 4-digit code; the farmer types it into the bot with
//     /link 1234. The bot calls this endpoint.
//   - The bot shows a 4-digit code; the farmer types it into the web app.
//     The web app calls this endpoint with their phone number.
//
// The row that holds the phone number always survives the merge, because the
// web registration is the only place the phone, name and village are known.

import { z } from "zod";
import { AdvisorError, checkRateLimit } from "./_lib/advisor.js";
import { findFarmerByPhone, linkByCode } from "./_lib/db.js";

const LinkRequest = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{4}$/, "The code is 4 digits")),
  // Only needed when linking from the web side; the bot identifies itself
  // by its Telegram id instead.
  phone: z.string().trim().optional(),
  telegram_id: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    checkRateLimit(`link:${request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"}`);
    const parsed = LinkRequest.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: { code: "bad_request" } }, { status: 400 });
    }

    const { code, phone, telegram_id } = parsed.data;

    // Work out which farmer is asking to link.
    let requesterId: string | null = null;
    if (telegram_id) {
      const { getDb } = await import("./_lib/db.js");
      const db = getDb();
      const result = await db?.from("farmers").select("id").eq("telegram_id", telegram_id).maybeSingle();
      requesterId = result?.data?.id ?? null;
    } else if (phone) {
      const farmer = await findFarmerByPhone(phone);
      requesterId = farmer?.id ?? null;
    }

    if (!requesterId) {
      return Response.json({ error: { code: "not_registered" } }, { status: 404 });
    }

    const result = await linkByCode(requesterId, code);
    if (!result.ok) {
      const status = result.reason === "failed" ? 500 : 400;
      return Response.json({ error: { code: result.reason } }, { status });
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AdvisorError) return Response.json({ error: { code: error.code } }, { status: error.status });
    console.error(error);
    return Response.json({ error: { code: "unavailable" } }, { status: 500 });
  }
}

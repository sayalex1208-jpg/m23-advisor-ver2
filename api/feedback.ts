// Vercel Function: POST /api/feedback
// Farmers' 👍/👎 on answers, and questions the book couldn't answer — what to
// fix or add in the next knowledge base. Forwarded to FEEDBACK_WEBHOOK_URL
// (a Google Sheet, see docs/feedback-sheet.md) when set; always logged.
// No farm details or location are sent.

import { z } from "zod";
import { AdvisorError, checkRateLimit } from "./_lib/advisor.js";

const Feedback = z.object({
  kind: z.enum(["rating", "no_answer"]),
  rating: z.enum(["up", "down"]).optional(),
  source: z.enum(["ai", "book", "photo"]),
  question: z.string().max(2000),
  answer: z.string().max(4000).optional(),
  entryIds: z.array(z.number().int()).max(20).optional(),
});

export async function POST(request: Request) {
  try {
    checkRateLimit(`feedback:${request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"}`);
    const parsed = Feedback.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response(null, { status: 400 });

    const row = { at: new Date().toISOString(), ...parsed.data, answer: parsed.data.answer?.slice(0, 600) };
    console.log("feedback", JSON.stringify(row));

    const webhook = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(row),
      }).catch((err) => console.error("feedback webhook failed", err));
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AdvisorError) return new Response(null, { status: error.status });
    console.error(error);
    return new Response(null, { status: 500 });
  }
}

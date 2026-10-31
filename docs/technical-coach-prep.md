# Technical Coach meeting prep — M23 Cashew Advisor

**Where I am:** Prototype (Khmer text Q&A + photo diagnosis) is genuinely working, but only privately in a Claude artifact — can't be the Public Product Link because that platform blocks public sharing for anything using live AI. Real public build is Lovable + Supabase + a Claude API Edge Function. **Blocked before I've even started: need a card to buy Anthropic API credits (prepaid, no free tier) and don't have an easy way to pay.** Everything else is written and ready to go the moment that's unblocked.

## #1 thing to solve in this meeting: the payment blocker
This is the single thing stopping me from starting. Ask directly:
- Does AIM or FirstWave have any API credit vouchers, sponsor deals, or a shared org account for teams to use during Build Week?
- Has any other team hit this same "need a card for API billing" wall — how did they solve it?
- If there's truly no program solution, is there an accepted workaround (a mentor/teammate's card, reimbursed) that's fine to use for a hackathon MVP?

## Architecture, for a fast sanity check
Farmer's phone → Lovable-built mobile web app → Supabase Edge Function (holds the Anthropic API key server-side) → Claude API (Sonnet 5) → structured JSON back → rendered as a chat bubble or diagnosis card.
- Chosen specifically because it keeps the API key off the frontend and needs no custom backend hosting.
- Knowledge base (from a physical Khmer agronomy book, chapter-by-chapter, ~4 of 5 lifecycle stages covered + one filled from external research and flagged as such) is embedded directly in the Edge Function prompt — no vector DB/RAG, just a condensed reference text since it fits comfortably under the model's input limits.
- Vision diagnosis is deliberately constrained to only the 8 pests/diseases documented in the book, with an honest "doesn't match, get it checked" fallback rather than open-ended guessing.

**Ask the coach:** does this architecture look right for a 3-day build, or is there a faster/more reliable pattern they'd recommend for wiring Lovable to an LLM backend? Any known gotchas with Lovable's native Supabase integration specifically?

## Scope triage for the remaining ~3 days
Ask directly: given the deadline, what should I cut vs. protect?
- Voice (Khmer STT/TTS) was already deprioritized — confirm that's still the right call, or is there a fast/cheap way to fake it for the demo without a real integration?
- Is a working text Q&A + vision diagnosis (no voice) enough to score well on Execution, or does the judging panel expect all three features functioning?
- Any opinion on Lovable's default subdomain vs. spending time on a custom domain — does it matter for judging?

## One thing worth flagging, not necessarily asking
The book content includes a chemical spray protocol (flowering induction) and pest treatment dosages that haven't been independently verified by a native speaker/agronomist yet — I'm hedging on exact numbers in the AI's responses until that's done. Mention this proactively; it's a good Founder Signal moment (shows judgment about what's safe to ship), not a confession of a bug.

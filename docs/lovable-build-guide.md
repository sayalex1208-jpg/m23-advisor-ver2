# M23 Cashew Advisor — Lovable + Supabase build guide

This is the path to your actual **Public Product Link** — a real, live, publicly-clickable app, no Claude account or consent step required for whoever opens it.

## Step 1 — Get an Anthropic API key (do this first, it's the blocker)

1. Go to **console.anthropic.com** and sign up / log in.
2. Click your profile (top right) → **API Keys** → **Create Key**. Give it a name like `m23-cashew-advisor`.
3. **Copy the key immediately and save it somewhere safe** — Anthropic will not show it to you again.
4. Go to **Plans & Billing** in the left nav. New accounts can usually claim free trial credits by adding a phone number — no card needed to start. If you want to skip straight to paid, pick the **Build** plan and add a card; you choose how much credit to load.

You don't need much credit to get through Build Week — text and vision calls for a prototype are cheap (fractions of a cent to a few cents per call on Claude Sonnet 5). Keep the key private; never put it in frontend code or commit it to a public repo.

Sources: [How to Get an Anthropic API Key](https://go.collab365.com/how-to-get-anthropic-api-key), [How to get your Anthropic API key (3 steps)](https://www.merge.dev/blog/anthropic-api-key)

## Step 2 — Start the Lovable project

Go to lovable.dev, create a new project, and paste this as your first prompt:

> Build a mobile-first web app called "M23 Cashew Advisor" for smallholder cashew farmers in Cambodia. Dark theme: background near-black (#171717), card surfaces slightly lighter (#232323), accent color emerald green (#065f46 filled, #34d399 for bright text/icons), body text off-white (#fafaf9), muted text warm gray (#a8a29e). Fonts: Manrope for Latin text, Noto Sans Khmer for Khmer text — most UI text should show both languages together, Khmer primary.
>
> Layout, single main screen:
> 1. Top bar: app name/logo on the left, a language toggle (EN / ខ្មែរ) pill on the right.
> 2. Below that, a horizontally scrollable 5-stage lifecycle tracker for the M23 cashew growing cycle: Planting (ការដាំដុះ), Vegetative (ដំណាក់កាលលូតលាស់), Flowering (ការចេញផ្កា), Fruit Development (ការលូតលាស់ផ្លែ), Harvesting (ការប្រមូលផល). Each stage is a circular icon with a label above a connecting line; highlight whichever stage is "active."
> 3. Below that, a chat interface: a scrolling message area, and a bottom input bar with a text field (Khmer placeholder "សួរអំពីដើមស្វាយចន្ទី M23 របស់អ្នក..."), a camera/photo-attach button, and a send button.
>
> Farmer messages are right-aligned bubbles in the accent green; AI messages are left-aligned bubbles in the card surface color. When the AI response is a diagnosis (from a photo), render it as a structured card: a title line, a confidence/verify note in an amber warning box, a symptoms description, and a numbered list of recommended steps — each shown in Khmer with a smaller English line underneath.
>
> Connect this project to Supabase (use Lovable's native Supabase integration). I'll provide a Supabase Edge Function separately to handle the actual AI calls — for now just set up the connection and leave a placeholder function call in the chat send handler and the photo-attach handler.

Let Lovable finish scaffolding, then review the result before moving on — Lovable can misjudge details on the first pass, so this is a starting point to correct, not a final answer.

## Step 3 — Add the Edge Function

I've written the full Edge Function code for you (see `supabase-function-cashew-advisor.ts` — same knowledge base and rules as your Claude-artifact prototype, so both builds answer consistently). Two ways to get it in:

**Option A — ask Lovable directly:** paste this as a prompt:
> Create a Supabase Edge Function named `cashew-advisor`. I'll paste the full code next. It expects `ANTHROPIC_API_KEY` as a secret and handles two request shapes: `{mode: "chat", turns: [...]}` for text Q&A and `{mode: "diagnose", imageBase64, mediaType}` for photo diagnosis.

Then paste the contents of `supabase-function-cashew-advisor.ts` when Lovable asks for the function code.

**Option B — do it directly in Supabase:** open your project's Supabase dashboard → Edge Functions → Create a new function named `cashew-advisor` → paste the file contents in as `index.ts` → Deploy.

## Step 4 — Add your API key as a secret

In Supabase: **Project Settings → Edge Functions → Secrets** (or via the CLI: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`). Add a secret named exactly `ANTHROPIC_API_KEY` with the key from Step 1. **Never** put this key in any file Lovable writes to the frontend — it must only live in this secret, read server-side by the Edge Function.

## Step 5 — Wire the frontend to the function

Ask Lovable to wire the chat send button and photo button to call the function. The call shapes:

```js
// Text Q&A — keep a running "turns" array in frontend state, oldest first,
// alternating user/assistant, ending on the newest user message.
const { data, error } = await supabase.functions.invoke('cashew-advisor', {
  body: { mode: 'chat', turns: [...conversationTurns, { role: 'user', content: farmerMessage }] }
});
// data.reply_km, data.gloss_en

// Photo diagnosis — convert the picked file to base64 first (strip the
// "data:image/jpeg;base64," prefix, keep just the base64 part).
const { data, error } = await supabase.functions.invoke('cashew-advisor', {
  body: { mode: 'diagnose', imageBase64: base64String, mediaType: file.type }
});
// data.matched, data.title_km/en, data.confidence_km/en, data.symptoms_km/en, data.steps_km/en
```

Tell Lovable: "Wire the send button to call this exact shape, show a typing/thinking indicator while waiting, and render the reply as described in the original design prompt (chat bubble for chat mode, diagnosis card for diagnose mode)."

## What you get at the end

A real URL (something like `your-project.lovable.app`, or a custom domain if you set one up) that works for **anyone** — no Claude account, no consent prompt, no public-sharing restriction. This is what goes in as your Public Product Link deliverable.

## Notes carried over from the prototype

- Replies are Khmer-first with a short English gloss, matching your Phase 2 decision.
- Photo diagnosis is constrained to the 8 book-documented pests/diseases — anything else gets an honest "doesn't match, get it checked" answer instead of a guess.
- The flowering spray protocol and pest-chemical dosages are flagged in the knowledge base as needing native-speaker verification before being treated as final — the AI is instructed to hedge on exact numbers accordingly. Get that Angkor Green review done before this goes in front of judges or real farmers, if you haven't already.
- Voice is still out of scope here, same as the prototype — that's a separate Khmer STT/TTS integration for after this is working.

// Vercel Serverless Function: /api/telegram
// Handles incoming Telegram Bot Webhooks for M23 Cashew Advisor (@cambodia_cashew_advisor_bot).
// Reuses the exact same Gemini AI advisor and knowledge base as the web app.

import { handleAdvisor, type Diagnosis, type ChatReply } from "./_lib/advisor.js";
import { synthesizeKhmer } from "./tts.js";
import {
  getOrCreateFarmerByTelegram,
  updateFarmerProfile,
  recordSpray,
  recordInquiry,
  getFarmerSummary,
  issueLinkingCode,
  linkByCode,
  type FarmerRecord,
} from "./_lib/db.js";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
function toKhmerDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => KH_DIGITS[Number(d)] ?? d);
}

const KHMER_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
];

const SEASONS: Record<number, { km: string; en: string; tasks: string[]; pests: string[] }> = {
  1: {
    km: "ផ្ការីក និងសន្សើមប្រៃ",
    en: "Bloom and acid dew",
    tasks: ["ពេលផ្ការីក បាញ់តែពីម៉ោង ១ រសៀល ដល់យប់", "ពិនិត្យសន្សើមប្រៃរាល់ព្រឹក (សំណើម >៨២%)"],
    pests: ["មូសតែ", "ទ្រីប (ក្រាភ្លើង)", "ចៃស"],
  },
  2: {
    km: "ផ្ការីក ក្ដិប និងសត្វល្អិត",
    en: "Bloom, fruit set and pests",
    tasks: ["ក្ដិបខ្មៅជ្រុះ? រកមូលហេតុពិតមុនទិញថ្នាំ", "បាញ់ការពារក្ដិបចន្ទី"],
    pests: ["មូសតែ", "ទ្រីប", "ចៃស"],
  },
  3: {
    km: "ប្រមូលផល",
    en: "Harvest",
    tasks: ["រើសតែគ្រាប់ទុំជ្រុះ កុំបេះគ្រាប់ខ្ចី", "ហាលលើការ៉ូ ២-៣ ថ្ងៃ ឲ្យសំណើមក្រោម ១១%"],
    pests: ["ទ្រីប", "ចៃស"],
  },
  4: {
    km: "ប្រមូលផល និងហាល",
    en: "Harvest and drying",
    tasks: ["ហាលគ្រាប់ស្ងួតល្អ", "ទុកគ្រាប់លើប៉ាឡែត ក្នុងឃ្លាំងខ្យល់ចេញចូល"],
    pests: ["ទ្រីប", "ចៃស"],
  },
  5: {
    km: "ចុងប្រមូលផល ដើមរដូវភ្លៀង",
    en: "End of harvest, first rains",
    tasks: ["កាត់មែកក្រោយប្រមូលផល ហើយលាបស្នាមកាត់ភ្លាម", "ដាក់ជីដីលើកទី១ ពេលភ្លៀងដើមរដូវ"],
    pests: ["ដង្កូវដួងស៊ីគល់ និងឫស"],
  },
  6: {
    km: "រដូវដាំ និងដាក់ជី",
    en: "Planting and fertilizing",
    tasks: ["ដាំកូនចន្ទីផ្សាំក្នុងរដូវភ្លៀង", "ការពារដង្កូវដួង៖ កុំឲ្យគល់មានរបួស"],
    pests: ["មូសតែ", "ដង្កូវដួង"],
  },
  7: {
    km: "ដាក់ជី និងថែកូនចន្ទី",
    en: "Fertilizing and young tree care",
    tasks: ["ដាក់ជីដីលើកទី២ (រូបមន្តតាមអាយុដើម)", "កាត់មែកដុះពីជើងទម្រចោល"],
    pests: ["មូសតែ", "ដង្កូវដួង"],
  },
  8: {
    km: "ចាប់ផ្ដើមបញ្ចុះផ្កា",
    en: "Start flower induction",
    tasks: ["ដើម ៥ ឆ្នាំឡើង៖ ចាប់ផ្ដើមបាញ់បញ្ចុះត្រួយទី១", "ដើមក្រោម ៥ ឆ្នាំ មិនទាន់គួរបញ្ចុះផ្កាទេ"],
    pests: ["មូសតែ"],
  },
  9: {
    km: "បញ្ចុះត្រួយទី១",
    en: "Pushing flush 1",
    tasks: ["ថែត្រួយទី១៖ ការពារមូសតែ និងចិញ្ចឹមត្រួយ", "កុំដាក់ជីដីក្រោយចុងខែ៩ (ដីស្ងួតឫសមិនស្រូប)"],
    pests: ["មូសតែ"],
  },
  10: {
    km: "ត្រួយផ្កា និងភ្ជួរដី",
    en: "Flower flush and ploughing",
    tasks: ["ត្រួយទី១ ចាស់ហើយ៖ បាញ់ជីស្លឹក P K ខ្ពស់ ឲ្យចេញត្រួយផ្កា", "ភ្ជួរដី ឬកាត់ស្មៅក្នុងចម្ការ"],
    pests: ["មូសតែ"],
  },
  11: {
    km: "ចេញកញ្ចុំផ្កា",
    en: "Panicles emerging",
    tasks: ["កញ្ចុំផ្កាចេញ៖ កម្ចាត់សត្វល្អិត និងបាញ់ថ្នាំផ្សិតមុនផ្ការីក", "កូនខ្ពស់ ៨-៩ តឹក៖ កាត់ចុងឲ្យបែកមែក ២-៤"],
    pests: ["មូសតែ", "ទ្រីប (ក្រាភ្លើង)"],
  },
  12: {
    km: "ផ្ការីក",
    en: "Bloom",
    tasks: ["ពេលផ្ការីក បាញ់តែពីម៉ោង ១ រសៀល ដល់យប់", "ពិនិត្យសន្សើមប្រៃពេលព្រឹកព្រលឹម"],
    pests: ["មូសតែ", "ទ្រីប"],
  },
};

// Helper: send Telegram API requests
async function tgApi(method: string, payload: Record<string, unknown>) {
  if (!TELEGRAM_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    console.error(`Telegram API ${method} failed:`, data);
  }
  return data;
}

// Send chat action (e.g. "typing", "upload_photo", "record_voice")
async function sendChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" | "record_voice" | "upload_voice" | "upload_document",
) {
  return tgApi("sendChatAction", { chat_id: chatId, action });
}

// Send message to Telegram chat
async function sendMessage(
  chatId: number | string,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

// Send audio (voice note) to Telegram
async function sendAudio(chatId: number | string, audioBuffer: Buffer, caption?: string) {
  if (!TELEGRAM_TOKEN) return;
  const form = new FormData();
  form.append("chat_id", String(chatId));
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
  form.append("audio", blob, "voice_reply.mp3");
  if (caption) form.append("caption", caption);
  const res = await fetch(`${TELEGRAM_API}/sendAudio`, {
    method: "POST",
    body: form,
  });
  return res.json().catch(() => null);
}

// Send both text message AND automatic voice note
async function sendAnswerWithVoice(
  chatId: number | string,
  htmlText: string,
  spokenText: string,
  extra: Record<string, unknown> = {},
) {
  await sendMessage(chatId, htmlText, extra);
  try {
    const cleanSpoken = spokenText.replace(/<[^>]+>/g, "").slice(0, 800);
    const audioBuf = await synthesizeKhmer(cleanSpoken);
    if (audioBuf && audioBuf.length > 0) {
      await sendAudio(chatId, audioBuf, "🔊 សំឡេងណែនាំ");
    }
  } catch (err) {
    console.warn("TTS audio failed:", err);
  }
}

// Download file bytes from Telegram and return base64 string
async function getTelegramPhotoBase64(fileId: string): Promise<{ base64: string; mimeType: "image/jpeg" } | null> {
  const fileInfo = await tgApi("getFile", { file_id: fileId });
  if (!fileInfo?.ok || !fileInfo.result?.file_path) return null;

  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.result.file_path}`;
  const resp = await fetch(fileUrl);
  if (!resp.ok) return null;

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    base64: buffer.toString("base64"),
    mimeType: "image/jpeg",
  };
}

// Download voice/audio bytes from Telegram and return base64 string
async function getTelegramAudioBase64(fileId: string): Promise<{ base64: string; mimeType: string } | null> {
  const fileInfo = await tgApi("getFile", { file_id: fileId });
  if (!fileInfo?.ok || !fileInfo.result?.file_path) return null;

  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.result.file_path}`;
  const resp = await fetch(fileUrl);
  if (!resp.ok) return null;

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    base64: buffer.toString("base64"),
    mimeType: "audio/ogg",
  };
}

// Build Monthly seasonal advice in Khmer (Ultra-short, 3 punchy lines)
function getMonthlyAdviceMessage(): { text: string; spoken: string } {
  const m = new Date().getMonth() + 1;
  const monthNameKm = KHMER_MONTHS[m - 1] ?? `ខែទី${toKhmerDigits(m)}`;
  const season = SEASONS[m] ?? SEASONS[11];
  const topTask = season.tasks[0] || "ថែទាំចម្ការធម្មតា";
  const topPest = season.pests[0] || "មមាចមូស";

  const text =
    `📅 <b>ខែ${monthNameKm} — ដំណាក់កាល៖ ${season.km}</b>\n\n` +
    `✅ <b>កិច្ចការបន្ទាន់៖</b> ${topTask}\n` +
    `⚠️ <b>សត្វល្អិតត្រូវប្រយ័ត្ន៖</b> ${topPest}`;

  const spoken = `ខែ${monthNameKm} ដំណាក់កាល ${season.km}។ កិច្ចការបន្ទាន់៖ ${topTask}។ សត្វល្អិតត្រូវប្រយ័ត្នគឺ ${topPest}។`;

  return { text, spoken };
}

// Bottom Persistent Keyboard (sits under the typing input bar — clean Khmer, no slashes)
const BOTTOM_KEYBOARD = {
  keyboard: [
    [{ text: "🗓️ កិច្ចការខែនេះ" }, { text: "📋 កាតចម្ការរបស់ខ្ញុំ" }],
    [{ text: "🐛 សត្វមមាចមូស" }, { text: "🌸 ការថែទាំផ្កា" }],
    [{ text: "📍 កំណត់ចម្ការ" }, { text: "❓ របៀបប្រើ" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Shows the farmer the 4-digit code they need to link their web account.
async function sendLinkingCode(chatId: number | string, farmer: FarmerRecord | null) {
  if (!farmer) return;
  // A farmer who already has a phone number is linked to the web already.
  if (farmer.phone) {
    await sendMessage(
      chatId,
      `✅ <b>គណនាជាមួយកម្មវិធីគេហទំព័ររួចហើយ។</b>\n` +
        `គណនា៖ ${farmer.phone}\n\n` +
        `Your account is already linked to the web app.`,
    );
    return;
  }

  const code = farmer.linking_code || (await issueLinkingCode(farmer.id));
  if (!code) return;

  await sendMessage(
    chatId,
    `🔗 <b>ភ្ជាក់គណនាជាមួយកម្មវិធីគេហទំព័រ</b>\n\n` +
      `លេខកូដរបស់អ្នក៖ <b>${code}</b>\n\n` +
      `សូមបញ្ចូលលេខនេះនៅកម្មវិធីគេហទំព័រ រួចចុច <b>ចុះឈ្មោះ</b>។\n\n` +
      `Your code is <b>${code}</b>. Enter it on the web app when you register, then your phone records and your Telegram account join together.`,
  );
}

// Welcome greeting message (Ultra-short, voice friendly, no code slashes)
function getWelcomeMessage(firstName?: string): { text: string; reply_markup: Record<string, unknown> } {
  const greeting = firstName ? `សួស្តីបង <b>${firstName}</b>!` : `សួស្តីបងប្អូនកសិករ!`;
  const text =
    `${greeting} 🌾\n` +
    `ខ្ញុំជា <b>ទីប្រឹក្សាស្វាយចន្ទី M-23</b>។\n\n` +
    `👉 <b>ចុចប៊ូតុងធំៗខាងក្រោម</b> ឬ <b>ថតរូបស្លឹកឈឺផ្ញើមក</b> ឬ <b>ចុចសង្កត់លើមេក្រូដើម្បីនិយាយ</b>។`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "📍 កំណត់ទីតាំងចម្ការ", callback_data: "cmd_setup" }],
      [{ text: "🔗 ភ្ជាក់គណនា Telegram", callback_data: "cmd_link" }],
      [{ text: "🗓️ កិច្ចការសំខាន់ខែនេះ", callback_data: "cmd_today" }],
    ],
  };

  return { text, reply_markup };
}

// GET: check bot status or configure webhook
export async function GET(request: Request) {
  const url = new URL(request.url);
  const setWebhookUrl = url.searchParams.get("set_webhook");

  if (!TELEGRAM_TOKEN) {
    return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 500 });
  }

  if (setWebhookUrl) {
    const res = await tgApi("setWebhook", {
      url: setWebhookUrl,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });
    return Response.json({ action: "setWebhook", target: setWebhookUrl, result: res });
  }

  const [me, webhookInfo] = await Promise.all([
    tgApi("getMe", {}),
    tgApi("getWebhookInfo", {}),
  ]);

  return Response.json({
    ok: true,
    bot: me?.result,
    webhook: webhookInfo?.result,
  });
}

// POST: Telegram Webhook updates
export async function POST(request: Request) {
  try {
    const update = await request.json().catch(() => null);
    if (!update) return Response.json({ ok: true });

    // Look up or initialize farmer in Supabase PostgreSQL
    const fromUser = update.message?.from || update.callback_query?.from;
    const farmer = fromUser
      ? await getOrCreateFarmerByTelegram(fromUser.id, {
          username: fromUser.username,
          firstName: fromUser.first_name,
        })
      : null;

    const farmContext = farmer
      ? {
          age: farmer.tree_age_years ?? null,
          soil: (farmer.soil_type as 1 | 2 | 3) ?? null,
          hectares: farmer.hectares ? Number(farmer.hectares) : null,
          village: farmer.province || "",
        }
      : undefined;

    // 1. Handle Inline Button Clicks (Callback Queries)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data as string;

      // Acknowledge callback query
      await tgApi("answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});

      if (!chatId) return Response.json({ ok: true });

      // Profile onboarding callbacks
      if (data.startsWith("set_prov:") && farmer) {
        const prov = data.replace("set_prov:", "");
        await updateFarmerProfile(farmer.id, { province: prov });
        const text =
          `📍 បានកត់ត្រាខេត្ត៖ <b>${prov}</b> ✅\n\n` +
          `🌳 <b>តើដើមស្វាយចន្ទីរបស់អ្នកអាយុប៉ុន្មានឆ្នាំហើយ?</b>`;
        await sendMessage(chatId, text, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🌱 ១-២ ឆ្នាំ", callback_data: "set_age:2" },
                { text: "🌿 ៣-៥ ឆ្នាំ", callback_data: "set_age:4" },
              ],
              [
                { text: "🌳 ៦ ឆ្នាំឡើង", callback_data: "set_age:7" },
              ],
            ],
          },
        });
        return Response.json({ ok: true });
      }

      if (data.startsWith("set_age:") && farmer) {
        const age = parseInt(data.replace("set_age:", ""), 10);
        await updateFarmerProfile(farmer.id, { tree_age_years: age });
        const text =
          `✅ <b>រៀបចំកម្រងព័ត៌មានចម្ការរួចរាល់!</b>\n` +
          `ប្រព័ន្ធទិន្នន័យបានកត់ត្រាដើមអាយុ <b>${toKhmerDigits(age)} ឆ្នាំ</b>។\n\n` +
          `ឥឡូវនេះ រាល់ការណែនាំអំពីការដាក់ជី ថ្នាំ និងការបញ្ចុះផ្កា នឹងត្រូវគណនាដោយស្វ័យប្រវត្តិតាមអាយុដើមរបស់អ្នកជានិច្ច! 🌾`;
        await sendMessage(chatId, text, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🗓️ មើលកិច្ចការខែនេះ", callback_data: "cmd_today" }],
            ],
          },
        });
        return Response.json({ ok: true });
      }

      // Log Spray Action
      if (data.startsWith("log_spray:") && farmer) {
        const parts = data.split(":");
        const purpose = (parts[1] || "insect") as any;
        const target = parts[2] || "pest";
        await recordSpray({
          farmer_id: farmer.id,
          purpose,
          target_pest: target,
          notes: "Logged via Telegram quick-action button",
          source: "telegram",
        });
        await sendMessage(
          chatId,
          `✅ <b>បានកត់ត្រាក្នុងសៀវភៅបាញ់ថ្នាំរួចរាល់!</b>\n` +
            `កាលបរិច្ឆេទ៖ ${new Date().toISOString().split("T")[0]}\n` +
            `ទិន្នន័យត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធទិន្នន័យកណ្តាល (Supabase) ដើម្បីចេញ Farm Passport។ 📋`,
        );
        return Response.json({ ok: true });
      }

      if (data === "cmd_link") {
        await sendLinkingCode(chatId, farmer);
        return Response.json({ ok: true });
      }

      if (data === "cmd_setup") {
        await sendMessage(
          chatId,
          `🌾 <b>ជ្រើសរើសខេត្តដែលចម្ការរបស់អ្នកស្ថិតនៅ៖</b>`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "📍 កំពង់ធំ", callback_data: "set_prov:កំពង់ធំ" },
                  { text: "📍 ក្រចេះ", callback_data: "set_prov:ក្រចេះ" },
                ],
                [
                  { text: "📍 រតនគិរី", callback_data: "set_prov:រតនគិរី" },
                  { text: "📍 កំពង់ចាម", callback_data: "set_prov:កំពង់ចាម" },
                ],
                [{ text: "📍 ផ្សេងៗ", callback_data: "set_prov:ផ្សេងៗ" }],
              ],
            },
          },
        );
        return Response.json({ ok: true });
      }

      if (data === "cmd_today") {
        const advice = getMonthlyAdviceMessage();
        await sendAnswerWithVoice(chatId, advice.text, advice.spoken);
      } else if (data === "ask_tmb") {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "តើសត្វមមាចមូសលើស្វាយចន្ទីបង្កផលប៉ះពាល់អ្វីខ្លះ ហើយត្រូវកម្ចាត់ដូចម្តេច? សូមឆ្លើយខ្លីៗបំផុត ២-៣ ជួរ ដាក់ឈ្មោះថ្នាំ កម្រិតប្រើ និងម៉ោងបាញ់",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `🐛 <b>សត្វមមាចមូស (Tea Mosquito Bug)</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
      } else if (data === "ask_bloom") {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "ពេលស្វាយចន្ទីចេញផ្ការីក តើត្រូវបាញ់ថ្នាំនៅម៉ោងណាទើបមិនខូចផ្កា? សូមឆ្លើយខ្លីៗបំផុត ២ ជួរ",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `🌸 <b>ការថែទាំផ្ការីក</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
      } else if (data === "ask_dew") {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "តើសន្សើមប្រៃជាអ្វី ហើយពេលណាត្រូវបាញ់ថ្នាំការពារ? សូមឆ្លើយខ្លីៗបំផុត ២ ជួរ ដាក់ឈ្មោះថ្នាំ",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `💧 <b>ការការពារសន្សើមប្រៃ</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
      } else if (data === "ask_fert") {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "តើស្វាយចន្ទីត្រូវដាក់ជីរូបមន្តអ្វីខ្លះ? សូមឆ្លើយខ្លីៗបំផុត ២ ជួរ ដាក់រូបមន្តជី",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `🌱 <b>ការប្រើប្រាស់ជី</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
      }

      return Response.json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.chat) {
      return Response.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim();

    // 2. Handle Photo Message (Diagnosis)
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      await sendChatAction(chatId, "upload_photo");

      const largestPhoto = message.photo[message.photo.length - 1];
      const photoData = await getTelegramPhotoBase64(largestPhoto.file_id);

      if (!photoData) {
        await sendMessage(chatId, "⚠️ មិនអាចទាញយករូបភាពបានទេ។ សូមព្យាយាមផ្ញើម្តងទៀត។");
        return Response.json({ ok: true });
      }

      await sendMessage(chatId, "⏳ កំពុងពិនិត្យរូបភាពជំងឺស្វាយចន្ទី សូមរង់ចាំបន្តិច...");
      await sendChatAction(chatId, "typing");

      const caption = message.caption?.trim();
      const diagnosis = (await handleAdvisor({
        mode: "diagnose",
        imageBase64: photoData.base64,
        mediaType: photoData.mimeType,
        note: caption || undefined,
      })) as Diagnosis;

      let replyMsg = "";
      let spokenDiag = "";
      if (diagnosis.matched) {
        replyMsg += `🔍 <b>${diagnosis.title_km}</b>\n`;
        if (diagnosis.title_en) replyMsg += `<i>(${diagnosis.title_en})</i>\n\n`;

        if (diagnosis.steps_km && diagnosis.steps_km.length > 0) {
          replyMsg += `💊 <b>ថ្នាំ & កម្រិតប្រើ៖</b>\n`;
          for (const s of diagnosis.steps_km.slice(0, 2)) {
            replyMsg += `• ${s}\n`;
          }
        }
        spokenDiag = `លទ្ធផលវិភាគ៖ ${diagnosis.title_km}។ ${diagnosis.steps_km?.slice(0, 2).join(". ") || ""}`;
      } else {
        replyMsg += `⚠️ <b>មិនទាន់ច្បាស់លាស់ទេ</b>\n\n`;
        const advice = diagnosis.steps_km?.[0] || "សូមថតរូបស្លឹក ឬផ្កាឱ្យជិត និងច្បាស់ក្រោមពន្លឺថ្ងៃ";
        replyMsg += `💡 ${advice}\n`;
        spokenDiag = `មិនទាន់ច្បាស់លាស់ទេ។ ${advice}`;
      }

      // Record photo diagnosis to database
      await recordInquiry({
        farmer_id: farmer?.id,
        channel: "telegram",
        mode: "diagnose",
        matched_condition: diagnosis.title_en || undefined,
        confidence: diagnosis.confidence_en || undefined,
        reply_text: diagnosis.title_km || undefined,
      });

      const photoButtons: Array<Array<{ text: string; callback_data: string }>> = [
        [{ text: "🗓️ មើលកិច្ចការខែនេះ", callback_data: "cmd_today" }],
      ];

      if (diagnosis.matched && farmer) {
        photoButtons.unshift([
          {
            text: "✅ កត់ត្រាការបាញ់ថ្នាំនេះ",
            callback_data: `log_spray:fungus:${diagnosis.title_en.slice(0, 15)}`,
          },
        ]);
      }

      await sendAnswerWithVoice(chatId, replyMsg, spokenDiag, {
        reply_markup: {
          inline_keyboard: photoButtons,
        },
      });

      return Response.json({ ok: true });
    }

    // 3. Handle Voice Message (Farmer speaking in Khmer)
    const voiceObj = message.voice || message.audio;
    if (voiceObj && voiceObj.file_id) {
      await sendChatAction(chatId, "typing");
      await sendMessage(chatId, "🎙️ <b>កំពុងស្តាប់សារសំឡេងរបស់អ្នក...</b>");

      const voiceData = await getTelegramAudioBase64(voiceObj.file_id);
      if (!voiceData) {
        await sendMessage(chatId, "⚠️ មិនអាចទាញយកសារសំឡេងបានទេ។ សូមព្យាយាមផ្ញើម្តងទៀត។");
        return Response.json({ ok: true });
      }

      await sendChatAction(chatId, "typing");
      const reply = (await handleAdvisor({
        mode: "audio",
        audioBase64: voiceData.base64,
        mediaType: voiceData.mimeType,
        farm: farmContext,
      })) as ChatReply;

      // Record voice inquiry to database
      await recordInquiry({
        farmer_id: farmer?.id,
        channel: "telegram",
        mode: "audio",
        reply_text: reply.reply_km,
      });

      let answerText = `🗣️ <b>ចម្លើយ៖</b>\n\n${reply.reply_km}`;
      if (reply.gloss_en) {
        answerText += `\n\n<i>${reply.gloss_en}</i>`;
      }

      await sendMessage(chatId, answerText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🗓️ កិច្ចការខែនេះ", callback_data: "cmd_today" }],
          ],
        },
      });

      // Generate & send spoken voice audio note back
      try {
        await sendChatAction(chatId, "upload_document");
        const audioBuffer = await synthesizeKhmer(reply.reply_km);
        if (audioBuffer && audioBuffer.length > 0) {
          await sendAudio(chatId, audioBuffer, "🔊 ចម្លើយជាសំឡេង");
        }
      } catch (err) {
        console.error("Failed to generate/send TTS voice audio:", err);
      }

      return Response.json({ ok: true });
    }

    // 4. Handle Text Messages & Commands
    if (text) {
      // /start command
      if (text.startsWith("/start")) {
        // Activate persistent keyboard under the typing bar
        await sendMessage(
          chatId,
          `🌾 <b>សូមស្វាគមន៍មកកាន់ M23 Cashew Advisor!</b>\nប៊ូតុងមុខងាររហ័សត្រូវបានដាក់នៅខាងក្រោមរបារវាយអក្សរ។`,
          { reply_markup: BOTTOM_KEYBOARD },
        );

        const welcome = getWelcomeMessage(message.from?.first_name);
        const kb = [...(welcome.reply_markup.inline_keyboard as any[])];
        if (!farmer?.province) {
          kb.unshift([{ text: "📍 កំណត់ទីតាំងចម្ការ (Set Farm)", callback_data: "cmd_setup" }]);
        }
        await sendMessage(chatId, welcome.text, { reply_markup: { inline_keyboard: kb } });

        // Show the linking code, so the farmer can join their web account.
        await sendLinkingCode(chatId, farmer);
        return Response.json({ ok: true });
      }

      // /link 1234 — connect this Telegram account to a web registration.
      if (text.startsWith("/link")) {
        const code = text.replace(/^\/link\s*/i, "").replace(/\s+/g, "");
        if (!/^\d{4}$/.test(code)) {
          await sendMessage(
            chatId,
            `❌ <b>លេខកូដមិនត្រឹមត្រូវ។</b>\n\n` +
              `សូមវាយលេខ ៤ ដូចតែ <b>/link 1234</b>\n\n` +
              `That is not a 4-digit code. Type it like <b>/link 1234</b>.`,
          );
          return Response.json({ ok: true });
        }

        if (!farmer) {
          await sendMessage(chatId, "⚠️ មិនអាចភ្ជាក់បានទេ។ សូមសាកល្បងម្តងទៀត។");
          return Response.json({ ok: true });
        }

        // The code holder is the web registration; this Telegram row merges into it.
        const result = await linkByCode(farmer.id, code);
        if (result.ok) {
          await sendMessage(
            chatId,
            `✅ <b>ភ្ជាក់គណនាដោយជោគជោគរួចរាល់!</b>\n\n` +
              `ឥឡូវនេះកាតចម្ការ និងកំណត់ត្រាបាញ់ថ្នាំរបស់អ្នកនឹងបង្ហាញក្នុងទូរស័ព្ទ និងនៅទីនេះដើម្បីដាក់ព័ត៌មាន។ 🌾\n\n` +
              `Your farm card and spray records are now the same on your phone and in Telegram.`,
          );
        } else {
          const messages: Record<string, string> = {
            not_found:
              `❌ <b>រកមិនឃើញលេខកូដនេះទេ។</b>\n\n` +
              `សូមពិនិត្យលេខ ៤ ដងទៀត ហើយប្រាកដថា អ្នកបានចុះឈ្មោះនៅគេហទំព័រ។\n\n` +
              `No code matches. Check the 4 digits and make sure you registered on the web app first.`,
            expired:
              `⌛ <b>លេខកូដបានផុតកំណត់។</b>\n\n` +
              `សូមចុះឈ្មោះម្តងទៀតនៅគេហទំព័រ ដើម្បីបានលេខកូដថ្មី។\n\n` +
              `That code has expired. Register again on the web app to get a fresh one.`,
            conflict:
              `⚠️ <b>គណនាមិនអាចបាន។</b>\n\n` +
              `លេខកូដនេះជាការចុះឈ្មោះមួយផ្សេងទៀត។ សូមសួរម្នាក់ការងារយើង។\n\n` +
              `That code belongs to a different registration. Please contact our team.`,
            self:
              `ℹ️ <b>លេខកូដនេះជារបស់អ្នកឯង។</b>\n\n` +
              `សូមប្រើលេខកូដពីការចុះឈ្មោះនៅគេហទំព័រ។\n\n` +
              `That is your own code. Use the code shown on the web app after you register there.`,
          };
          const fallback =
            `❌ <b>មិនអាចភ្ជាក់បានទេ។</b> សូមសាកល្បងម្តងទៀត។\n\nCould not link. Please try again.`;
          await sendMessage(chatId, messages[result.reason] ?? fallback);
        }
        return Response.json({ ok: true });
      }

      // Persistent keyboard button: Set Farm
      if (text.includes("កំណត់ចម្ការ")) {
        await sendMessage(chatId, `🌾 <b>ជ្រើសរើសខេត្តដែលចម្ការរបស់អ្នកស្ថិតនៅ៖</b>`, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📍 កំពង់ធំ", callback_data: "set_prov:កំពង់ធំ" },
                { text: "📍 ក្រចេះ", callback_data: "set_prov:ក្រចេះ" },
              ],
              [
                { text: "📍 រតនគិរី", callback_data: "set_prov:រតនគិរី" },
                { text: "📍 កំពង់ចាម", callback_data: "set_prov:កំពង់ចាម" },
              ],
              [{ text: "📍 ផ្សេងៗ", callback_data: "set_prov:ផ្សេងៗ" }],
            ],
          },
        });
        return Response.json({ ok: true });
      }

      // Persistent keyboard button: Tea Mosquito Bug
      if (text.includes("សត្វមមាចមូស") || text.includes("មមាចមូស")) {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "តើសត្វមមាចមូសលើស្វាយចន្ទីបង្កផលប៉ះពាល់អ្វីខ្លះ ហើយត្រូវកម្ចាត់ដូចម្តេច? សូមឆ្លើយខ្លីៗបំផុត ២-៣ ជួរ ដាក់ឈ្មោះថ្នាំ កម្រិតប្រើ និងម៉ោងបាញ់",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `🐛 <b>សត្វមមាចមូស (Tea Mosquito Bug)</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
        return Response.json({ ok: true });
      }

      // Persistent keyboard button: Flower care
      if (text.includes("ការថែទាំផ្កា") || text.includes("ថែទាំផ្កា")) {
        await sendChatAction(chatId, "typing");
        const reply = (await handleAdvisor({
          mode: "chat",
          farm: farmContext,
          turns: [
            {
              role: "user",
              content:
                "ពេលស្វាយចន្ទីចេញផ្ការីក តើត្រូវបាញ់ថ្នាំនៅម៉ោងណាទើបមិនខូចផ្កា? សូមឆ្លើយខ្លីៗបំផុត ២ ជួរ",
            },
          ],
        })) as ChatReply;
        await sendAnswerWithVoice(
          chatId,
          `🌸 <b>ការថែទាំផ្ការីក</b>\n\n${reply.reply_km}`,
          reply.reply_km,
        );
        return Response.json({ ok: true });
      }

      // /passport or Farm Card overview from DB (Ultra-short, no code slashes)
      if (text.startsWith("/passport") || text.includes("កាតចម្ការ") || text.includes("កាត") || text.includes("របាយការណ៍")) {
        if (!farmer) {
          await sendMessage(chatId, "⚠️ មិនទាន់មានទិន្នន័យចម្ការទេ។ សូមចុចប៊ូតុង [ 📍 កំណត់ចម្ការ ]");
          return Response.json({ ok: true });
        }
        const summary = await getFarmerSummary(farmer.id);
        const sprayCount = summary?.sprays?.length ?? 0;
        const harvestCount = summary?.harvests?.length ?? 0;

        const passMsg =
          `📋 <b>កាតចម្ការស្វាយចន្ទី</b>\n\n` +
          `👤 <b>កសិករ៖</b> ${farmer.name_km || farmer.telegram_username || "កសិករស្វាយចន្ទី"}\n` +
          `📍 <b>ខេត្ត៖</b> ${farmer.province || "មិនទាន់កំណត់"} | <b>ដើមអាយុ៖</b> ${farmer.tree_age_years ? `${toKhmerDigits(farmer.tree_age_years)} ឆ្នាំ` : "មិនទាន់កំណត់"}\n\n` +
          `📊 <b>កំណត់ត្រាក្នុងប្រព័ន្ធ៖</b>\n` +
          `• បាញ់ថ្នាំរួចរាល់៖ <b>${toKhmerDigits(sprayCount)}</b> លើក ✅\n` +
          `• លក់ផលបានកត់ត្រា៖ <b>${toKhmerDigits(harvestCount)}</b> លើក ✅`;

        const spokenPass = `កាតចម្ការរបស់បង ${farmer.name_km || ""}។ បាញ់ថ្នាំបានកត់ត្រាចំនួន ${sprayCount} លើក។ លក់ផលបានកត់ត្រា ${harvestCount} លើក។`;

        await sendAnswerWithVoice(chatId, passMsg, spokenPass, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📍 កែប្រែព័ត៌មានចម្ការ", callback_data: "cmd_setup" }],
              [{ text: "🗓️ មើលកិច្ចការខែនេះ", callback_data: "cmd_today" }],
            ],
          },
        });
        return Response.json({ ok: true });
      }

      // /today or Monthly task button
      if (text.startsWith("/today") || text.startsWith("/season") || text.includes("ខែនេះ") || text.includes("កិច្ចការ")) {
        const advice = getMonthlyAdviceMessage();
        await sendAnswerWithVoice(chatId, advice.text, advice.spoken, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🐛 សត្វមមាចមូស", callback_data: "ask_tmb" }, { text: "🌸 ការថែទាំផ្កា", callback_data: "ask_bloom" }],
            ],
          },
        });
        return Response.json({ ok: true });
      }

      // /help or Help button
      if (text.startsWith("/help") || text.includes("របៀបប្រើ") || text.includes("ជំនួយ")) {
        const helpText =
          `❓ <b>របៀបប្រើប្រាស់ងាយៗ</b>\n\n` +
          `1️⃣ <b>សួរសំណួរ៖</b> ចុចសង្កត់លើមេក្រូដើម្បីនិយាយ\n` +
          `2️⃣ <b>ពិនិត្យជំងឺ៖</b> ថតរូបស្លឹក ឬផ្កាផ្ញើមកទីនេះ\n` +
          `3️⃣ <b>កិច្ចការខែនេះ៖</b> ចុចប៊ូតុង [ 🗓️ កិច្ចការខែនេះ ] នៅខាងក្រោមដៃ`;
        const spokenHelp =
          "របៀបប្រើប្រាស់ងាយៗ៖ ទីមួយ ចុចសង្កត់លើមេក្រូដើម្បីនិយាយសួរសំណួរ។ ទីពីរ ថតរូបស្លឹក ឬផ្កាផ្ញើមកទីនេះដើម្បីពិនិត្យជំងឺ។ ទីបី ចុចប៊ូតុងកិច្ចការខែនេះនៅខាងក្រោមដៃ។";
        await sendAnswerWithVoice(chatId, helpText, spokenHelp);
        return Response.json({ ok: true });
      }

      // Normal chat question to Gemini Advisor (Ultra-short + Spoken voice)
      await sendChatAction(chatId, "typing");
      const reply = (await handleAdvisor({
        mode: "chat",
        farm: farmContext,
        turns: [{ role: "user", content: text }],
      })) as ChatReply;

      // Record inquiry to database
      await recordInquiry({
        farmer_id: farmer?.id,
        channel: "telegram",
        mode: "chat",
        question_text: text,
        reply_text: reply.reply_km,
      });

      let answerText = reply.reply_km;
      if (reply.gloss_en) {
        answerText += `\n\n<i>${reply.gloss_en}</i>`;
      }

      await sendAnswerWithVoice(chatId, answerText, reply.reply_km, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🗓️ កិច្ចការខែនេះ", callback_data: "cmd_today" }],
          ],
        },
      });

      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Always return HTTP 200 so Telegram does not get into an aggressive retry loop
    return Response.json({ ok: true, error: "Handled error" });
  }
}

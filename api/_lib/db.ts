// Server-side database client for Supabase PostgreSQL
// Manages unified farmer profiles, spray records, harvest logs, and outbreak surveillance.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let cachedClient: SupabaseClient | null = null;

function getCredentials(): { url: string; key: string } {
  let url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  let key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  // Fallback: If not in process.env, read directly from .env.local
  if (!url || !key) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("SUPABASE_URL=")) {
            url = trimmed.split("=", 2)[1].replace(/^["'\s]+|["'\s]+$/g, "");
          }
          if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=") || trimmed.startsWith("SUPABASE_ANON_KEY=")) {
            key = trimmed.split("=", 2)[1].replace(/^["'\s]+|["'\s]+$/g, "");
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return { url, key };
}

export function getDb(): SupabaseClient | null {
  const { url, key } = getCredentials();
  if (!url || !key) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return cachedClient;
}

export type FarmerRecord = {
  id: string;
  phone?: string | null;
  telegram_id?: number | null;
  telegram_username?: string | null;
  name_km?: string | null;
  province?: string | null;
  district?: string | null;
  commune?: string | null;
  village?: string | null;
  tree_age_years?: number | null;
  planted_year?: number | null;
  soil_type?: number | null;
  hectares?: number | null;
  linking_code?: string | null;
  linking_code_expires_at?: string | null;
  created_at: string;
};

// 1. Get or create farmer profile from Telegram
export async function getOrCreateFarmerByTelegram(
  telegramId: number,
  userData: { username?: string; firstName?: string },
): Promise<FarmerRecord | null> {
  const db = getDb();
  if (!db) return null;

  try {
    // Check if farmer exists
    const { data: existing, error: selectErr } = await db
      .from("farmers")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existing) {
      // A Telegram-only farmer still needs a code to claim their web account.
      if (!existing.phone && !existing.linking_code) {
        await issueLinkingCode(existing.id);
      }
      return existing as FarmerRecord;
    }

    // If select failed due to network, don't attempt insert
    if (selectErr) {
      console.warn("Supabase network error during lookup:", selectErr.message);
      return null;
    }

    // Create new farmer entry
    const { data: created, error: insertErr } = await db
      .from("farmers")
      .insert({
        telegram_id: telegramId,
        telegram_username: userData.username || null,
        name_km: userData.firstName || null,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.warn("Supabase insert error:", insertErr.message);
      return null;
    }
    // Give them a code straight away so they can link a web account.
    await issueLinkingCode(created.id);
    return created as FarmerRecord;
  } catch (err: any) {
    console.warn("Supabase connection warning:", err?.message || err);
    return null;
  }
}

// 1b. Register (or re-register) a farmer from the web app, keyed by phone.
// The web app and the Telegram bot share this table, so a farmer who signs up
// on the web can later be matched to their phone number in the bot.
export async function registerFarmer(payload: {
  name: string;
  phone: string;
  village?: string;
}): Promise<
  | { ok: true; id: string; linkingCode: string | null }
  | { ok: false; reason: "no_db" | "failed" }
> {
  const db = getDb();
  if (!db) return { ok: false, reason: "no_db" };

  try {
    // Upsert on phone so a farmer registering twice doesn't hit a unique clash.
    const { data, error } = await db
      .from("farmers")
      .upsert(
        {
          phone: payload.phone,
          name_km: payload.name,
          village: payload.village || null,
          consent: true,
        },
        { onConflict: "phone" },
      )
      .select("id, telegram_id")
      .single();

    if (error) {
      console.warn("registerFarmer warning:", error.message);
      return { ok: false, reason: "failed" };
    }

    // If the farmer already has a Telegram account, they are linked already and
    // do not need a code. Otherwise give them one to enter in the bot.
    let linkingCode: string | null = null;
    if (!data.telegram_id) {
      linkingCode = await issueLinkingCode(data.id);
    }

    return { ok: true, id: data.id, linkingCode };
  } catch (err: any) {
    console.warn("registerFarmer error:", err?.message || err);
    return { ok: false, reason: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Telegram linking
//
// A farmer can arrive through the web app or through the Telegram bot, and
// end up with two rows for the same person. A short-lived 4-digit code on one
// row lets them claim the other. The web row always survives the merge: it
// holds the phone number, name and village that only the web form knows.
// ---------------------------------------------------------------------------

const LINK_CODE_TTL_HOURS = 24;

function randomLinkingCode(): string {
  // 4 digits, first not 0, so it reads unambiguously over the phone.
  const n = 1000 + Math.floor(Math.random() * 9000);
  return String(n);
}

// Find a code that is not already in use by another farmer.
async function uniqueLinkingCode(db: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomLinkingCode();
    const { data } = await db
      .from("farmers")
      .select("id")
      .eq("linking_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  // 9000 codes is far more than the pilot will ever need; fall back to time.
  return String(Date.now()).slice(-4);
}

/**
 * Issue a fresh linking code for a farmer, replacing any previous one.
 * Returns the code, or null if the database is unavailable.
 */
export async function issueLinkingCode(farmerId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const code = await uniqueLinkingCode(db);
    const expires = new Date(Date.now() + LINK_CODE_TTL_HOURS * 3600_000).toISOString();
    const { error } = await db
      .from("farmers")
      .update({ linking_code: code, linking_code_expires_at: expires })
      .eq("id", farmerId);
    if (error) {
      console.warn("issueLinkingCode warning:", error.message);
      return null;
    }
    return code;
  } catch (err: any) {
    console.warn("issueLinkingCode error:", err?.message || err);
    return null;
  }
}

/**
 * Find the farmer holding a given linking code.
 * Returns null if the code is unknown or has expired.
 */
export async function findFarmerByLinkingCode(code: string): Promise<FarmerRecord | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("farmers")
      .select("*")
      .eq("linking_code", code)
      .maybeSingle();
    if (error || !data) return null;

    const expires = data.linking_code_expires_at ? new Date(data.linking_code_expires_at) : null;
    if (expires && expires.getTime() < Date.now()) return null;

    return data as FarmerRecord;
  } catch (err: any) {
    console.warn("findFarmerByLinkingCode error:", err?.message || err);
    return null;
  }
}

/**
 * Merge two farmer rows into one.
 *
 * `keeperId` survives and receives the other row's Telegram identity.
 * `otherId` is removed — but first, all of its records are moved across,
 * because spray_logs/harvest_logs/inquiries cascade on delete and would
 * otherwise be destroyed with the row.
 */
export async function mergeFarmers(
  keeperId: string,
  otherId: string,
): Promise<{ ok: true } | { ok: false; reason: "no_db" | "not_found" | "failed" }> {
  const db = getDb();
  if (!db) return { ok: false, reason: "no_db" };
  if (keeperId === otherId) return { ok: false, reason: "not_found" };

  try {
    const { data: other, error: readErr } = await db
      .from("farmers")
      .select("*")
      .eq("id", otherId)
      .maybeSingle();
    if (readErr || !other) return { ok: false, reason: "not_found" };

    // 1. Move every record onto the keeper before the row disappears.
    const moved = await Promise.all([
      db.from("spray_logs").update({ farmer_id: keeperId }).eq("farmer_id", otherId),
      db.from("harvest_logs").update({ farmer_id: keeperId }).eq("farmer_id", otherId),
      db.from("inquiries").update({ farmer_id: keeperId }).eq("farmer_id", otherId),
      db.from("reminders_queue").update({ farmer_id: keeperId }).eq("farmer_id", otherId),
    ]);
    for (const r of moved) {
      if (r.error) console.warn("mergeFarmers: could not move records", r.error.message);
    }

    // 2. Release the Telegram identity from the doomed row first. telegram_id is
    //    UNIQUE, so the keeper cannot take it while the other row still holds it.
    if (other.telegram_id != null) {
      const { error: releaseErr } = await db
        .from("farmers")
        .update({ telegram_id: null, telegram_username: null })
        .eq("id", otherId);
      if (releaseErr) {
        console.warn("mergeFarmers: could not release telegram_id", releaseErr.message);
        return { ok: false, reason: "failed" };
      }
    }

    // 3. Give the keeper the Telegram identity, and fill any field it lacks.
    //    The keeper (the web row) keeps its own name and village.
    const keeper = await db.from("farmers").select("*").eq("id", keeperId).maybeSingle();
    const k = keeper.data as FarmerRecord | undefined;
    const patch: Record<string, unknown> = {
      telegram_id: other.telegram_id ?? k?.telegram_id ?? null,
      telegram_username: other.telegram_username ?? k?.telegram_username ?? null,
      linking_code: null,
      linking_code_expires_at: null,
    };
    // Only fill the gaps; never overwrite what the web form collected.
    for (const field of ["province", "district", "commune", "village", "tree_age_years", "hectares", "soil_type"] as const) {
      if (other[field] != null && (k?.[field] == null)) patch[field] = other[field];
    }
    if (other.name_km && !k?.name_km) patch.name_km = other.name_km;

    const { error: updateErr } = await db.from("farmers").update(patch).eq("id", keeperId);
    if (updateErr) {
      console.warn("mergeFarmers: update failed", updateErr.message);
      return { ok: false, reason: "failed" };
    }

    // 4. Now the emptied row is safe to remove.
    const { error: deleteErr } = await db.from("farmers").delete().eq("id", otherId);
    if (deleteErr) {
      console.warn("mergeFarmers: delete failed", deleteErr.message);
      return { ok: false, reason: "failed" };
    }

    return { ok: true };
  } catch (err: any) {
    console.warn("mergeFarmers error:", err?.message || err);
    return { ok: false, reason: "failed" };
  }
}

/**
 * Link the farmer who owns `requesterId` to the farmer holding `code`.
 *
 * The row with the phone number is always the one that survives: the web
 * registration is the only place the phone, name and village are known.
 * The other row's records are moved across, not deleted.
 */
export async function linkByCode(
  requesterId: string,
  code: string,
): Promise<
  | { ok: true; keeperId: string }
  | { ok: false; reason: "no_db" | "not_found" | "expired" | "self" | "conflict" | "failed" }
> {
  const db = getDb();
  if (!db) return { ok: false, reason: "no_db" };

  const codeHolder = await findFarmerByLinkingCode(code);
  if (!codeHolder) {
    // Tell "unknown code" apart from "expired code" for a clearer message.
    const { data } = await db.from("farmers").select("id, linking_code_expires_at").eq("linking_code", code).maybeSingle();
    if (data?.linking_code_expires_at && new Date(data.linking_code_expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "not_found" };
  }

  if (codeHolder.id === requesterId) return { ok: false, reason: "self" };

  const requester = await db.from("farmers").select("*").eq("id", requesterId).maybeSingle();
  const requesterRow = requester.data as FarmerRecord | undefined;
  if (!requesterRow) return { ok: false, reason: "not_found" };

  const requesterHasPhone = !!requesterRow.phone;
  const holderHasPhone = !!codeHolder.phone;

  // Two web registrations cannot be merged — that would attach one farmer's
  // phone number to another farmer's records.
  if (requesterHasPhone && holderHasPhone) return { ok: false, reason: "conflict" };

  const keeperId = requesterHasPhone ? requesterId : codeHolder.id;
  const otherId = requesterHasPhone ? codeHolder.id : requesterId;

  const merged = await mergeFarmers(keeperId, otherId);
  if (!merged.ok) return { ok: false, reason: merged.reason };

  return { ok: true, keeperId };
}

/** Look up a farmer by their phone number (used by the web linking form). */
export async function findFarmerByPhone(phone: string): Promise<FarmerRecord | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const { data, error } = await db.from("farmers").select("*").eq("phone", phone).maybeSingle();
    if (error || !data) return null;
    return data as FarmerRecord;
  } catch (err: any) {
    console.warn("findFarmerByPhone error:", err?.message || err);
    return null;
  }
}

// 2. Update farmer profile (province, tree age, hectares)
export async function updateFarmerProfile(
  farmerId: string,
  updates: Partial<Omit<FarmerRecord, "id" | "created_at">>,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const { error } = await db.from("farmers").update(updates).eq("id", farmerId);
    if (error) {
      console.warn("updateFarmerProfile warning:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("updateFarmerProfile error:", err?.message || err);
    return false;
  }
}

// 3. Log a spray application
export async function recordSpray(payload: {
  farmer_id: string;
  sprayed_at?: string;
  purpose: "insect" | "fungus" | "foliar" | "induction" | "weed" | "other";
  target_pest?: string;
  products?: Array<{ name: string; dose: string; formulation?: string }>;
  area_hectares?: number;
  cost_riel?: number;
  notes?: string;
  next_spray_date?: string;
  source?: "telegram" | "web";
}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("spray_logs")
      .insert({
        ...payload,
        sprayed_at: payload.sprayed_at || new Date().toISOString().split("T")[0],
        source: payload.source || "telegram",
      })
      .select("id")
      .single();

    if (error) {
      console.warn("recordSpray warning:", error.message);
      return null;
    }
    return data.id;
  } catch (err: any) {
    console.warn("recordSpray error:", err?.message || err);
    return null;
  }
}

// 4. Log an AI inquiry / photo diagnosis for regional disease surveillance
export async function recordInquiry(payload: {
  farmer_id?: string | null;
  channel: "telegram" | "web";
  mode: "chat" | "diagnose" | "audio";
  question_text?: string;
  matched_condition?: string;
  confidence?: string;
  reply_text?: string;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db.from("inquiries").insert(payload);
  } catch {
    // Non-blocking background log
  }
}

// 5. Get recent spray and harvest stats for Farm Passport
export async function getFarmerSummary(farmerId: string) {
  const db = getDb();
  if (!db) return null;

  try {
    const [sprays, harvests] = await Promise.all([
      db.from("spray_logs").select("*").eq("farmer_id", farmerId).order("sprayed_at", { ascending: false }).limit(10),
      db.from("harvest_logs").select("*").eq("farmer_id", farmerId).order("harvest_date", { ascending: false }).limit(10),
    ]);

    return {
      sprays: sprays.data || [],
      harvests: harvests.data || [],
    };
  } catch (err: any) {
    console.warn("getFarmerSummary warning:", err?.message || err);
    return null;
  }
}

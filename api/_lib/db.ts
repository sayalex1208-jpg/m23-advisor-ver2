// Server-side database client for Supabase PostgreSQL
// Manages unified farmer profiles, spray records, harvest logs, and outbreak surveillance.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  return (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  }));
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

    if (existing) return existing as FarmerRecord;
    if (selectErr) console.warn("Supabase select error:", selectErr.message);

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
      console.error("Supabase insert error:", insertErr.message);
      return null;
    }
    return created as FarmerRecord;
  } catch (err) {
    console.error("getOrCreateFarmerByTelegram failed:", err);
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
      console.error("updateFarmerProfile error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("updateFarmerProfile failed:", err);
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
      console.error("recordSpray error:", error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error("recordSpray failed:", err);
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
    const { error } = await db.from("inquiries").insert(payload);
    if (error) console.warn("recordInquiry warning:", error.message);
  } catch (err) {
    console.warn("recordInquiry error:", err);
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
  } catch (err) {
    console.error("getFarmerSummary error:", err);
    return null;
  }
}

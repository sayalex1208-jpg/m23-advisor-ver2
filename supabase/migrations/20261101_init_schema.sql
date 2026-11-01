-- ============================================================================
-- M23 CASHEW ADVISOR — PRODUCTION DATABASE SCHEMA
-- Target Database: PostgreSQL 15+ (Supabase)
-- Created: 2026-11-01
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. FARMERS (Unified Identity: Web App + Telegram Bot)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE,                          -- Format: 012345678 (Cambodian local)
    telegram_id BIGINT UNIQUE,                  -- Telegram user ID for bot matching
    telegram_username TEXT,                     -- Telegram @handle
    name_km TEXT,                               -- Farmer's name in Khmer
    province TEXT,                              -- E.g. Kampong Thom, Kratie, Ratanakiri
    district TEXT,
    commune TEXT,
    village TEXT,
    tree_age_years INT DEFAULT NULL,            -- Age of trees in years
    planted_year INT DEFAULT NULL,              -- Year planted (e.g. 2020)
    soil_type INT CHECK (soil_type IN (1, 2, 3)), -- 1: Red upland, 2: Moist sandy loam, 3: Dry sandy loam
    hectares NUMERIC(6, 2) DEFAULT NULL,        -- Farm size in hectares
    consent BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. SPRAY LOGS (Pesticide, Fungicide, Foliar Applications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.spray_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    sprayed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    purpose TEXT NOT NULL CHECK (purpose IN ('insect', 'fungus', 'foliar', 'induction', 'weed', 'other')),
    target_pest TEXT,                           -- E.g. 'tmb' (Tea mosquito bug), 'thrips', 'anthracnose'
    products JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, dose, formulation }
    area_hectares NUMERIC(6, 2),
    cost_riel BIGINT DEFAULT 0,                 -- Expense in KHR
    notes TEXT,
    next_spray_date DATE,                       -- Scheduled follow-up date (3, 5, or 7 days)
    next_done BOOLEAN DEFAULT FALSE,            -- Confirmed completed
    source TEXT NOT NULL DEFAULT 'telegram' CHECK (source IN ('telegram', 'web', 'sms')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. HARVEST & SALES LOGS (Yield, Quality, and Revenue Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.harvest_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    kg_total NUMERIC(8, 2) NOT NULL,            -- Total weight in kg
    price_per_kg_riel BIGINT NOT NULL,          -- Price per kg in KHR (e.g. 5200)
    gross_revenue_riel BIGINT GENERATED ALWAYS AS (ROUND(kg_total * price_per_kg_riel)) STORED,
    buyer_name TEXT,                            -- Local broker, exporter, or cooperative
    nut_state TEXT NOT NULL DEFAULT 'dry' CHECK (nut_state IN ('dry', 'fresh')),
    nut_count INT,                              -- Quality standard: nuts count per kg (e.g. 150-180)
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'telegram' CHECK (source IN ('telegram', 'web')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 4. INQUIRIES & OUTBREAK SURVEILLANCE (Real-time Disease Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'telegram' CHECK (channel IN ('telegram', 'web')),
    mode TEXT NOT NULL CHECK (mode IN ('chat', 'diagnose', 'audio')),
    question_text TEXT,
    image_url TEXT,
    matched_condition TEXT,                     -- E.g. 'tea_mosquito_bug', 'anthracnose'
    confidence TEXT,                            -- E.g. 'high', 'medium', 'low'
    reply_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. REMINDERS QUEUE (Proactive 6:00 AM Cron System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminders_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('spray_followup', 'bloom_alert', 'weather_risk', 'fertilizer')),
    message_km TEXT NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_farmers_telegram_id ON public.farmers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON public.farmers(phone);
CREATE INDEX IF NOT EXISTS idx_spray_logs_farmer_id ON public.spray_logs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_spray_logs_sprayed_at ON public.spray_logs(sprayed_at);
CREATE INDEX IF NOT EXISTS idx_harvest_logs_farmer_id ON public.harvest_logs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_condition ON public.inquiries(matched_condition, created_at);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders_queue(is_sent, due_date);

-- ============================================================================
-- BUSINESS INTELLIGENCE VIEWS (AgTech Data Moat)
-- ============================================================================

-- View: Regional Disease Outbreak Heatmap (for Exporters / CAC / Ministry)
CREATE OR REPLACE VIEW public.vw_pest_outbreaks AS
SELECT 
    f.province,
    i.matched_condition,
    COUNT(i.id) AS report_count,
    DATE_TRUNC('week', i.created_at) AS report_week
FROM public.inquiries i
JOIN public.farmers f ON i.farmer_id = f.id
WHERE i.matched_condition IS NOT NULL
GROUP BY f.province, i.matched_condition, DATE_TRUNC('week', i.created_at)
ORDER BY report_week DESC, report_count DESC;

-- View: Farmer Compliance & Season Performance Summary (For Bank Loans & Farm Passport)
CREATE OR REPLACE VIEW public.vw_farmer_season_stats AS
SELECT 
    f.id AS farmer_id,
    f.name_km,
    f.province,
    f.hectares,
    COALESCE(COUNT(DISTINCT s.id), 0) AS total_sprays_logged,
    COALESCE(SUM(s.cost_riel), 0) AS total_input_cost_riel,
    COALESCE(SUM(h.kg_total), 0) AS total_kg_harvested,
    COALESCE(SUM(h.gross_revenue_riel), 0) AS total_revenue_riel,
    (COALESCE(SUM(h.gross_revenue_riel), 0) - COALESCE(SUM(s.cost_riel), 0)) AS net_profit_riel
FROM public.farmers f
LEFT JOIN public.spray_logs s ON f.id = s.farmer_id
LEFT JOIN public.harvest_logs h ON f.id = h.farmer_id
GROUP BY f.id, f.name_km, f.province, f.hectares;

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_farmers_updated_at ON public.farmers;
CREATE TRIGGER tr_farmers_updated_at
    BEFORE UPDATE ON public.farmers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spray_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Backend functions use this)
CREATE POLICY "Service role full access on farmers" ON public.farmers FOR ALL USING (true);
CREATE POLICY "Service role full access on spray_logs" ON public.spray_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on harvest_logs" ON public.harvest_logs FOR ALL USING (true);
CREATE POLICY "Service role full access on inquiries" ON public.inquiries FOR ALL USING (true);
CREATE POLICY "Service role full access on reminders_queue" ON public.reminders_queue FOR ALL USING (true);

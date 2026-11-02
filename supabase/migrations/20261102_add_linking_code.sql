-- ============================================================================
-- M23 CASHEW ADVISOR — TELEGRAM ACCOUNT LINKING
-- Adds a short-lived 4-digit code so a farmer can link their web account
-- with their Telegram account, in either order.
-- Run after 20261101_init_schema.sql.
-- ============================================================================

ALTER TABLE public.farmers
    ADD COLUMN IF NOT EXISTS linking_code TEXT,
    ADD COLUMN IF NOT EXISTS linking_code_expires_at TIMESTAMPTZ;

-- Codes are looked up on every /link command and every web code entry.
CREATE INDEX IF NOT EXISTS idx_farmers_linking_code
    ON public.farmers (linking_code)
    WHERE linking_code IS NOT NULL;

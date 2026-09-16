-- =========================
-- 0017_households_default_whatsapp.sql
-- WhatsApp padrão da obra (household), configurável na aba Família.
-- =========================

alter table public.households add column if not exists default_whatsapp_phone text;

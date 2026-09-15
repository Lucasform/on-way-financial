-- =========================
-- 0015_price_quotes_accepted.sql
-- Marca cotação como aceita pra não deixar aceitar (e lançar despesa) 2x.
-- =========================

alter table public.price_quotes add column if not exists accepted_at timestamptz;

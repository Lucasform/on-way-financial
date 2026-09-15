-- =========================
-- 0016_obra_items_quote_transaction_link.sql
-- Liga item comprado (via aceitar cotação) à cotação e à despesa geradas junto,
-- pra dar pra desfazer: apagar o "realizado" reverte a cotação e some com a despesa.
-- =========================

alter table public.obra_items
  add column if not exists quote_id uuid references public.price_quotes(id) on delete set null,
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

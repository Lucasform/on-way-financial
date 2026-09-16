-- =========================
-- 0019_obra_checklist_times_added.sql
-- Um item de checklist pode virar VÁRIAS compras reais (fornecedores e
-- momentos diferentes) -- ex: cimento comprado 2x de fornecedores distintos.
-- Troca o trava-depois-de-1x por um contador, "adicionar à tabela" continua
-- disponível sempre.
-- =========================

alter table public.obra_checklist_items add column if not exists times_added integer not null default 0;

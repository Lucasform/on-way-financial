-- =========================
-- 0012_suppliers_richer_fields.sql
-- Cadastro de fornecedor mais completo: 2º telefone, CNPJ, endereço.
-- =========================

alter table public.suppliers
  add column if not exists phone2 text,
  add column if not exists cnpj text,
  add column if not exists address text;

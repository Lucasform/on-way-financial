-- =========================
-- 0011_andamento_photos.sql
-- Aba "Andamento": permite anexar fotos a cada registro do diário de obra.
-- =========================

alter table public.obra_diary add column if not exists photo_urls text[] not null default '{}';

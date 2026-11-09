-- Cancelar uma compra já executada (devolução/reembolso) sem apagar o histórico.
-- O custo vira status 'cancelled' e sai de todas as somas de gasto (que olham só 'done');
-- a cotação ganha cancelled_at e passa a aparecer como Cancelada.
alter table public.obra_items drop constraint obra_items_status_check;
alter table public.obra_items add constraint obra_items_status_check check (status in ('todo', 'done', 'cancelled'));
alter table public.obra_items
  add column cancelled_at date,
  add column cancel_reason text;

alter table public.price_quotes
  add column cancelled_at date,
  add column cancel_reason text;

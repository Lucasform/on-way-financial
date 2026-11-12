-- Cotação recusada: sai de "Em aberto" e fica guardada em "Recusadas" (dá pra reabrir).
alter table public.price_quotes add column rejected_at date;

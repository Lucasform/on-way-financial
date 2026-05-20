-- Adiciona campo de fornecedor em transacoes (util para obra, viagem, etc.)
alter table public.transactions
  add column if not exists supplier text;

comment on column public.transactions.supplier is 'Fornecedor / loja onde a compra foi feita';

-- Indice opcional pra autocomplete por fornecedor
create index if not exists idx_transactions_supplier
  on public.transactions (household_id, supplier)
  where supplier is not null;

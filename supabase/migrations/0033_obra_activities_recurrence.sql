-- Atividades recorrentes: uma ocorrência aberta por vez; ao concluir, o banco cria a próxima.
alter table public.obra_activities
  add column recurrence text
    check (recurrence in ('diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  add column recurrence_until date,
  add column recurrence_anchor date,
  add column recurrence_source_id uuid references public.obra_activities(id) on delete set null;

create index obra_activities_recurrence_source_idx on public.obra_activities(recurrence_source_id);

create or replace function public.obra_activity_recur()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  months int;
  days int;
  anchor date;
  floor_date date;
  k int := 1;
  nxt date;
begin
  -- desfez a conclusão: some a próxima ocorrência que ainda não foi feita
  if old.status = 'feito' and new.status <> 'feito' then
    delete from obra_activities where recurrence_source_id = new.id and status <> 'feito';
    return new;
  end if;

  if new.recurrence is null or old.status = 'feito' or new.status <> 'feito' then
    return new;
  end if;
  if exists (select 1 from obra_activities where recurrence_source_id = new.id) then
    return new;
  end if;

  months := case new.recurrence
    when 'mensal' then 1 when 'bimestral' then 2 when 'trimestral' then 3
    when 'semestral' then 6 when 'anual' then 12 else null end;
  days := case new.recurrence when 'diaria' then 1 when 'semanal' then 7 when 'quinzenal' then 14 else null end;

  anchor := coalesce(new.recurrence_anchor, new.due_date, new.done_at, current_date);
  -- próxima data depois do vencimento e de quando foi feita (pula as que já passaram)
  floor_date := greatest(coalesce(new.due_date, anchor), coalesce(new.done_at, current_date));

  loop
    nxt := case when months is not null
      then (anchor + make_interval(months => k * months))::date
      else anchor + k * days end;
    exit when nxt > floor_date or k > 5000;
    k := k + 1;
  end loop;

  if new.recurrence_until is not null and nxt > new.recurrence_until then
    return new;
  end if;

  insert into obra_activities
    (module_id, title, notes, assignee, due_date, status, recurrence, recurrence_until, recurrence_anchor, recurrence_source_id)
  values
    (new.module_id, new.title, new.notes, new.assignee, nxt, 'pendente', new.recurrence, new.recurrence_until, anchor, new.id);

  return new;
end;
$$;

create trigger obra_activities_recur
  after update of status on public.obra_activities
  for each row execute function public.obra_activity_recur();

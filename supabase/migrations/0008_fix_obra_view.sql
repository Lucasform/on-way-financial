-- =========================
-- 0008_fix_obra_view.sql
-- Corrige aviso "Security Definer View" do Supabase Advisor.
-- Recria a view obra_phase_totals com security_invoker = true (PG15+),
-- fazendo com que ela respeite a RLS de quem consulta, não do criador.
-- =========================

drop view if exists obra_phase_totals;

create view obra_phase_totals
with (security_invoker = true)
as
select
  i.phase_id,
  i.module_id,
  sum(coalesce(i.quantity * i.unit_price, 0)) as planned_total,
  sum(case when i.status in ('bought','installed')
        then coalesce(i.quantity * coalesce(i.actual_unit_price, i.unit_price), 0)
        else 0
      end) as actual_total,
  count(*) as items_count,
  count(*) filter (where i.status = 'planned') as planned_count,
  count(*) filter (where i.status = 'bought' or i.status = 'installed') as done_count
from obra_items i
group by i.phase_id, i.module_id;

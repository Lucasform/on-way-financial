-- Reformulação MVP: foco central vira fornecedor -> cotação -> feito.
-- Simplifica obra_items de 5 status pra 2 (todo/done). Só 6 linhas hoje,
-- todas 'bought', então o mapeamento abaixo é seguro.
alter table obra_items drop constraint obra_items_status_check;
update obra_items set status = 'done' where status in ('bought', 'installed');
update obra_items set status = 'todo' where status in ('planned', 'ordered', 'cancelled');
alter table obra_items alter column status set default 'todo';
alter table obra_items add constraint obra_items_status_check check (status in ('todo', 'done'));

-- Simplifica obra_checklist_items: 'added' (vira item da tabela de materiais,
-- fluxo que está saindo) deixa de existir, status agora é só pending/done.
-- Nenhuma linha hoje está 'added', mapeamento é só por segurança.
alter table obra_checklist_items drop constraint obra_checklist_items_status_check;
update obra_checklist_items set status = 'pending' where status = 'added';
alter table obra_checklist_items add constraint obra_checklist_items_status_check check (status in ('pending', 'done'));

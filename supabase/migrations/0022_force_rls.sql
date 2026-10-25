-- Fecha a lacuna documentada no CLAUDE.md: RLS estava "enable" (vale pra authenticated/anon,
-- que já é o que o app usa) mas não "force" (só importa pra dono da tabela/superuser rodando
-- query direta, não afeta o app nem o service_role, que tem bypassrls). Sem efeito esperado
-- em produção, só fecha o gap pro caso de alguém rodar query como owner da tabela.
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'households', 'household_members', 'household_invites', 'categories', 'payment_methods',
      'transactions', 'alerts', 'whatsapp_sessions', 'whatsapp_rate_limit', 'audit_log',
      'telegram_sessions', 'telegram_link_tokens', 'telegram_rate_limit',
      'modules', 'obra_phases', 'obra_workers', 'obra_gallery', 'obra_messages',
      'obra_items', 'obra_diary', 'obra_documents', 'obra_checklist_items', 'obra_folders',
      'suppliers', 'material_types', 'price_quotes'
    ])
  loop
    execute format('alter table %I force row level security;', t);
  end loop;
end$$;

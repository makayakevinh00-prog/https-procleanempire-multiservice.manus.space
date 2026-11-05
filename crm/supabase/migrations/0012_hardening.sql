-- 0012 — Durcissement signalé par l'audit de sécurité Supabase.
-- 1) Chemin de recherche figé pour les fonctions métier (évite le détournement par un schéma tiers).
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('touch_updated_at','quotes_assign_number','invoice_lines_guard','invoices_delete_guard',
             'validate_invoice','convert_quote_to_invoice','cancel_invoice','register_reminder','undo_reminder','refresh_overdue',
             'reconcile_payment','unreconcile_payment','interventions_guard','stage_to_status','interventions_stage_sync',
             'contracts_staff_sync','mission_issue_flag')
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;

-- 2) Fonctions de déclencheur : jamais appelables directement (les déclencheurs continuent de fonctionner).
revoke all on function recompute_invoice_totals() from public, anon, authenticated;
revoke all on function recompute_quote_totals() from public, anon, authenticated;

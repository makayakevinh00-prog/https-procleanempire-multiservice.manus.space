-- 0061 — Relances « intelligentes » : le passage quotidien reçoit, pour chaque facture à relancer, de quoi écrire la bonne relance :
--   la fiche complète du client (dont sa nature : particulier ou entreprise — les frais de recouvrement ne concernent que les professionnels),
--   ses adresses « reçoit les factures », les lignes de la facture (pour la joindre en PDF),
--   et la liste des virements déjà rattachés ou écartés dans le CRM (ils ne doivent pas retenir une relance).
-- Rien d'autre ne change : mêmes factures, même garde par le secret du serveur.
create or replace function automation_due_reminders(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'automation_secret' from app_settings s where id),
    'handled_transactions', (select coalesce(jsonb_agg(p.qonto_transaction_id), '[]'::jsonb) from payments p
        where p.qonto_transaction_id is not null and (p.matched_invoice_id is not null or p.match_status = 'ignore') and p.received_at > now() - interval '120 days'),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'invoice', to_jsonb(i),
        'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]'::jsonb) from invoice_lines l where l.invoice_id = i.id),
        'client', to_jsonb(c),
        'extra_emails', (select coalesce(jsonb_agg(e.email order by e.created_at), '[]'::jsonb) from client_emails e where e.client_id = c.id and e.for_invoices))), '[]'::jsonb)
      from invoices i join clients c on c.id = i.client_id
      where i.status in ('envoye', 'en_retard')));
end $$;

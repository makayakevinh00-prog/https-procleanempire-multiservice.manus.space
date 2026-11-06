-- L'envoi automatique des factures part aussi vers les adresses supplémentaires marquées « reçoit les factures ».
create or replace function automation_pending_send(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'automation_secret' from app_settings s where id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'invoice', to_jsonb(i),
        'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]'::jsonb) from invoice_lines l where l.invoice_id = i.id),
        'client', to_jsonb(c),
        'extra_emails', (select coalesce(jsonb_agg(e.email order by e.created_at), '[]'::jsonb) from client_emails e where e.client_id = c.id and e.for_invoices))), '[]'::jsonb)
      from invoices i join clients c on c.id = i.client_id
      where i.billing_month is not null and i.sent_at is null and i.status in ('envoye', 'en_retard')
        and c.auto_send_invoices and not c.is_reserved and c.email is not null));
end $$;

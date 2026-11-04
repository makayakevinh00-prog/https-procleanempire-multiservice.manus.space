-- 0005 — Les brouillons mensuels déjà préparés sont signalés (jamais écrasés) à la place d'être ignorés en silence.
create or replace function automation_month_data(p_secret text, p_month text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m_start date; m_end date;
begin
  perform automation_guard(p_secret);
  m_start := (p_month || '-01')::date;
  m_end := (m_start + interval '1 month' - interval '1 day')::date;
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'automation_secret' from app_settings s where id),
    'clients', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'email', email,
                 'is_reserved', is_reserved, 'auto_send_invoices', auto_send_invoices, 'status', status)), '[]'::jsonb) from clients),
    'contracts', (select coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb) from contracts k),
    'interventions', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from interventions i
                      where i.scheduled_date between m_start and m_end and i.invoice_id is null),
    'invoiced_clients', (select coalesce(jsonb_agg(distinct client_id), '[]'::jsonb) from invoices
                         where billing_month = p_month and status <> 'annule'),
    'draft_clients', (select coalesce(jsonb_agg(distinct client_id), '[]'::jsonb) from invoices
                      where billing_month = p_month and status = 'brouillon'));
end $$;

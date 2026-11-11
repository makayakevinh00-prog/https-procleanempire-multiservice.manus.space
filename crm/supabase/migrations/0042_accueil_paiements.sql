-- 0042 — Nettoyage de l'accueil et des paiements : actions masquables, demandes indésirables écartées, nature d'un virement (remboursement, apport…).
-- Additif.

-- 1. Actions à faire : le patron peut masquer une action (pour toujours, ou tant qu'elle ne s'aggrave pas).
create table if not exists action_dismissals (
  key text primary key,
  count_at int,                       -- pour une action « compteur » : réapparaît seulement si le nombre dépasse celui-ci
  dismissed_at timestamptz not null default now()
);
alter table action_dismissals enable row level security;
drop policy if exists action_dismissals_owner on action_dismissals;
create policy action_dismissals_owner on action_dismissals for all to authenticated using (is_owner()) with check (is_owner());

-- 2. Demandes reçues par le site mais écartées comme démarchage : gardées 90 jours pour vérification, jamais dans le CRM ni dans les actions.
create table if not exists quote_request_spam (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  name text, company text, email text, phone text, message text,
  reason text not null,
  payload jsonb not null
);
alter table quote_request_spam enable row level security;
drop policy if exists quote_request_spam_owner on quote_request_spam;
create policy quote_request_spam_owner on quote_request_spam for all to authenticated using (is_owner()) with check (is_owner());

-- Mise en quarantaine par le site (protégée par le secret d'automatisation, comme la réception des demandes).
create or replace function quarantine_quote_request(p_secret text, p jsonb, p_reason text) returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform automation_guard(p_secret);
  delete from quote_request_spam where received_at < now() - interval '90 days';
  insert into quote_request_spam(name, company, email, phone, message, reason, payload)
  values (left(p ->> 'name', 120), left(p ->> 'company', 120), left(p ->> 'email', 200), left(p ->> 'phone', 40), left(p ->> 'message', 2000), left(coalesce(p_reason, ''), 300), p)
  returning id into v;
  return v;
end $$;
revoke all on function quarantine_quote_request(text, jsonb, text) from public, anon;
grant execute on function quarantine_quote_request(text, jsonb, text) to anon, authenticated;

-- 3. Nature d'un virement reçu : encaissement client (par défaut), remboursement, apport du dirigeant, autre. Les trois derniers ne sont pas du chiffre d'affaires.
alter table payments add column if not exists nature text not null default 'encaissement_client' check (nature in ('encaissement_client', 'remboursement', 'apport', 'autre'));
alter table payments add column if not exists note text;

-- 4. Le comptable voit la nature des virements.
create or replace function compta_data(p_month text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s date; e date; owner boolean := is_owner(); res jsonb;
begin
  if not (owner or is_accountant()) then raise exception 'ACCES_REFUSE'; end if;
  if p_month is null or p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'MOIS_INVALIDE'; end if;
  s := (p_month || '-01')::date; e := (s + interval '1 month - 1 day')::date;
  select jsonb_build_object(
    'month', p_month,
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('id', case when owner then i.id else null end, 'number', i.number, 'issue_date', i.issue_date, 'due_date', i.due_date, 'status', i.status,
        'total_ht', i.total_ht, 'total_vat', i.total_vat, 'total_ttc', i.total_ttc, 'paid_at', i.paid_at, 'client', c.name) order by i.number)
      from invoices i join clients c on c.id = i.client_id
      where i.number is not null and i.status in ('envoye','paye','en_retard','annule') and i.issue_date between s and e), '[]'::jsonb),
    'vat', coalesce((select jsonb_agg(jsonb_build_object('rate', r.vat_rate, 'base', r.base, 'vat', round(r.base * r.vat_rate / 100, 2)) order by r.vat_rate)
      from (select l.vat_rate, round(sum(l.quantity * l.unit_price_ht), 2) base from invoice_lines l join invoices i on i.id = l.invoice_id
            where i.number is not null and i.status in ('envoye','paye','en_retard') and i.issue_date between s and e group by l.vat_rate) r), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('received_at', p.received_at, 'amount', p.amount, 'counterparty', p.counterparty, 'label', p.label, 'match_status', p.match_status, 'nature', p.nature, 'invoice', mi.number) order by p.received_at desc)
      from payments p left join invoices mi on mi.id = p.matched_invoice_id
      where p.received_at >= s and p.received_at < (e + 1)), '[]'::jsonb),
    'supplier_payments', coalesce((select jsonb_agg(jsonb_build_object('id', sp.id, 'has_doc', sp.document_path is not null, 'paid_on', sp.paid_on, 'amount', sp.amount, 'label', sp.label, 'supplier', su.name, 'category', su.category) order by sp.paid_on desc)
      from supplier_payments sp join suppliers su on su.id = sp.supplier_id where sp.paid_on between s and e), '[]'::jsonb),
    'open_total', coalesce((select sum(greatest(0, i.total_ttc - i.paid_amount)) from invoices i where i.status in ('envoye','en_retard')), 0),
    'late_count', (select count(*) from invoices i where i.status = 'en_retard'),
    'late_total', coalesce((select sum(greatest(0, i.total_ttc - i.paid_amount)) from invoices i where i.status = 'en_retard'), 0),
    'unmatched', (select count(*) from payments p where p.match_status in ('non_rapproche','propose')),
    'numbers', coalesce((select jsonb_agg(i.number order by i.number) from invoices i where i.number is not null and i.status <> 'brouillon'), '[]'::jsonb)
  ) into res;
  return res;
end $$;


do $$ declare f text; begin
  foreach f in array array['compta_data(text)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

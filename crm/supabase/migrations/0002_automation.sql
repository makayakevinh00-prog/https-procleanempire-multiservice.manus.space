-- 0002 — Catalogue de prestations, planning, facturation mensuelle automatique, demandes de devis.
-- Les fonctions « automation_* » sont appelées par les tâches planifiées avec un secret (app_settings.automation_secret) :
-- aucune clé service_role n'est nécessaire côté Vercel.

-- ───────────────────────── Paramètres ─────────────────────────
alter table app_settings
  add column company_legal_form text,
  add column company_capital text,
  add column company_rcs text,
  add column company_footer text,
  add column quote_default_validity_days int not null default 30,
  add column quote_terms text,
  add column notify_email text,
  -- Facturation mensuelle automatique (désactivée par défaut)
  add column auto_invoicing_enabled boolean not null default false,
  add column auto_invoicing_start_month text not null default '2026-11' check (auto_invoicing_start_month ~ '^[0-9]{4}-[0-9]{2}$'),
  add column count_planned_as_done boolean not null default true,
  add column month_end_send_next_day boolean not null default true,
  -- Relance automatique des devis sans réponse (désactivée par défaut)
  add column quote_followup_enabled boolean not null default false,
  add column quote_followup_days int not null default 5,
  add column automation_secret text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

update app_settings set
  company_legal_form = 'SASU',
  company_capital = '1 000,00 €',
  company_rcs = 'RCS Pontoise 106 602 659',
  company_siret = coalesce(company_siret, '106 602 659 00018'),
  company_address = coalesce(company_address, '3 rue Stéphane Charbonnier, 95300 Pontoise'),
  company_phone = coalesce(company_phone, '06 17 21 22 30'),
  notify_email = coalesce(notify_email, 'contact@procleanempire.com'),
  quote_terms = 'Devis valable 30 jours. Règlement à 30 jours par virement. Aucun escompte pour paiement anticipé. Bon pour accord : date, signature et mention « lu et approuvé ».'
where id;

alter table clients add column auto_send_invoices boolean not null default false;
alter table contracts
  add column weekdays smallint[] check (weekdays is null or weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  add column start_time time;
alter table invoices add column billing_month text check (billing_month is null or billing_month ~ '^[0-9]{4}-[0-9]{2}$');
create unique index invoices_client_month_uniq on invoices (client_id, billing_month) where billing_month is not null and status <> 'annule';
alter table quotes add column followup_sent_at timestamptz;

-- ───────────────────────── Catalogue de prestations ─────────────────────────
create table services (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  unit text,
  unit_price_ht numeric(12,2) not null default 0 check (unit_price_ht >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger services_touch before update on services for each row execute function touch_updated_at();

-- ───────────────────────── Planning (interventions) ─────────────────────────
create table interventions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  title text not null,
  site_address text,
  scheduled_date date not null,
  start_time time,
  duration_hours numeric(5,2) check (duration_hours is null or duration_hours > 0),
  assignee text,
  status text not null default 'planifie' check (status in ('planifie','realise','annule')),
  -- facturation : faux = couvert par un forfait mensuel (pas de ligne de facture propre)
  billable boolean not null default true,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_ht numeric(12,2) check (unit_price_ht is null or unit_price_ht >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0),
  invoice_id uuid references invoices(id) on delete set null,
  source_key text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interventions_date_idx on interventions (scheduled_date);
create index interventions_client_idx on interventions (client_id, scheduled_date);
create trigger interventions_touch before update on interventions for each row execute function touch_updated_at();

-- Une intervention déjà facturée ne change plus (prix, quantité, statut, date).
create or replace function interventions_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.invoice_id is not null then
      raise exception 'INTERVENTION_FACTUREE: déjà facturée — annulez ou supprimez la facture d''abord';
    end if;
    return old;
  end if;
  if old.invoice_id is not null and new.invoice_id is not distinct from old.invoice_id and (
       new.status <> old.status or new.quantity <> old.quantity or new.unit_price_ht is distinct from old.unit_price_ht
    or new.scheduled_date <> old.scheduled_date or new.client_id <> old.client_id or new.vat_rate <> old.vat_rate) then
    raise exception 'INTERVENTION_FACTUREE: déjà facturée — non modifiable';
  end if;
  return new;
end $$;
create trigger interventions_guard_t before update or delete on interventions for each row execute function interventions_guard();

-- ───────────────────────── Demandes de devis (site web) ─────────────────────────
create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique,
  received_at timestamptz not null default now(),
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  postcode text,
  city text,
  service text,
  start_date text,
  message text,
  details jsonb not null default '{}'::jsonb,
  source text,
  status text not null default 'nouvelle' check (status in ('nouvelle','traitee','ignoree')),
  client_id uuid references clients(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null
);
create index quote_requests_status_idx on quote_requests (status, received_at desc);

-- ───────────────────────── RLS : patron uniquement ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['services','interventions','quote_requests']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- ───────────────────────── Automatisations (appelées avec le secret) ─────────────────────────
create or replace function automation_guard(p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select automation_secret from app_settings where id) then
    raise exception 'ACCES_REFUSE';
  end if;
end $$;
revoke execute on function automation_guard(text) from public, anon, authenticated;

-- Données nécessaires au calcul des factures d'un mois.
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
                         where billing_month = p_month and status <> 'annule'));
end $$;

-- Crée la facture BROUILLON du mois (jamais en double) et y rattache les interventions.
create or replace function automation_create_invoice(
  p_secret text, p_client_id uuid, p_month text, p_subject text, p_lines jsonb, p_intervention_ids uuid[], p_notes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv uuid; l jsonb; i int := 0;
begin
  perform automation_guard(p_secret);
  if exists (select 1 from invoices where client_id = p_client_id and billing_month = p_month and status <> 'annule') then
    raise exception 'FACTURE_MENSUELLE_EXISTANTE';
  end if;
  insert into invoices(client_id, subject, billing_month, notes) values (p_client_id, p_subject, p_month, p_notes) returning id into inv;
  for l in select * from jsonb_array_elements(p_lines) loop
    insert into invoice_lines(invoice_id, position, description, quantity, unit_price_ht, vat_rate)
    values (inv, i, l ->> 'description', (l ->> 'quantity')::numeric, (l ->> 'unit_price_ht')::numeric, (l ->> 'vat_rate')::numeric);
    i := i + 1;
  end loop;
  update interventions set invoice_id = inv where id = any(p_intervention_ids) and invoice_id is null;
  return inv;
end $$;

-- Validation automatique : mêmes garde-fous que la validation manuelle (contact réservé et montant élevé refusés).
create or replace function automation_validate_invoice(p_secret text, p_invoice_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare inv invoices;
begin
  perform automation_guard(p_secret);
  select * into inv from validate_invoice(p_invoice_id);
  perform log_audit('facture.validee_auto', 'invoice', inv.id, jsonb_build_object('number', inv.number, 'total_ht', inv.total_ht));
  return inv.number;
end $$;

-- Factures émises automatiquement et pas encore envoyées au client.
create or replace function automation_pending_send(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'automation_secret' from app_settings s where id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'invoice', to_jsonb(i),
        'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]'::jsonb) from invoice_lines l where l.invoice_id = i.id),
        'client', to_jsonb(c))), '[]'::jsonb)
      from invoices i join clients c on c.id = i.client_id
      where i.billing_month is not null and i.sent_at is null and i.status in ('envoye', 'en_retard')
        and c.auto_send_invoices and not c.is_reserved and c.email is not null));
end $$;

create or replace function automation_mark_sent(p_secret text, p_invoice_id uuid, p_to text) returns void
language plpgsql security definer set search_path = public as $$
declare inv invoices;
begin
  perform automation_guard(p_secret);
  update invoices set sent_at = now(), sent_to = p_to where id = p_invoice_id returning * into inv;
  insert into interactions(client_id, kind, summary) values (inv.client_id, 'facture', 'Facture ' || inv.number || ' envoyée automatiquement à ' || p_to);
  perform log_audit('facture.envoyee_auto', 'invoice', inv.id, jsonb_build_object('to', p_to));
end $$;

-- Devis envoyés restés sans réponse.
create or replace function automation_quotes_to_follow(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s app_settings;
begin
  perform automation_guard(p_secret);
  select * into s from app_settings where id;
  if not s.quote_followup_enabled then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'number', q.number, 'subject', q.subject,
            'total_ttc', q.total_ttc, 'valid_until', q.valid_until, 'client_name', c.name, 'email', c.email)), '[]'::jsonb)
          from quotes q join clients c on c.id = q.client_id
          where q.status = 'envoye' and q.followup_sent_at is null and q.sent_at < now() - make_interval(days => s.quote_followup_days)
            and not c.is_reserved and c.email is not null);
end $$;

create or replace function automation_quote_followup_done(p_secret text, p_quote_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q quotes;
begin
  perform automation_guard(p_secret);
  update quotes set followup_sent_at = now() where id = p_quote_id returning * into q;
  insert into interactions(client_id, kind, summary) values (q.client_id, 'devis', 'Relance automatique du devis ' || q.number);
end $$;

-- Réception d'une demande de devis envoyée par le site.
create or replace function submit_quote_request(p_secret text, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform automation_guard(p_secret);
  insert into quote_requests(reference, received_at, name, company, email, phone, address, postcode, city, service, start_date, message, details, source)
  values (p ->> 'reference', coalesce((p ->> 'received_at')::timestamptz, now()), coalesce(nullif(p ->> 'name', ''), 'Sans nom'), p ->> 'company',
          p ->> 'email', p ->> 'phone', p ->> 'address', p ->> 'postcode', p ->> 'city', p ->> 'service', p ->> 'start_date',
          p ->> 'message', coalesce(p -> 'details', '{}'::jsonb), p ->> 'source')
  on conflict (reference) do nothing
  returning id into v;
  return v;
end $$;

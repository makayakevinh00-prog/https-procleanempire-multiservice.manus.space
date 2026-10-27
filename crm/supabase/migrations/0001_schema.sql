-- ProClean Empire CRM — schéma complet
-- À exécuter dans l'éditeur SQL Supabase (ou `supabase db push`).
-- Les règles métier critiques sont appliquées ICI (contraintes, triggers, RPC) :
-- elles tiennent même si l'interface ou une API est contournée.

-- ───────────────────────── Paramètres (ligne unique) ─────────────────────────
create table app_settings (
  id boolean primary key default true check (id),
  owner_email text not null default 'contact@procleanempire.com',
  company_name text not null default 'ProClean Empire',
  company_address text,
  company_siret text,
  company_vat_number text,
  company_iban text,
  company_phone text,
  company_email text default 'contact@procleanempire.com',
  default_vat_rate numeric(5,2) not null default 20,
  payment_terms_days int not null default 30,
  -- Règle 4 : alerte patron au-dessus de ce montant HT
  large_amount_threshold_ht numeric(12,2) not null default 1500,
  -- Alerte impayés : nombre de jours de retard après échéance
  unpaid_alert_days int not null default 15,
  -- Relances automatiques (désactivées par défaut)
  auto_reminders_enabled boolean not null default false,
  reminder_first_after_days int not null default 7,
  reminder_interval_days int not null default 14,
  reminder_max_count int not null default 3,
  -- Recrutement : coût indépendant vs salarié (tous configurables)
  indep_hourly_cost numeric(8,2) not null default 22,
  salarie_gross_hourly numeric(8,2) not null default 12.02,
  salarie_employer_charges_pct numeric(5,2) not null default 42,
  salarie_paid_leave_pct numeric(5,2) not null default 10,
  recruit_green_max_hours numeric(6,2) not null default 30,
  recruit_orange_max_hours numeric(6,2) not null default 35,
  updated_at timestamptz not null default now(),
  check (recruit_green_max_hours < recruit_orange_max_hours)
);
insert into app_settings default values;

create table counters (
  key text primary key,
  value int not null default 0
);

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
);

-- ───────────────────────── Accès : le patron uniquement ─────────────────────────
create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) =
         lower((select owner_email from app_settings where id))
$$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function next_counter(p_key text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  -- Fonction exposée par l'API : jamais utilisable par un tiers (sinon trous dans la numérotation)
  if auth.uid() is not null and not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  insert into counters(key, value) values (p_key, 1)
  on conflict (key) do update set value = counters.value + 1
  returning value into v;
  return v;
end $$;

-- ───────────────────────── 1. Clients ─────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'entreprise' check (kind in ('entreprise','particulier')),
  status text not null default 'actif' check (status in ('prospect','actif','inactif')),
  address text,
  postal_code text,
  city text,
  email text,
  phone text,
  siret text,
  notes text,
  -- Règle 1 : contact réservé = aucune action automatique, alerte patron
  is_reserved boolean not null default false,
  reserved_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clients_name_uniq on clients (lower(name));
create trigger clients_touch before update on clients for each row execute function touch_updated_at();

create table interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null default 'note' check (kind in ('appel','email','rdv','note','relance','devis','facture','autre')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index interactions_client_idx on interactions (client_id, occurred_at desc);

-- ───────────────────────── 2. Contrats récurrents ─────────────────────────
create table contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  billing_mode text not null default 'mensuel' check (billing_mode in ('mensuel','passage','autre')),
  monthly_amount_ht numeric(12,2) check (monthly_amount_ht is null or monthly_amount_ht >= 0),
  per_visit_amount_ht numeric(12,2) check (per_visit_amount_ht is null or per_visit_amount_ht >= 0),
  terms text,
  start_date date,
  end_date date,
  status text not null default 'en_cours' check (status in ('actif','resilie','en_cours')),
  hours_per_visit numeric(5,2) check (hours_per_visit is null or hours_per_visit > 0),
  visits_per_week numeric(4,2) check (visits_per_week is null or visits_per_week > 0),
  -- Calcul automatique des heures hebdomadaires totales du contrat
  weekly_hours numeric(6,2) generated always as (hours_per_visit * visits_per_week) stored,
  site_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index contracts_client_idx on contracts (client_id);
create trigger contracts_touch before update on contracts for each row execute function touch_updated_at();

-- ───────────────────────── 3. Devis ─────────────────────────
create table quotes (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  client_id uuid not null references clients(id) on delete restrict,
  status text not null default 'brouillon' check (status in ('brouillon','envoye','accepte','refuse')),
  subject text,
  issue_date date not null default current_date,
  valid_until date,
  notes text,
  total_ht numeric(12,2) not null default 0,
  total_vat numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  sent_at timestamptz,
  accepted_at timestamptz,
  invoice_id uuid, -- FK ajoutée après la création de invoices
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_client_idx on quotes (client_id);
create trigger quotes_touch before update on quotes for each row execute function touch_updated_at();

create or replace function quotes_assign_number() returns trigger language plpgsql as $$
begin
  if new.number is null then
    new.number := 'DEV-' || lpad(next_counter('DEV')::text, 3, '0');
  end if;
  return new;
end $$;
create trigger quotes_number before insert on quotes for each row execute function quotes_assign_number();

create table quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  position int not null default 0,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_ht numeric(12,2) not null check (unit_price_ht >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0)
);
create index quote_lines_quote_idx on quote_lines (quote_id, position);

-- ───────────────────────── 4. Factures ─────────────────────────
create table invoices (
  id uuid primary key default gen_random_uuid(),
  -- Numéro attribué UNIQUEMENT à la validation (numérotation continue sans trou)
  number text unique,
  client_id uuid not null references clients(id) on delete restrict,
  source_quote_id uuid references quotes(id) on delete set null,
  status text not null default 'brouillon' check (status in ('brouillon','envoye','paye','en_retard','annule')),
  subject text,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  total_ht numeric(12,2) not null default 0,
  total_vat numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  -- Règle 2 : validation manuelle du patron, traçable
  validated_at timestamptz,
  validated_by uuid,
  sent_at timestamptz,
  sent_to text,
  paid_at timestamptz,
  paid_amount numeric(12,2) not null default 0,
  last_reminder_at timestamptz,
  reminder_count int not null default 0,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- BLOQUANT : hors brouillon/annulé, une facture doit avoir été validée et numérotée
  constraint invoice_requires_validation
    check (status in ('brouillon','annule') or (validated_at is not null and number is not null)),
  constraint invoice_draft_is_clean
    check (status <> 'brouillon' or (validated_at is null and number is null))
);
create index invoices_client_idx on invoices (client_id);
create index invoices_status_idx on invoices (status, due_date);
create trigger invoices_touch before update on invoices for each row execute function touch_updated_at();

alter table quotes add constraint quotes_invoice_fk foreign key (invoice_id) references invoices(id) on delete set null;

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position int not null default 0,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_ht numeric(12,2) not null check (unit_price_ht >= 0),
  vat_rate numeric(5,2) not null default 20 check (vat_rate >= 0)
);
create index invoice_lines_invoice_idx on invoice_lines (invoice_id, position);

-- Une facture émise est immuable (lignes comprises) ; seule une facture brouillon est supprimable.
create or replace function invoice_lines_guard() returns trigger language plpgsql as $$
declare st text; inv uuid;
begin
  inv := coalesce(new.invoice_id, old.invoice_id);
  select status into st from invoices where id = inv;
  if st is not null and st <> 'brouillon' then
    raise exception 'FACTURE_VERROUILLEE: les lignes d''une facture validée ne sont plus modifiables';
  end if;
  return coalesce(new, old);
end $$;
create trigger invoice_lines_guard_t before insert or update or delete on invoice_lines
  for each row execute function invoice_lines_guard();

create or replace function invoices_delete_guard() returns trigger language plpgsql as $$
begin
  if old.status <> 'brouillon' then
    raise exception 'FACTURE_NON_SUPPRIMABLE: une facture validée s''annule, elle ne se supprime pas';
  end if;
  return old;
end $$;
create trigger invoices_delete_guard_t before delete on invoices
  for each row execute function invoices_delete_guard();

-- Totaux recalculés automatiquement
create or replace function recompute_quote_totals() returns trigger language plpgsql security definer set search_path = public as $$
declare q uuid;
begin
  q := coalesce(new.quote_id, old.quote_id);
  update quotes set
    total_ht  = coalesce((select sum(round(quantity * unit_price_ht, 2)) from quote_lines where quote_id = q), 0),
    total_vat = coalesce((select sum(round(quantity * unit_price_ht * vat_rate / 100, 2)) from quote_lines where quote_id = q), 0)
  where id = q;
  update quotes set total_ttc = total_ht + total_vat where id = q;
  return null;
end $$;
create trigger quote_lines_totals after insert or update or delete on quote_lines
  for each row execute function recompute_quote_totals();

create or replace function recompute_invoice_totals() returns trigger language plpgsql security definer set search_path = public as $$
declare i uuid;
begin
  i := coalesce(new.invoice_id, old.invoice_id);
  update invoices set
    total_ht  = coalesce((select sum(round(quantity * unit_price_ht, 2)) from invoice_lines where invoice_id = i), 0),
    total_vat = coalesce((select sum(round(quantity * unit_price_ht * vat_rate / 100, 2)) from invoice_lines where invoice_id = i), 0)
  where id = i;
  update invoices set total_ttc = total_ht + total_vat where id = i;
  return null;
end $$;
create trigger invoice_lines_totals after insert or update or delete on invoice_lines
  for each row execute function recompute_invoice_totals();

-- Relances
create table reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  sent_at timestamptz not null default now(),
  level int not null,
  channel text not null default 'email' check (channel in ('email','telephone','courrier','autre')),
  origin text not null default 'manuel' check (origin in ('manuel','auto')),
  note text,
  created_by uuid default auth.uid()
);
create index reminders_invoice_idx on reminders (invoice_id, sent_at desc);

-- ───────────────────────── 6. Paiements (Qonto) ─────────────────────────
create table payments (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'qonto' check (source in ('qonto','manuel')),
  qonto_transaction_id text unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  received_at timestamptz not null,
  counterparty text,
  label text,
  reference text,
  match_status text not null default 'non_rapproche' check (match_status in ('non_rapproche','propose','rapproche','ignore')),
  suggested_invoice_id uuid references invoices(id) on delete set null,
  matched_invoice_id uuid references invoices(id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_match_consistent check (match_status <> 'rapproche' or matched_invoice_id is not null)
);
create index payments_status_idx on payments (match_status, received_at desc);

-- ───────────────────────── RPC métier (atomiques) ─────────────────────────

create or replace function log_audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  insert into audit_log(user_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- Règle 2 + 1 + 4 : seule porte vers l'émission d'une facture.
create or replace function validate_invoice(p_invoice_id uuid, p_ack_large boolean default false, p_ack_reserved boolean default false)
returns invoices language plpgsql as $$
declare inv invoices; cl clients; s app_settings; yr int; n int;
begin
  select * into inv from invoices where id = p_invoice_id for update;
  if not found then raise exception 'FACTURE_INTROUVABLE'; end if;
  if inv.status <> 'brouillon' then raise exception 'FACTURE_DEJA_VALIDEE: statut actuel %', inv.status; end if;
  if not exists (select 1 from invoice_lines where invoice_id = inv.id) then raise exception 'FACTURE_VIDE: aucune ligne'; end if;
  if inv.total_ht <= 0 then raise exception 'FACTURE_MONTANT_NUL'; end if;

  select * into cl from clients where id = inv.client_id;
  select * into s from app_settings where id;

  if cl.is_reserved and not p_ack_reserved then
    raise exception 'CONTACT_RESERVE: % — traitement patron uniquement, confirmation explicite requise', cl.name;
  end if;
  if inv.total_ht > s.large_amount_threshold_ht and not p_ack_large then
    raise exception 'MONTANT_ELEVE: % € HT dépasse le seuil de % € — alerte patron, confirmation requise', inv.total_ht, s.large_amount_threshold_ht;
  end if;

  yr := extract(year from current_date);
  n := next_counter('F-' || yr);
  update invoices set
    number = 'F-' || yr || '-' || lpad(n::text, 3, '0'),
    status = 'envoye',
    validated_at = now(),
    validated_by = auth.uid(),
    issue_date = current_date,
    due_date = current_date + s.payment_terms_days
  where id = inv.id
  returning * into inv;

  perform log_audit('facture.validee', 'invoice', inv.id,
    jsonb_build_object('number', inv.number, 'total_ht', inv.total_ht, 'reserve', cl.is_reserved));
  return inv;
end $$;

-- Devis accepté → facture BROUILLON (jamais émise ici).
create or replace function convert_quote_to_invoice(p_quote_id uuid, p_ack_large boolean default false, p_ack_reserved boolean default false)
returns uuid language plpgsql as $$
declare q quotes; cl clients; s app_settings; inv_id uuid; prev_status text;
begin
  select * into q from quotes where id = p_quote_id for update;
  if not found then raise exception 'DEVIS_INTROUVABLE'; end if;
  if q.status <> 'accepte' then raise exception 'DEVIS_NON_ACCEPTE: seul un devis accepté se convertit'; end if;
  if q.invoice_id is not null then
    select status into prev_status from invoices where id = q.invoice_id;
    if prev_status is distinct from 'annule' then
      raise exception 'DEVIS_DEJA_FACTURE';
    end if;
  end if;
  select * into cl from clients where id = q.client_id;
  select * into s from app_settings where id;
  if cl.is_reserved and not p_ack_reserved then
    raise exception 'CONTACT_RESERVE: % — traitement patron uniquement, confirmation explicite requise', cl.name;
  end if;
  if q.total_ht > s.large_amount_threshold_ht and not p_ack_large then
    raise exception 'MONTANT_ELEVE: % € HT dépasse le seuil de % € — confirmation requise', q.total_ht, s.large_amount_threshold_ht;
  end if;

  insert into invoices(client_id, source_quote_id, subject, notes)
  values (q.client_id, q.id, q.subject, q.notes)
  returning id into inv_id;
  insert into invoice_lines(invoice_id, position, description, quantity, unit_price_ht, vat_rate)
  select inv_id, position, description, quantity, unit_price_ht, vat_rate from quote_lines where quote_id = q.id;
  update quotes set invoice_id = inv_id where id = q.id;

  perform log_audit('devis.converti', 'quote', q.id, jsonb_build_object('invoice_id', inv_id));
  return inv_id;
end $$;

create or replace function cancel_invoice(p_invoice_id uuid, p_reason text)
returns invoices language plpgsql as $$
declare inv invoices;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'MOTIF_REQUIS'; end if;
  select * into inv from invoices where id = p_invoice_id for update;
  if not found then raise exception 'FACTURE_INTROUVABLE'; end if;
  if inv.status = 'paye' then raise exception 'FACTURE_PAYEE: annulation impossible, passer par un avoir'; end if;
  if inv.status = 'annule' then return inv; end if;
  update invoices set status = 'annule', cancelled_at = now(), cancel_reason = p_reason
  where id = inv.id returning * into inv;
  perform log_audit('facture.annulee', 'invoice', inv.id, jsonb_build_object('reason', p_reason));
  return inv;
end $$;

-- Règle 3 : jamais de relance sans vérifier l'historique ; règle 1 : jamais d'auto sur contact réservé.
create or replace function register_reminder(
  p_invoice_id uuid, p_channel text default 'email', p_origin text default 'manuel',
  p_note text default null, p_force boolean default false, p_ack_reserved boolean default false)
returns reminders language plpgsql as $$
declare inv invoices; cl clients; s app_settings; last_r timestamptz; r reminders;
begin
  select * into inv from invoices where id = p_invoice_id for update;
  if not found then raise exception 'FACTURE_INTROUVABLE'; end if;
  if inv.status not in ('envoye','en_retard') then
    raise exception 'RELANCE_IMPOSSIBLE: statut % (seules les factures envoyées/en retard se relancent)', inv.status;
  end if;
  select * into cl from clients where id = inv.client_id;
  select * into s from app_settings where id;

  if cl.is_reserved and p_origin = 'auto' then
    raise exception 'CONTACT_RESERVE: relance automatique interdite pour %', cl.name;
  end if;
  if cl.is_reserved and not p_ack_reserved then
    raise exception 'CONTACT_RESERVE: % — confirmation explicite du patron requise', cl.name;
  end if;

  select max(sent_at) into last_r from reminders where invoice_id = inv.id;
  if last_r is not null and last_r > now() - make_interval(days => s.reminder_interval_days) then
    if p_origin = 'auto' or not p_force then
      raise exception 'RELANCE_DEJA_ENVOYEE: dernière relance le % (délai minimum % jours)', to_char(last_r, 'DD/MM/YYYY'), s.reminder_interval_days;
    end if;
  end if;
  if p_origin = 'auto' and inv.reminder_count >= s.reminder_max_count then
    raise exception 'RELANCE_MAX_ATTEINT: % relances déjà envoyées', inv.reminder_count;
  end if;

  insert into reminders(invoice_id, level, channel, origin, note)
  values (inv.id, inv.reminder_count + 1, p_channel, p_origin, p_note)
  returning * into r;
  update invoices set reminder_count = reminder_count + 1, last_reminder_at = r.sent_at where id = inv.id;
  perform log_audit('facture.relance', 'invoice', inv.id, jsonb_build_object('level', r.level, 'origin', p_origin, 'channel', p_channel));
  return r;
end $$;

-- Annule une relance dont l'envoi a échoué (aucun état incohérent : compteur et date restaurés).
create or replace function undo_reminder(p_reminder_id uuid) returns void language plpgsql as $$
declare r reminders;
begin
  select * into r from reminders where id = p_reminder_id for update;
  if not found then return; end if;
  delete from reminders where id = r.id;
  update invoices set
    reminder_count = greatest(reminder_count - 1, 0),
    last_reminder_at = (select max(sent_at) from reminders where invoice_id = r.invoice_id)
  where id = r.invoice_id;
  perform log_audit('facture.relance_annulee', 'invoice', r.invoice_id, jsonb_build_object('reminder_id', r.id));
end $$;

-- Passe en retard les factures dont l'échéance est dépassée.
create or replace function refresh_overdue() returns int language plpgsql as $$
declare n int;
begin
  update invoices set status = 'en_retard'
  where status = 'envoye' and due_date is not null and due_date < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- Rapprochement facture ↔ virement.
create or replace function reconcile_payment(p_payment_id uuid, p_invoice_id uuid, p_ack_reserved boolean default false)
returns invoices language plpgsql as $$
declare pay payments; inv invoices; cl clients; total_paid numeric;
begin
  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'PAIEMENT_INTROUVABLE'; end if;
  if pay.match_status = 'rapproche' then raise exception 'PAIEMENT_DEJA_RAPPROCHE'; end if;
  select * into inv from invoices where id = p_invoice_id for update;
  if not found then raise exception 'FACTURE_INTROUVABLE'; end if;
  if inv.status not in ('envoye','en_retard') then
    raise exception 'RAPPROCHEMENT_IMPOSSIBLE: facture au statut %', inv.status;
  end if;
  select * into cl from clients where id = inv.client_id;
  if cl.is_reserved and not p_ack_reserved then
    raise exception 'CONTACT_RESERVE: % — rapprochement manuel du patron uniquement', cl.name;
  end if;

  update payments set match_status = 'rapproche', matched_invoice_id = inv.id, matched_at = now() where id = pay.id;
  total_paid := inv.paid_amount + pay.amount;
  update invoices set
    paid_amount = total_paid,
    status = case when total_paid >= total_ttc then 'paye' else status end,
    paid_at = case when total_paid >= total_ttc then pay.received_at else paid_at end
  where id = inv.id returning * into inv;
  perform log_audit('paiement.rapproche', 'invoice', inv.id, jsonb_build_object('payment_id', pay.id, 'amount', pay.amount));
  return inv;
end $$;

create or replace function unreconcile_payment(p_payment_id uuid)
returns void language plpgsql as $$
declare pay payments; inv invoices; remaining numeric;
begin
  select * into pay from payments where id = p_payment_id for update;
  if not found or pay.match_status <> 'rapproche' then raise exception 'PAIEMENT_NON_RAPPROCHE'; end if;
  select * into inv from invoices where id = pay.matched_invoice_id for update;
  remaining := greatest(inv.paid_amount - pay.amount, 0);
  update invoices set
    paid_amount = remaining,
    status = case when status = 'paye' and remaining < total_ttc
                  then (case when due_date < current_date then 'en_retard' else 'envoye' end) else status end,
    paid_at = case when remaining < total_ttc then null else paid_at end
  where id = inv.id;
  update payments set match_status = 'non_rapproche', matched_invoice_id = null, matched_at = null where id = pay.id;
  perform log_audit('paiement.dissocie', 'invoice', inv.id, jsonb_build_object('payment_id', pay.id));
end $$;

-- ───────────────────────── RLS : patron uniquement ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['app_settings','clients','interactions','contracts',
                           'quotes','quote_lines','invoices','invoice_lines','reminders','payments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;
-- counters/audit_log : lecture seule pour le patron, écriture via fonctions security definer
alter table counters enable row level security;
alter table audit_log enable row level security;
create policy counters_read on counters for select to authenticated using (is_owner());
create policy audit_log_read on audit_log for select to authenticated using (is_owner());

-- Les fonctions security definer ne sont pas appelables par les visiteurs non connectés.
revoke execute on function next_counter(text) from public, anon;
revoke execute on function log_audit(text, text, uuid, jsonb) from public, anon;
revoke execute on function is_owner() from public, anon;

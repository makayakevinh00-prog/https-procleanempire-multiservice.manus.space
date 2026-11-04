-- 0004 — Fiabilisation : journal d'exécution et d'e-mails, planning automatique, relances de devis en 2 temps,
-- expiration des devis, contrats avec intervenant, cadence de relance des impayés.

alter table contracts add column assignee text;

alter table quotes add column followup_count int not null default 0;
alter table quotes drop constraint quotes_status_check;
alter table quotes add constraint quotes_status_check check (status in ('brouillon','envoye','accepte','refuse','expire'));

alter table app_settings
  add column quote_followup2_days int not null default 12,
  add column quote_expire_enabled boolean not null default true,
  add column auto_planning_enabled boolean not null default true;

-- Cadence de relance des impayés : 1re à J+1, 2e à J+7, puis alerte patron (seuil d'alerte). Uniquement si non personnalisée.
update app_settings set reminder_first_after_days = 1, reminder_interval_days = 6, reminder_max_count = 2
where reminder_first_after_days = 7 and reminder_interval_days = 14 and reminder_max_count = 3;

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  kind text not null default 'daily',
  ok boolean not null default true,
  report jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}'
);
create index automation_runs_idx on automation_runs (ran_at desc);

create table email_log (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  kind text not null,
  to_email text not null,
  subject text,
  ok boolean not null,
  error text,
  entity text,
  entity_id uuid,
  origin text not null default 'manuel' check (origin in ('manuel','auto'))
);
create index email_log_idx on email_log (sent_at desc);
create index email_log_entity_idx on email_log (entity, entity_id);

do $$
declare t text;
begin
  foreach t in array array['automation_runs','email_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

create or replace function automation_log_run(p_secret text, p_ok boolean, p_report jsonb, p_errors text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  insert into automation_runs(ok, report, errors) values (p_ok, p_report, coalesce(p_errors, '{}'));
  delete from automation_runs where ran_at < now() - interval '120 days';
end $$;

create or replace function automation_log_email(p_secret text, p_kind text, p_to text, p_subject text, p_ok boolean, p_error text, p_entity text, p_entity_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  insert into email_log(kind, to_email, subject, ok, error, entity, entity_id, origin) values (p_kind, p_to, p_subject, p_ok, p_error, p_entity, p_entity_id, 'auto');
end $$;

-- Création des passages du planning (rejouable : un passage n'est jamais créé deux fois).
create or replace function automation_insert_interventions(p_secret text, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform automation_guard(p_secret);
  insert into interventions(client_id, contract_id, title, scheduled_date, start_time, duration_hours, site_address, billable, unit_price_ht, assignee, source_key)
  select x.client_id, x.contract_id, x.title, x.scheduled_date, x.start_time, x.duration_hours, x.site_address, x.billable, x.unit_price_ht, x.assignee, x.source_key
  from jsonb_to_recordset(p_rows) as x(client_id uuid, contract_id uuid, title text, scheduled_date date, start_time time, duration_hours numeric,
                                       site_address text, billable boolean, unit_price_ht numeric, assignee text, source_key text)
  on conflict (source_key) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Indicateurs d'exception pour le récapitulatif quotidien.
create or replace function automation_alerts(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return jsonb_build_object(
    'unassigned_next7', (select count(*) from interventions where status = 'planifie' and assignee is null
                           and scheduled_date between current_date and current_date + 7),
    'to_confirm', (select count(*) from interventions where status = 'planifie' and scheduled_date < current_date and invoice_id is null),
    'requests_late', (select count(*) from quote_requests where status = 'nouvelle' and received_at < now() - interval '24 hours'),
    'overdue_15', (select count(*) from invoices where status = 'en_retard' and due_date < current_date - 15));
end $$;

-- Devis sans réponse : relance 1 après N jours, relance 2 après M jours (arrêt dès que le statut change).
create or replace function automation_quotes_to_follow(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s app_settings;
begin
  perform automation_guard(p_secret);
  select * into s from app_settings where id;
  if not s.quote_followup_enabled then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'number', q.number, 'subject', q.subject, 'level', q.followup_count + 1,
            'total_ttc', q.total_ttc, 'valid_until', q.valid_until, 'client_name', c.name, 'email', c.email)), '[]'::jsonb)
          from quotes q join clients c on c.id = q.client_id
          where q.status = 'envoye' and not c.is_reserved and c.email is not null
            and ((q.followup_count = 0 and q.sent_at < now() - make_interval(days => s.quote_followup_days))
              or (q.followup_count = 1 and q.sent_at < now() - make_interval(days => s.quote_followup2_days))));
end $$;

create or replace function automation_quote_followup_done(p_secret text, p_quote_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q quotes;
begin
  perform automation_guard(p_secret);
  update quotes set followup_sent_at = now(), followup_count = followup_count + 1 where id = p_quote_id returning * into q;
  insert into interactions(client_id, kind, summary) values (q.client_id, 'devis', 'Relance n°' || q.followup_count || ' du devis ' || q.number);
end $$;

-- Expiration automatique : devis envoyé, sans réponse, dont la validité est dépassée.
create or replace function automation_expire_quotes(p_secret text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform automation_guard(p_secret);
  if not (select quote_expire_enabled from app_settings where id) then return 0; end if;
  update quotes set status = 'expire' where status = 'envoye' and valid_until is not null and valid_until < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

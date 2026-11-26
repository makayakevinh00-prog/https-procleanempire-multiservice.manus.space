-- Le nettoyeur déclenche lui-même son virement : ses ménages validés non payés sont regroupés, une facture numérotée est créée.
alter table cleaning_payouts add column if not exists invoice_no text, add column if not exists requested_by_cleaner boolean not null default false, add column if not exists requested_at timestamptz;
create unique index if not exists cleaning_payouts_invoice_uq on cleaning_payouts (invoice_no) where invoice_no is not null;
create sequence if not exists payout_invoice_seq;

create or replace function cleaner_request_payout(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; ids uuid[]; total numeric(12, 2); n int; d1 date; d2 date; pid uuid; no text;
begin
  c := cleaner_by_token(p_token);
  perform 1 from cleaners where id = c.id for update;
  if c.iban is null then raise exception 'ARGUMENT: ajoutez votre IBAN dans Profil avant de demander un virement'; end if;
  select array_agg(id), coalesce(sum(cleaner_amount), 0), count(*), min(job_date), max(job_date) into ids, total, n, d1, d2
    from cleaning_jobs where cleaner_id = c.id and status = 'validee' and payout_id is null;
  if n = 0 or total <= 0 then raise exception 'INDISPONIBLE: aucun ménage validé à payer pour le moment'; end if;
  no := 'FACT-' || to_char((now() at time zone 'Europe/Paris')::date, 'YYYY') || '-' || lpad(nextval('payout_invoice_seq')::text, 4, '0');
  insert into cleaning_payouts(cleaner_id, period_start, period_end, amount, jobs, invoice_no, requested_by_cleaner, requested_at)
    values (c.id, d1, d2, total, n, no, true, now()) returning id into pid;
  update cleaning_jobs set payout_id = pid where id = any(ids);
  return jsonb_build_object('payout', pid, 'invoice_no', no, 'amount', total, 'jobs', n, 'cleaner', c.full_name);
end $$;

create or replace function cleaner_invoices(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_by_token(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'invoice_no', p.invoice_no, 'amount', p.amount, 'jobs', p.jobs, 'status', p.status, 'paid_on', p.paid_on, 'created_at', p.created_at) order by p.created_at desc)
    from cleaning_payouts p where p.cleaner_id = c.id and p.invoice_no is not null), '[]'::jsonb);
end $$;

create or replace function cleaner_invoice(p_token text, p_payout uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; p cleaning_payouts;
begin
  c := cleaner_by_token(p_token);
  select * into p from cleaning_payouts where id = p_payout and cleaner_id = c.id and invoice_no is not null;
  if not found then raise exception 'INDISPONIBLE: facture introuvable'; end if;
  return jsonb_build_object('invoice_no', p.invoice_no, 'date', (p.requested_at at time zone 'Europe/Paris')::date, 'amount', p.amount, 'status', p.status, 'paid_on', p.paid_on,
    'cleaner', jsonb_build_object('name', c.full_name, 'siret', c.siret, 'statut', c.statut_pro, 'email', c.email, 'city', c.city, 'iban_hint', case when c.iban is null then null else '•••• ' || right(c.iban, 4) end),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('date', j.job_date, 'city', j.city, 'cleaning', j.cleaner_amount - j.linen_bonus, 'linen', j.linen_bonus) order by j.job_date) from cleaning_jobs j where j.payout_id = p.id), '[]'::jsonb));
end $$;
grant execute on function cleaner_request_payout(text), cleaner_invoices(text), cleaner_invoice(text, uuid) to anon, authenticated;

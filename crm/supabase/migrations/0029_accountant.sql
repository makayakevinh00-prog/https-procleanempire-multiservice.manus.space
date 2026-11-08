-- 0029 — Accès comptable en LECTURE SEULE.
-- Le comptable a un vrai compte, mais n'a AUCUN droit sur les tables : il ne lit qu'à travers compta_data(), qui ne renvoie que
-- ce dont la comptabilité a besoin (factures émises, TVA, virements reçus, paiements fournisseurs) — ni coordonnées des clients, ni missions, ni JARVIS.
-- Invitation : le patron génère un code ; le comptable crée son compte puis « réclame » l'accès avec ce code (lié à SON identifiant, 5 essais).
create table if not exists accountants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  label text,
  code_hash text,
  code_expires_at timestamptz,
  claim_attempts int not null default 0,
  user_id uuid unique,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists accountants_email_active on accountants (lower(email)) where revoked_at is null;
alter table accountants enable row level security;
drop policy if exists accountants_owner on accountants;
create policy accountants_owner on accountants for all to authenticated using (is_owner()) with check (is_owner());

create or replace function is_accountant() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from accountants a
    where a.user_id is not null and a.user_id = auth.uid() and a.revoked_at is null
      and lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- Le patron invite : le code est généré par l'application, seule son empreinte est enregistrée.
create or replace function accountant_invite(p_email text, p_label text, p_code_hash text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALIDE'; end if;
  if p_code_hash is null or length(p_code_hash) <> 64 then raise exception 'CODE_INVALIDE'; end if;
  update accountants set revoked_at = now() where lower(email) = lower(p_email) and revoked_at is null;   -- une seule invitation active par adresse
  insert into accountants(email, label, code_hash, code_expires_at) values (lower(p_email), nullif(trim(p_label), ''), p_code_hash, now() + interval '7 days') returning id into v_id;
  return v_id;
end $$;

-- Le comptable réclame son accès : adresse du compte = adresse invitée, code exact, valable 7 jours, 5 essais.
create or replace function accountant_claim(p_code text) returns boolean language plpgsql security definer set search_path = public as $$
declare a accountants%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into a from accountants
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and revoked_at is null and user_id is null and code_hash is not null
   order by created_at desc limit 1;
  if not found or a.claim_attempts >= 5 or a.code_expires_at < now() then return false; end if;
  if a.code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'utf8')), 'hex') then
    update accountants set user_id = auth.uid(), claimed_at = now(), code_hash = null, claim_attempts = 0 where id = a.id;
    return true;
  end if;
  update accountants set claim_attempts = claim_attempts + 1 where id = a.id;
  return false;
end $$;

-- Données comptables d'un mois : seule porte de lecture du comptable (et du patron pour sa propre page).
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
    'payments', coalesce((select jsonb_agg(jsonb_build_object('received_at', p.received_at, 'amount', p.amount, 'counterparty', p.counterparty, 'label', p.label, 'match_status', p.match_status, 'invoice', mi.number) order by p.received_at desc)
      from payments p left join invoices mi on mi.id = p.matched_invoice_id
      where p.received_at >= s and p.received_at < (e + 1)), '[]'::jsonb),
    'supplier_payments', coalesce((select jsonb_agg(jsonb_build_object('paid_on', sp.paid_on, 'amount', sp.amount, 'label', sp.label, 'supplier', su.name, 'category', su.category) order by sp.paid_on desc)
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
  foreach f in array array['is_accountant()', 'accountant_invite(text,text,text)', 'accountant_claim(text)', 'compta_data(text)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

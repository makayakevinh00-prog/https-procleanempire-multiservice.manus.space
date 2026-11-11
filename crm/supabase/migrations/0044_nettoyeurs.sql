-- 0044 — Nettoyeurs indépendants : inscription, demandes de ménage avec créneau, acceptation (favoris prioritaires), parts de chacun, paiements.
-- Même principe que l'application des agents : lien privé (seule l'empreinte est stockée), aucun accès direct aux tables, tout passe par des fonctions qui vérifient le lien.
-- Le patron garde la main : il valide chaque inscription, chaque ménage terminé et chaque paiement.

create table if not exists marketplace_settings (
  id boolean primary key default true check (id),
  cleaner_pct numeric(5, 2) not null default 75,
  platform_pct numeric(5, 2) not null default 10,
  logistics_pct numeric(5, 2) not null default 15,
  window_start time not null default '11:00',
  window_end time not null default '14:00',
  max_end time not null default '16:00',
  priority_minutes int not null default 120 check (priority_minutes between 0 and 2880),
  updated_at timestamptz not null default now(),
  check (cleaner_pct between 50 and 90 and platform_pct >= 0 and logistics_pct >= 0 and round(cleaner_pct + platform_pct + logistics_pct, 2) = 100)
);
insert into marketplace_settings (id) values (true) on conflict do nothing;

create table if not exists cleaners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) >= 2),
  email text not null,
  phone text,
  siret text check (siret is null or siret ~ '^\d{14}$'),
  statut_pro text not null default 'auto_entrepreneur' check (statut_pro in ('etudiant', 'auto_entrepreneur', 'entreprise')),
  departments text[] not null default '{}',
  city text,
  iban text,
  status text not null default 'en_attente' check (status in ('en_attente', 'actif', 'refuse', 'suspendu')),
  token_hash text unique,
  token_set_at timestamptz,
  approved_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists cleaners_email_uq on cleaners (lower(email));

create table if not exists cleaning_jobs (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid unique references interventions(id) on delete set null,
  listing_id uuid,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  job_date date not null,
  window_start time not null default '11:00',
  window_end time not null default '14:00',
  duration_hours numeric(5, 2),
  city text, postal_code text,
  address text, access_notes text,                         -- jamais montrés avant l'acceptation
  price_ht numeric(12, 2) not null check (price_ht >= 0),
  cleaner_amount numeric(12, 2), platform_amount numeric(12, 2), logistics_amount numeric(12, 2),
  status text not null default 'ouverte' check (status in ('ouverte', 'acceptee', 'a_verifier', 'a_reprendre', 'validee', 'annulee')),
  cleaner_id uuid references cleaners(id) on delete set null,
  priority_until timestamptz,
  accepted_at timestamptz, done_at timestamptz, validated_at timestamptz,
  cleaner_note text, review_note text,
  payout_id uuid,
  created_at timestamptz not null default now(),
  check (window_end > window_start)
);
create index if not exists cleaning_jobs_open_idx on cleaning_jobs (status, job_date);
create index if not exists cleaning_jobs_cleaner_idx on cleaning_jobs (cleaner_id, status);

create table if not exists cleaner_favorites (
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cleaner_id, client_id)
);

create table if not exists cleaning_payouts (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete restrict,
  period_start date not null, period_end date not null,
  amount numeric(12, 2) not null check (amount > 0),
  jobs int not null default 0,
  status text not null default 'a_payer' check (status in ('a_payer', 'paye')),
  paid_on date,
  created_at timestamptz not null default now()
);
do $$ begin
  if to_regclass('public.concierge_listings') is not null and not exists (select 1 from pg_constraint where conname = 'cleaning_jobs_listing_fk') then
    alter table cleaning_jobs add constraint cleaning_jobs_listing_fk foreign key (listing_id) references concierge_listings(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cleaning_jobs_payout_fk') then
    alter table cleaning_jobs add constraint cleaning_jobs_payout_fk foreign key (payout_id) references cleaning_payouts(id) on delete set null;
  end if;
end $$;

-- Montants figés à la publication d'après les parts du moment : le patron les modifie sans changer les ménages déjà publiés.
create or replace function cleaning_job_amounts() returns trigger language plpgsql as $$
declare s marketplace_settings;
begin
  select * into s from marketplace_settings limit 1;
  if tg_op = 'INSERT' or new.price_ht is distinct from old.price_ht then
    new.cleaner_amount := round(new.price_ht * s.cleaner_pct / 100, 2);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - new.cleaner_amount - new.platform_amount, 2);
  end if;
  return new;
end $$;
drop trigger if exists cleaning_jobs_amounts_t on cleaning_jobs;
create trigger cleaning_jobs_amounts_t before insert or update of price_ht on cleaning_jobs for each row execute function cleaning_job_amounts();

-- Le patron : tout. Les nettoyeurs : rien en direct.
do $$ declare t text; begin
  foreach t in array array['marketplace_settings', 'cleaners', 'cleaning_jobs', 'cleaner_favorites', 'cleaning_payouts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- ───────────── Fonctions publiques et fonctions « nettoyeur » (lien privé) ─────────────

-- Inscription : crée une demande « en attente » ; rien n'est accessible avant la validation du patron.
create or replace function cleaner_signup(p jsonb) returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p ->> 'email', ''))); v_name text := trim(coalesce(p ->> 'full_name', '')); v_siret text := regexp_replace(coalesce(p ->> 'siret', ''), '\s', '', 'g');
        v_depts text[]; v_status text := coalesce(p ->> 'statut_pro', 'auto_entrepreneur');
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_name) < 2 then raise exception 'ARGUMENT: nom et e-mail valides obligatoires'; end if;
  if v_status not in ('etudiant', 'auto_entrepreneur', 'entreprise') then v_status := 'auto_entrepreneur'; end if;
  if v_siret <> '' and v_siret !~ '^\d{14}$' then raise exception 'ARGUMENT: le SIRET doit contenir 14 chiffres'; end if;
  select coalesce(array_agg(distinct d), '{}') into v_depts from unnest(string_to_array(regexp_replace(coalesce(p ->> 'departments', ''), '\s', '', 'g'), ',')) d where d ~ '^(\d{2,3}|2[AB])$';
  if cardinality(v_depts) = 0 then raise exception 'ARGUMENT: indiquez au moins un département (ex. 95)'; end if;
  if exists (select 1 from cleaners where lower(email) = v_email) then return 'deja'; end if;
  if (select count(*) from cleaners where status = 'en_attente') >= 200 then raise exception 'ARGUMENT: trop de demandes en attente, réessayez plus tard'; end if;   -- garde-fou contre le remplissage abusif du formulaire public
  insert into cleaners(full_name, email, phone, siret, statut_pro, departments, city)
  values (left(v_name, 120), left(v_email, 200), left(nullif(trim(coalesce(p ->> 'phone', '')), ''), 40), nullif(v_siret, ''), v_status, v_depts, left(nullif(trim(coalesce(p ->> 'city', '')), ''), 120));
  return 'ok';
end $$;

create or replace function cleaner_by_token(p_token text) returns cleaners language plpgsql security definer set search_path = public as $$
declare c cleaners;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  select * into c from cleaners where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and status = 'actif';
  if not found then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  return c;
end $$;
revoke all on function cleaner_by_token(text) from public, anon, authenticated;

-- Tableau de bord : profil, parts, gains à venir et déjà payés.
create or replace function cleaner_overview(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; s marketplace_settings;
begin
  c := cleaner_by_token(p_token);
  select * into s from marketplace_settings limit 1;
  return jsonb_build_object('name', c.full_name, 'email', c.email, 'phone', c.phone, 'departments', c.departments, 'city', c.city, 'has_iban', c.iban is not null,
    'iban_hint', case when c.iban is null then null else '•••• ' || right(c.iban, 4) end,
    'window_start', s.window_start, 'window_end', s.window_end, 'max_end', s.max_end,
    'done', (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee'),
    'pending_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status in ('acceptee', 'a_verifier', 'a_reprendre')), 0),
    'to_pay_amount', coalesce((select sum(cleaner_amount) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.payout_id is null), 0),
    'in_payout_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'a_payer'), 0),
    'paid_amount', coalesce((select sum(amount) from cleaning_payouts p where p.cleaner_id = c.id and p.status = 'paye'), 0),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('period_start', p.period_start, 'period_end', p.period_end, 'amount', p.amount, 'jobs', p.jobs, 'status', p.status, 'paid_on', p.paid_on) order by p.period_end desc) from (select * from cleaning_payouts where cleaner_id = c.id order by period_end desc limit 24) p), '[]'::jsonb));
end $$;

-- Demandes ouvertes dans ses départements : ville et code postal seulement (l'adresse n'est donnée qu'après acceptation).
create or replace function cleaner_open_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'amount', j.cleaner_amount,
        'favorite', exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id),
        'priority_until', case when j.priority_until > now() then j.priority_until else null end) order by j.job_date, j.window_start)
      from cleaning_jobs j
     where j.status = 'ouverte' and j.job_date >= today
       and exists (select 1 from unnest(c.departments) d where left(coalesce(j.postal_code, ''), length(d)) = d)
       and (j.priority_until is null or j.priority_until <= now() or exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id))), '[]'::jsonb));
end $$;

-- Mes missions (adresse et accès visibles : elles sont à moi).
create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  return jsonb_build_object('jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

-- Acceptation : le premier qui accepte l'obtient (verrou), dans ses départements, jamais pendant la priorité des favoris.
create or replace function cleaner_accept_job(p_token text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date; fav boolean; pc text;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job for update;
  if not found or j.status <> 'ouverte' then raise exception 'INDISPONIBLE: ce ménage vient d''être pris ou n''est plus disponible'; end if;
  if j.job_date < today then raise exception 'INDISPONIBLE: cette date est passée'; end if;
  pc := coalesce(j.postal_code, '');
  if not exists (select 1 from unnest(c.departments) d where left(pc, length(d)) = d) then raise exception 'INDISPONIBLE: ce ménage est hors de vos départements'; end if;
  select exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) into fav;
  if j.priority_until is not null and j.priority_until > now() and not fav then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé aux favoris du propriétaire'; end if;
  update cleaning_jobs set status = 'acceptee', cleaner_id = c.id, accepted_at = now() where id = j.id;
  if j.intervention_id is not null then update interventions set assignee = c.full_name where id = j.intervention_id; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Se désister : seulement tant que le ménage n'est pas commencé et au moins 24 h avant ; le ménage repart en ligne.
create or replace function cleaner_release_job(p_token text, p_job uuid) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found or j.status <> 'acceptee' then raise exception 'INDISPONIBLE: vous ne pouvez plus vous désister de ce ménage'; end if;
  if (j.job_date + j.window_start) at time zone 'Europe/Paris' < now() + interval '24 hours' then raise exception 'INDISPONIBLE: moins de 24 h avant le ménage, prévenez directement l''entreprise'; end if;
  update cleaning_jobs set status = 'ouverte', cleaner_id = null, accepted_at = null where id = j.id;
  if j.intervention_id is not null then update interventions set assignee = null where id = j.intervention_id; end if;
end $$;

-- Ménage terminé : envoyé à la direction pour vérification.
create or replace function cleaner_finish_job(p_token text, p_job uuid, p_note text default null) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date;
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found or j.status not in ('acceptee', 'a_reprendre') then raise exception 'INDISPONIBLE: ce ménage ne peut pas être terminé maintenant'; end if;
  if j.job_date > today then raise exception 'INDISPONIBLE: ce ménage n''a pas encore lieu'; end if;
  update cleaning_jobs set status = 'a_verifier', done_at = now(), cleaner_note = left(nullif(trim(coalesce(p_note, '')), ''), 1000) where id = j.id;
  if j.intervention_id is not null then update interventions set stage = 'a_verifier' where id = j.intervention_id; end if;
end $$;

-- Profil : départements, téléphone, IBAN (contrôle de clé ; jamais renvoyé en entier).
create or replace function cleaner_update_profile(p_token text, p_departments text, p_phone text, p_iban text default null) returns void language plpgsql security definer set search_path = public as $$
declare c cleaners; v_depts text[]; v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
begin
  c := cleaner_by_token(p_token);
  select coalesce(array_agg(distinct d), '{}') into v_depts from unnest(string_to_array(regexp_replace(coalesce(p_departments, ''), '\s', '', 'g'), ',')) d where d ~ '^(\d{2,3}|2[AB])$';
  if cardinality(v_depts) = 0 then raise exception 'ARGUMENT: indiquez au moins un département (ex. 95)'; end if;
  if v_iban <> '' and (v_iban !~ '^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$' or length(v_iban) > 34) then raise exception 'ARGUMENT: IBAN invalide'; end if;
  update cleaners set departments = v_depts, phone = left(nullif(trim(coalesce(p_phone, '')), ''), 40), iban = case when v_iban = '' then iban else v_iban end where id = c.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_signup(jsonb)', 'cleaner_overview(text)', 'cleaner_open_jobs(text)', 'cleaner_my_jobs(text)', 'cleaner_accept_job(text,uuid)', 'cleaner_release_job(text,uuid)', 'cleaner_finish_job(text,uuid,text)', 'cleaner_update_profile(text,text,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

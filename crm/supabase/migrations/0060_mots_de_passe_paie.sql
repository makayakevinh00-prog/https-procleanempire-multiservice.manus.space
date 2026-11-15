-- 0060 — Mot de passe facultatif pour la connexion unique, inscription des nettoyeurs sans SIRET (compte en attente jusqu'au SIRET),
-- fiches de paie des agents salariés.

-- ───────────── Mots de passe (empreinte calculée par le serveur ; 5 erreurs = 15 minutes de blocage) ─────────────
create table if not exists login_passwords (
  email text primary key,
  pass_hash text not null,
  fails int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table login_passwords enable row level security;
revoke all on login_passwords from anon, authenticated;

-- Espaces d'une adresse : les nettoyeurs inscrits sans SIRET ont un espace « attente ».
create or replace function login_roles(p_email text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, ''))); r jsonb := '[]'::jsonb; g boolean := false;
begin
  if e = '' then return r; end if;
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'nettoyeur', 'id', id, 'label', full_name)) from cleaners where lower(email) = e and status = 'actif'), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'attente', 'id', id, 'label', full_name)) from cleaners where lower(email) = e and status = 'en_attente' and siret is null), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'agent', 'id', id, 'label', full_name)) from staff where lower(email) = e and active), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'linge', 'id', id, 'label', full_name)) from linen_couriers where lower(email) = e and active), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'partenaire', 'id', a.client_id, 'label', c.name)) from partner_access a join clients c on c.id = a.client_id where lower(c.email) = e and a.active), '[]'::jsonb);
  if to_regclass('auth.users') is not null then execute 'select exists (select 1 from auth.users where lower(email) = $1)' into g using e; end if;
  if g then r := r || jsonb_build_array(jsonb_build_object('kind', 'gestion', 'id', null, 'label', 'Espace de gestion')); end if;
  return r;
end $$;
revoke all on function login_roles(text) from public, anon, authenticated;

-- Enregistrer un mot de passe : appelé par le serveur juste après un code e-mail valide (preuve que l'adresse est bien à la personne).
create or replace function automation_password_set(p_secret text, p_email text, p_hash text) returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  perform automation_guard(p_secret);
  if e = '' or length(coalesce(p_hash, '')) < 40 then raise exception 'ARGUMENT: mot de passe invalide'; end if;
  insert into login_passwords(email, pass_hash) values (e, p_hash)
  on conflict (email) do update set pass_hash = excluded.pass_hash, fails = 0, locked_until = null, updated_at = now();
end $$;

-- Lire l'empreinte pour la comparer côté serveur (null si aucun mot de passe ou compte bloqué).
create or replace function automation_password_get(p_secret text, p_email text) returns text language plpgsql security definer set search_path = public as $$
declare p login_passwords;
begin
  perform automation_guard(p_secret);
  select * into p from login_passwords where email = lower(trim(coalesce(p_email, '')));
  if not found or (p.locked_until is not null and p.locked_until > now()) then return null; end if;
  return p.pass_hash;
end $$;

-- Résultat de la comparaison : bon = les espaces ; mauvais = une erreur de plus, blocage de 15 minutes à la cinquième.
create or replace function automation_password_result(p_secret text, p_email text, p_ok boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  perform automation_guard(p_secret);
  if p_ok then
    update login_passwords set fails = 0, locked_until = null where email = e;
    if not found then return null; end if;
    return login_roles(e);
  end if;
  update login_passwords set locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' else locked_until end, fails = case when fails + 1 >= 5 then 0 else fails + 1 end where email = e;
  return null;
end $$;

-- Jeton d'appareil : l'espace « attente » utilise un jeton de nettoyeur.
create or replace function automation_issue_token(p_secret text, p_kind text, p_subject uuid, p_token_hash text) returns void language plpgsql security definer set search_path = public as $$
declare k text := case when p_kind = 'attente' then 'nettoyeur' else p_kind end;
begin
  perform automation_guard(p_secret);
  if k not in ('nettoyeur', 'agent', 'linge', 'partenaire') or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'ARGUMENT: jeton invalide'; end if;
  insert into access_tokens(token_hash, kind, subject_id) values (p_token_hash, k, p_subject);
  delete from access_tokens where kind = k and subject_id = p_subject and token_hash not in (select token_hash from access_tokens where kind = k and subject_id = p_subject order by created_at desc limit 5);
end $$;

-- ───────────── Nettoyeurs : inscription sans SIRET ─────────────
-- Sans SIRET, le compte est créé « en attente » avec son lien : la personne peut se connecter, mais ne voit aucun ménage tant que le SIRET n'est pas saisi.
create or replace function automation_cleaner_register(p_secret text, p jsonb, p_token_hash text) returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p ->> 'email', ''))); v_name text := trim(coalesce(p ->> 'full_name', '')); v_postal text := coalesce(p ->> 'postal_code', ''); v_status text := coalesce(p ->> 'statut_pro', 'auto_entrepreneur');
        v_lat double precision := nullif(p ->> 'lat', '')::double precision; v_lng double precision := nullif(p ->> 'lng', '')::double precision; v_radius int := coalesce(nullif(p ->> 'radius_km', '')::int, 15); v_active boolean := coalesce((p ->> 'verified')::boolean, false);
        v_siret text := nullif(regexp_replace(coalesce(p ->> 'siret', ''), '\s', '', 'g'), '');
begin
  perform automation_guard(p_secret);
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_name) < 2 then raise exception 'ARGUMENT: nom et e-mail valides obligatoires'; end if;
  if v_postal !~ '^\d{5}$' then raise exception 'ARGUMENT: code postal à 5 chiffres obligatoire'; end if;
  if v_radius < 1 or v_radius > 100 then raise exception 'ARGUMENT: rayon entre 1 et 100 km'; end if;
  if v_status not in ('etudiant', 'auto_entrepreneur', 'entreprise') then v_status := 'auto_entrepreneur'; end if;
  if exists (select 1 from cleaners where lower(email) = v_email) then return 'deja'; end if;
  if (select count(*) from cleaners where status = 'en_attente') >= 200 then raise exception 'ARGUMENT: trop de demandes en attente, réessayez plus tard'; end if;
  if v_siret is null then v_active := false; end if;
  insert into cleaners(full_name, email, phone, siret, statut_pro, departments, city, address_line, postal_code, lat, lng, radius_km, status, token_hash, token_set_at, approved_at)
  values (left(v_name, 120), left(v_email, 200), left(nullif(trim(coalesce(p ->> 'phone', '')), ''), 40), v_siret, v_status,
          array[left(v_postal, case when left(v_postal, 2) in ('97', '98') then 3 else 2 end)], left(nullif(trim(coalesce(p ->> 'city', '')), ''), 100), left(nullif(trim(coalesce(p ->> 'address_line', '')), ''), 200), v_postal, v_lat, v_lng, v_radius,
          case when v_active then 'actif' else 'en_attente' end, case when v_active or v_siret is null then p_token_hash end, case when v_active or v_siret is null then now() end, case when v_active then now() end);
  return case when v_active then 'actif' when v_siret is null then 'sans_siret' else 'attente' end;
end $$;

-- Compte en attente de SIRET, retrouvé par son lien ou par un jeton d'appareil (interne).
create or replace function cleaner_pending_by_token(p_token text) returns cleaners language plpgsql security definer set search_path = public as $$
declare c cleaners; h text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  h := encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  select * into c from cleaners where token_hash = h and status in ('en_attente', 'actif');
  if not found then select x.* into c from cleaners x join access_tokens t on t.subject_id = x.id and t.kind = 'nettoyeur' where t.token_hash = h and x.status in ('en_attente', 'actif'); end if;
  if c.id is null then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  return c;
end $$;
revoke all on function cleaner_pending_by_token(text) from public, anon, authenticated;

-- Ce que voit la personne en attente : son prénom et où elle en est.
create or replace function cleaner_pending(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_pending_by_token(p_token);
begin
  return jsonb_build_object('name', c.full_name, 'statut_pro', c.statut_pro,
    'state', case when c.status = 'actif' then 'actif' when c.siret is null then 'sans_siret' else 'a_valider' end);
end $$;
revoke all on function cleaner_pending(text) from public;
grant execute on function cleaner_pending(text) to anon, authenticated;

-- Saisie du SIRET (le serveur l'a contrôlé dans l'annuaire officiel) : vérifié = compte actif tout de suite ; sinon le patron valide.
create or replace function automation_cleaner_set_siret(p_secret text, p_token text, p_siret text, p_verified boolean) returns text language plpgsql security definer set search_path = public as $$
declare c cleaners; s text := regexp_replace(coalesce(p_siret, ''), '\s', '', 'g');
begin
  perform automation_guard(p_secret);
  c := cleaner_pending_by_token(p_token);
  if c.status = 'actif' then return 'actif'; end if;
  if s !~ '^\d{14}$' then raise exception 'ARGUMENT: le SIRET comporte 14 chiffres'; end if;
  if exists (select 1 from cleaners where siret = s and id <> c.id) then raise exception 'ARGUMENT: ce SIRET est déjà utilisé par un autre compte'; end if;
  update cleaners set siret = s, status = case when p_verified then 'actif' else 'en_attente' end, approved_at = case when p_verified then now() else approved_at end where id = c.id;
  return case when p_verified then 'actif' else 'a_valider' end;
end $$;

-- ───────────── Fiches de paie des agents salariés ─────────────
create table if not exists payslips (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  period date not null,
  file_name text not null,
  mime text not null default 'application/pdf',
  data_b64 text not null,
  net_amount numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (staff_id, period)
);
alter table payslips enable row level security;
revoke all on payslips from anon;
drop policy if exists payslips_owner on payslips;
create policy payslips_owner on payslips for all to authenticated using (is_owner()) with check (is_owner());

-- L'agent voit la liste de ses fiches (sans le fichier), puis ouvre une fiche.
create or replace function agent_payslips(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s staff := agent_by_token(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'period', period, 'file_name', file_name, 'net_amount', net_amount) order by period desc) from payslips where staff_id = s.id), '[]'::jsonb);
end $$;
create or replace function agent_payslip_file(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s staff := agent_by_token(p_token); r jsonb;
begin
  select jsonb_build_object('file_name', file_name, 'mime', mime, 'data', data_b64) into r from payslips where id = p_id and staff_id = s.id;
  if r is null then raise exception 'ACCES_REFUSE: fiche introuvable'; end if;
  return r;
end $$;

do $$ declare f text; begin
  foreach f in array array['automation_password_set(text,text,text)', 'automation_password_get(text,text)', 'automation_password_result(text,text,boolean)', 'automation_issue_token(text,text,uuid,text)',
    'automation_cleaner_register(text,jsonb,text)', 'automation_cleaner_set_siret(text,text,text,boolean)', 'agent_payslips(text)', 'agent_payslip_file(text,uuid)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

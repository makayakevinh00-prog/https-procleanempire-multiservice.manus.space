-- 0040 — Équipe et accès : le patron invite des collaborateurs (RH, commercial, alternant, stagiaire…) et règle leurs droits section par section.
-- Principe : l'accès est imposé ICI, dans la base (politiques RLS), pas seulement par les menus. Le patron garde seul : paramètres, équipe, JARVIS, connecteurs.
-- Chaque droit est « read » (lecture) ou « write » (lecture et modification) ; l'absence de droit = aucun accès.
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  label text,
  role text not null default 'autre' check (role in ('rh', 'commercial', 'alternant', 'stagiaire', 'autre')),
  perms jsonb not null default '{}'::jsonb check (jsonb_typeof(perms) = 'object'),
  can_invite boolean not null default false,        -- réservé à une délégation ultérieure ; sans effet pour l'instant
  code_hash text,
  code_expires_at timestamptz,
  claim_attempts int not null default 0,
  user_id uuid,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists team_members_email_active on team_members (lower(email)) where revoked_at is null;
create unique index if not exists team_members_user_active on team_members (user_id) where revoked_at is null and user_id is not null;
alter table team_members enable row level security;
drop policy if exists team_members_owner on team_members;
create policy team_members_owner on team_members for all to authenticated using (is_owner()) with check (is_owner());

-- Membre actif : compte réclamé, non révoqué, et même adresse que celle invitée.
create or replace function team_member_row() returns team_members language sql stable security definer set search_path = public as $$
  select * from team_members t
   where t.user_id is not null and t.user_id = auth.uid() and t.revoked_at is null
     and lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1
$$;
create or replace function is_team_member() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members t
   where t.user_id is not null and t.user_id = auth.uid() and t.revoked_at is null
     and lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- Niveau d'une section : le patron a tout ; un membre a ce que le patron lui a réglé ; les autres n'ont rien.
create or replace function team_level(p_section text) returns text language sql stable security definer set search_path = public as $$
  select case
    when is_owner() then 'write'
    else (select case t.perms ->> p_section when 'write' then 'write' when 'read' then 'read' else null end
            from team_members t
           where t.user_id is not null and t.user_id = auth.uid() and t.revoked_at is null
             and lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1)
  end
$$;
create or replace function team_can(p_section text, p_need text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(case p_need when 'read' then team_level(p_section) in ('read', 'write') when 'write' then team_level(p_section) = 'write' else false end, false)
$$;

-- Ce que la personne connectée peut faire (affichage du menu et de l'accueil de l'équipe).
create or replace function my_access() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t team_members%rowtype;
begin
  if is_owner() then return jsonb_build_object('kind', 'owner'); end if;
  select * into t from team_member_row();
  if t.id is not null then return jsonb_build_object('kind', 'team', 'role', t.role, 'label', t.label, 'perms', t.perms); end if;
  if is_accountant() then return jsonb_build_object('kind', 'accountant'); end if;
  return jsonb_build_object('kind', 'none');
end $$;

-- Paramètres de l'entreprise sans aucun secret (le jeton d'automatisation reste réservé au patron) : pour les devis, PDF et pages de l'équipe.
create or replace function team_settings() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_owner() or is_team_member()) then raise exception 'ACCES_REFUSE'; end if;
  return (select to_jsonb(a) - 'automation_secret' from app_settings a limit 1);
end $$;

-- Le patron invite : le code est généré par l'application, seule son empreinte est enregistrée (comme pour le comptable).
create or replace function team_invite(p_email text, p_label text, p_role text, p_perms jsonb, p_code_hash text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_owner() then raise exception 'ACCES_REFUSE'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALIDE'; end if;
  if lower(p_email) = lower((select owner_email from app_settings where id)) then raise exception 'EMAIL_PATRON'; end if;
  if p_code_hash is null or length(p_code_hash) <> 64 then raise exception 'CODE_INVALIDE'; end if;
  update team_members set revoked_at = now() where lower(email) = lower(p_email) and revoked_at is null;
  insert into team_members(email, label, role, perms, code_hash, code_expires_at)
  values (lower(p_email), nullif(trim(p_label), ''), coalesce(p_role, 'autre'), coalesce(p_perms, '{}'::jsonb), p_code_hash, now() + interval '7 days') returning id into v_id;
  return v_id;
end $$;

-- La personne invitée réclame son accès : même adresse que l'invitation, code exact, valable 7 jours, 5 essais.
create or replace function team_claim(p_code text) returns boolean language plpgsql security definer set search_path = public as $$
declare a team_members%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into a from team_members
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and revoked_at is null and user_id is null and code_hash is not null
   order by created_at desc limit 1;
  if not found or a.claim_attempts >= 5 or a.code_expires_at < now() then return false; end if;
  if a.code_hash = encode(sha256(convert_to(coalesce(p_code, ''), 'utf8')), 'hex') then
    update team_members set user_id = auth.uid(), claimed_at = now(), code_hash = null, claim_attempts = 0 where id = a.id;
    return true;
  end if;
  update team_members set claim_attempts = claim_attempts + 1 where id = a.id;
  return false;
end $$;

-- Numérotation et journal : ouverts aux membres qui travaillent sur les devis, contrats, missions ou finances ; jamais à un tiers.
create or replace function next_counter(p_key text) returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is not null and not (is_owner() or team_can('devis', 'write') or team_can('contrats', 'write') or team_can('missions', 'write') or team_can('finances', 'write')) then raise exception 'ACCES_REFUSE'; end if;
  insert into counters(key, value) values (p_key, 1)
  on conflict (key) do update set value = counters.value + 1
  returning value into v;
  return v;
end $$;
create or replace function log_audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}') returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not (is_owner() or is_team_member()) then raise exception 'ACCES_REFUSE'; end if;
  insert into audit_log(user_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- Faille à fermer : d'anciennes politiques « is_comptable() » (créées hors migrations) donnent la lecture des clients et factures à tout compte lié à une fiche
-- du personnel de rôle « comptable ». Avec des droits RH délégués, un membre pourrait se l'attribuer : le comptable passe désormais uniquement par compta_data().
drop policy if exists clients_comptable_read on clients;
drop policy if exists invoices_comptable_read on invoices;
drop policy if exists invoice_lines_comptable_read on invoice_lines;
drop function if exists is_comptable();

-- Droits par section sur les tables : lecture pour « read » et « write », écriture pour « write » seulement. Les politiques du patron ne changent pas.
do $$ declare m record; t text; s text;
begin
  for m in select * from (values
    ('clients', array['clients', 'client_emails', 'interactions', 'quote_requests', 'sites']),
    ('devis', array['quotes', 'quote_lines']),
    ('contrats', array['contracts']),
    ('missions', array['interventions', 'mission_issues', 'sites']),
    ('rh', array['staff']),
    ('conciergerie', array['concierge_listings', 'concierge_stays', 'concierge_revenues', 'concierge_automations']),
    ('veille', array['competitors', 'competitor_certifications', 'certifications', 'watch_items']),
    ('catalogue', array['services']),
    ('finances', array['invoices', 'invoice_lines', 'payments', 'suppliers', 'supplier_payments', 'reminders'])
  ) as x(section, tables)
  loop
    s := m.section;
    foreach t in array m.tables loop
      if to_regclass('public.' || t) is null then continue; end if;
      execute format('drop policy if exists %I on %I', t || '_team_' || s || '_read', t);
      execute format('create policy %I on %I for select to authenticated using (team_can(%L, ''read''))', t || '_team_' || s || '_read', t, s);
      execute format('drop policy if exists %I on %I', t || '_team_' || s || '_ins', t);
      execute format('create policy %I on %I for insert to authenticated with check (team_can(%L, ''write''))', t || '_team_' || s || '_ins', t, s);
      execute format('drop policy if exists %I on %I', t || '_team_' || s || '_upd', t);
      execute format('create policy %I on %I for update to authenticated using (team_can(%L, ''write'')) with check (team_can(%L, ''write''))', t || '_team_' || s || '_upd', t, s, s);
      execute format('drop policy if exists %I on %I', t || '_team_' || s || '_del', t);
      execute format('create policy %I on %I for delete to authenticated using (team_can(%L, ''write''))', t || '_team_' || s || '_del', t, s);
    end loop;
  end loop;
  if to_regclass('public.mission_photos') is not null then
    drop policy if exists mission_photos_team_read on mission_photos;
    create policy mission_photos_team_read on mission_photos for select to authenticated using (team_can('missions', 'read'));
    drop policy if exists mission_photos_team_del on mission_photos;
    create policy mission_photos_team_del on mission_photos for delete to authenticated using (team_can('missions', 'write'));
  end if;
end $$;

do $$ declare f text; begin
  foreach f in array array['team_member_row()', 'is_team_member()', 'team_level(text)', 'team_can(text, text)', 'my_access()', 'team_settings()', 'team_invite(text, text, text, jsonb, text)', 'team_claim(text)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

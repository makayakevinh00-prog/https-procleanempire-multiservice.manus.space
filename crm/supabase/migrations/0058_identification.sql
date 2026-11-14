-- 0058 — Connexion unique : un e-mail, un code reçu par e-mail, puis ses espaces (nettoyeur, agent, livreur, conciergerie, gestion).
-- Chaque appareil connecté reçoit son propre jeton (les liens privés existants continuent de marcher). Tout passe par le secret du serveur.
create table if not exists login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists login_codes_email_idx on login_codes (email, created_at desc);
create table if not exists access_tokens (
  token_hash text primary key,
  kind text not null check (kind in ('nettoyeur', 'agent', 'linge', 'partenaire')),
  subject_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists access_tokens_subject_idx on access_tokens (kind, subject_id, created_at desc);
do $$ declare t text; begin
  foreach t in array array['login_codes', 'access_tokens'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- Les jetons d'appareil sont acceptés partout où un lien privé l'est.
create or replace function cleaner_by_token(p_token text) returns cleaners language plpgsql security definer set search_path = public as $$
declare c cleaners; h text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  h := encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  select * into c from cleaners where token_hash = h and status = 'actif';
  if not found then select x.* into c from cleaners x join access_tokens t on t.subject_id = x.id and t.kind = 'nettoyeur' where t.token_hash = h and x.status = 'actif'; end if;
  if c.id is null then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  return c;
end $$;
revoke all on function cleaner_by_token(text) from public, anon, authenticated;

create or replace function agent_by_token(p_token text) returns staff language plpgsql security definer set search_path = public as $$
declare s staff; h text;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'ACCES_REFUSE: lien invalide ou expiré — demandez un nouveau lien à votre responsable.'; end if;
  h := encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  select * into s from staff where agent_token_hash = h and active;
  if not found then select x.* into s from staff x join access_tokens t on t.subject_id = x.id and t.kind = 'agent' where t.token_hash = h and x.active; end if;
  if s.id is null then raise exception 'ACCES_REFUSE: lien invalide ou expiré — demandez un nouveau lien à votre responsable.'; end if;
  perform set_config('app.actor', 'Agent : ' || s.full_name, true);
  return s;
end $$;
revoke all on function agent_by_token(text) from public, anon, authenticated;

create or replace function courier_by_token(p_token text) returns linen_couriers language plpgsql security definer set search_path = public as $$
declare c linen_couriers; h text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  h := encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  select * into c from linen_couriers where token_hash = h and active;
  if not found then select x.* into c from linen_couriers x join access_tokens t on t.subject_id = x.id and t.kind = 'linge' where t.token_hash = h and x.active; end if;
  if c.id is null then raise exception 'ACCES_REFUSE: lien invalide ou expiré'; end if;
  return c;
end $$;
revoke all on function courier_by_token(text) from public, anon, authenticated;

create or replace function partner_client(p_secret text) returns uuid language plpgsql stable security definer set search_path = public as $$
declare cid uuid; h text;
begin
  if p_secret is null then raise exception 'ACCES_REFUSE: lien ou clé invalide'; end if;
  h := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  if p_secret ~ '^[0-9a-f]{64}$' then
    select client_id into cid from partner_access where token_hash = h and active;
    if cid is null then select a.client_id into cid from partner_access a join access_tokens t on t.subject_id = a.client_id and t.kind = 'partenaire' where t.token_hash = h and a.active; end if;
  elsif p_secret ~ '^pk_[0-9a-f]{48}$' then select client_id into cid from partner_access where api_key_hash = h and active;
  end if;
  if cid is null then raise exception 'ACCES_REFUSE: lien ou clé invalide'; end if;
  return cid;
end $$;
revoke all on function partner_client(text) from public, anon, authenticated;

-- Changer ou couper un lien privé déconnecte aussi tous les appareils.
create or replace function access_tokens_purge_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from access_tokens where kind = tg_argv[0] and subject_id = (to_jsonb(new) ->> case when tg_argv[0] = 'partenaire' then 'client_id' else 'id' end)::uuid;
  return new;
end $$;
drop trigger if exists cleaners_purge_tokens on cleaners;
create trigger cleaners_purge_tokens after update of token_hash, status on cleaners for each row when (old.token_hash is distinct from new.token_hash or (new.status <> 'actif' and old.status = 'actif')) execute function access_tokens_purge_trg('nettoyeur');
drop trigger if exists staff_purge_tokens on staff;
create trigger staff_purge_tokens after update of agent_token_hash, active on staff for each row when (old.agent_token_hash is distinct from new.agent_token_hash or (not new.active and old.active)) execute function access_tokens_purge_trg('agent');
drop trigger if exists couriers_purge_tokens on linen_couriers;
create trigger couriers_purge_tokens after update of token_hash, active on linen_couriers for each row when (old.token_hash is distinct from new.token_hash or (not new.active and old.active)) execute function access_tokens_purge_trg('linge');
drop trigger if exists partner_purge_tokens on partner_access;
create trigger partner_purge_tokens after update of token_hash, active on partner_access for each row when (old.token_hash is distinct from new.token_hash or (not new.active and old.active)) execute function access_tokens_purge_trg('partenaire');

-- Espaces d'une adresse e-mail (interne).
create or replace function login_roles(p_email text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, ''))); r jsonb := '[]'::jsonb; g boolean := false;
begin
  if e = '' then return r; end if;
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'nettoyeur', 'id', id, 'label', full_name)) from cleaners where lower(email) = e and status = 'actif'), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'agent', 'id', id, 'label', full_name)) from staff where lower(email) = e and active), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'linge', 'id', id, 'label', full_name)) from linen_couriers where lower(email) = e and active), '[]'::jsonb);
  r := r || coalesce((select jsonb_agg(jsonb_build_object('kind', 'partenaire', 'id', a.client_id, 'label', c.name)) from partner_access a join clients c on c.id = a.client_id where lower(c.email) = e and a.active), '[]'::jsonb);
  if to_regclass('auth.users') is not null then execute 'select exists (select 1 from auth.users where lower(email) = $1)' into g using e; end if;
  if g then r := r || jsonb_build_array(jsonb_build_object('kind', 'gestion', 'id', null, 'label', 'Espace de gestion')); end if;
  return r;
end $$;
revoke all on function login_roles(text) from public, anon, authenticated;

-- Demande de code : enregistré seulement si l'adresse a un espace ; 5 codes par heure au plus ; valable 10 minutes.
create or replace function automation_login_start(p_secret text, p_email text, p_code_hash text) returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  perform automation_guard(p_secret);
  delete from login_codes where expires_at < now() - interval '1 day';
  if jsonb_array_length(login_roles(e)) = 0 then return 'aucun'; end if;
  if (select count(*) from login_codes where email = e and created_at > now() - interval '1 hour') >= 5 then return 'trop'; end if;
  insert into login_codes(email, code_hash, expires_at) values (e, p_code_hash, now() + interval '10 minutes');
  return 'envoye';
end $$;

-- Vérification : 5 essais par code. Bon code = il est consommé et les espaces sont renvoyés.
create or replace function automation_login_verify(p_secret text, p_email text, p_code_hash text) returns jsonb language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, ''))); c login_codes;
begin
  perform automation_guard(p_secret);
  select * into c from login_codes where email = e and expires_at > now() order by created_at desc limit 1 for update;
  if not found or c.attempts >= 5 then return null; end if;
  if c.code_hash <> p_code_hash then update login_codes set attempts = attempts + 1 where id = c.id; return null; end if;
  delete from login_codes where email = e;
  return login_roles(e);
end $$;

-- Jeton d'appareil pour un espace (5 appareils par personne au plus : le plus ancien est déconnecté).
create or replace function automation_issue_token(p_secret text, p_kind text, p_subject uuid, p_token_hash text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  if p_kind not in ('nettoyeur', 'agent', 'linge', 'partenaire') or coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'ARGUMENT: jeton invalide'; end if;
  insert into access_tokens(token_hash, kind, subject_id) values (p_token_hash, p_kind, p_subject);
  delete from access_tokens where kind = p_kind and subject_id = p_subject and token_hash not in (select token_hash from access_tokens where kind = p_kind and subject_id = p_subject order by created_at desc limit 5);
end $$;

create or replace function automation_revoke_tokens(p_secret text, p_hashes text[]) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  delete from access_tokens where token_hash = any(coalesce(p_hashes, '{}'));
end $$;

do $$ declare f text; begin
  foreach f in array array['automation_login_start(text,text,text)', 'automation_login_verify(text,text,text)', 'automation_issue_token(text,text,uuid,text)', 'automation_revoke_tokens(text,text[])'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

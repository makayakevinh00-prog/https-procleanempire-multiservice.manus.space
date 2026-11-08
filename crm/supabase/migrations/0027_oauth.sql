-- 0027 — Connexion OAuth des connecteurs Claude (Cowork / claude.ai) : inscription du client, code d'autorisation à usage unique.
-- Compatible : uniquement des ajouts. Dépend de 0024 (liens d'agents).
-- Principe : seul le patron connecté peut AUTORISER (page de consentement) ; Claude reçoit alors un jeton d'agent (le même type de jeton
-- que les liens secrets : empreinte stockée, révocable dans Paramètres > Agents). PKCE (S256) obligatoire, redirections limitées à Claude et à localhost.

create table oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 5),
  created_at timestamptz not null default now()
);
create table oauth_codes (
  code_hash text primary key,
  client_id text not null references oauth_clients(client_id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  access_token text not null,          -- conservé au plus 10 minutes, supprimé à l'échange
  expires_at timestamptz not null
);
alter table oauth_clients enable row level security;
alter table oauth_codes enable row level security;
create policy oauth_clients_owner on oauth_clients for all to authenticated using (is_owner()) with check (is_owner());
create policy oauth_codes_owner on oauth_codes for all to authenticated using (is_owner()) with check (is_owner());
revoke all on oauth_clients, oauth_codes from anon;

-- Inscription dynamique d'un client (appelée sans session par Claude) : redirections strictement filtrées.
create or replace function oauth_register_client(p_name text, p_redirects text[]) returns text
language plpgsql security definer set search_path = public as $$
declare r text; v text;
begin
  if p_redirects is null or cardinality(p_redirects) not between 1 and 5 then raise exception 'INVALID_REDIRECT_URI: 1 à 5 adresses de retour'; end if;
  foreach r in array p_redirects loop
    if r !~ '^https://(claude\.ai|claude\.com|www\.claude\.ai)(/|$)' and r !~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)' then
      raise exception 'INVALID_REDIRECT_URI: adresse de retour non autorisée';
    end if;
  end loop;
  delete from oauth_clients where created_at < now() - interval '60 days' and not exists (select 1 from oauth_codes c where c.client_id = oauth_clients.client_id);
  if (select count(*) from oauth_clients) >= 300 then raise exception 'TROP_DE_CLIENTS'; end if;
  v := 'cl_' || replace(gen_random_uuid()::text, '-', '');
  insert into oauth_clients (client_id, client_name, redirect_uris) values (v, left(coalesce(p_name, 'Claude'), 80), p_redirects);
  return v;
end $$;
revoke all on function oauth_register_client(text, text[]) from public;
grant execute on function oauth_register_client(text, text[]) to anon, authenticated;

-- Échange du code contre le jeton (appelé sans session par Claude). Rend null si le code est inconnu, expiré ou non conforme ; usage unique.
create or replace function oauth_exchange(p_code_hash text, p_client text, p_redirect text, p_challenge text) returns text
language plpgsql security definer set search_path = public as $$
declare c oauth_codes;
begin
  delete from oauth_codes where expires_at < now();
  select * into c from oauth_codes where code_hash = p_code_hash for update;
  if not found then return null; end if;
  delete from oauth_codes where code_hash = p_code_hash;   -- usage unique : le code est brûlé même si la suite échoue (donc on rend null au lieu de lever une erreur, qui annulerait la suppression)
  if c.client_id <> p_client or c.redirect_uri <> p_redirect or c.code_challenge <> p_challenge then return null; end if;
  return c.access_token;
end $$;
revoke all on function oauth_exchange(text, text, text, text) from public;
grant execute on function oauth_exchange(text, text, text, text) to anon, authenticated;

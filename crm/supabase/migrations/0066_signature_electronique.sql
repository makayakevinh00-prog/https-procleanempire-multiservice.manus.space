-- 0066 — Signature électronique simple des devis et contrats, directement dans le CRM.
-- Le client reçoit un lien secret par e-mail, lit le document, coche son accord, tape son nom et dessine sa signature.
-- Preuves gardées : empreinte SHA-256 du document, date et heure, adresse IP, navigateur, nom, adresse e-mail, document signé avec page de certificat.
create table if not exists signature_requests (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (length(token) >= 40),
  kind text not null check (kind in ('devis', 'contrat')),
  quote_id uuid references quotes(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  doc_number text not null,
  doc_title text,
  signer_email text not null,
  pdf_b64 text not null,
  doc_hash text not null,
  status text not null default 'en_attente' check (status in ('en_attente', 'signe', 'refuse', 'expire', 'annule')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  signed_at timestamptz,
  signer_name text,
  signature_png text,
  signer_ip text,
  signer_ua text,
  signed_pdf_b64 text,
  refused_reason text
);
create index if not exists signature_requests_quote_idx on signature_requests (quote_id, created_at desc);
create index if not exists signature_requests_contract_idx on signature_requests (contract_id, created_at desc);
alter table signature_requests enable row level security;
revoke all on signature_requests from anon;
drop policy if exists signature_requests_owner on signature_requests;
create policy signature_requests_owner on signature_requests for all to authenticated using (is_owner()) with check (is_owner());

-- Ce que voit le signataire (jamais le document en base64 ici).
create or replace function signature_view(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r signature_requests;
begin
  select * into r from signature_requests where token = p_token;
  if not found then return null; end if;
  if r.status = 'en_attente' and r.expires_at < now() then r.status := 'expire'; end if;
  return jsonb_build_object('kind', r.kind, 'doc_number', r.doc_number, 'title', r.doc_title, 'status', r.status, 'expires_at', r.expires_at,
    'signed_at', r.signed_at, 'signer_name', r.signer_name, 'email', r.signer_email, 'company', (select company_name from app_settings limit 1));
end $$;
create or replace function signature_pdf(p_token text, p_signed boolean default false) returns text language plpgsql security definer set search_path = public as $$
declare r signature_requests;
begin
  select * into r from signature_requests where token = p_token;
  if not found then return null; end if;
  if p_signed then return r.signed_pdf_b64; end if;
  if r.status = 'en_attente' and r.expires_at < now() then return null; end if;
  return r.pdf_b64;
end $$;
revoke all on function signature_view(text), signature_pdf(text, boolean) from public;
grant execute on function signature_view(text), signature_pdf(text, boolean) to anon, authenticated;

-- Finalisation : appelée seulement par le serveur (secret) après contrôle de la saisie.
create or replace function automation_signature_complete(p_secret text, p_token text, p_name text, p_png text, p_ip text, p_ua text, p_signed_pdf text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r signature_requests;
begin
  perform automation_guard(p_secret);
  select * into r from signature_requests where token = p_token for update;
  if not found then raise exception 'INTROUVABLE: lien de signature inconnu'; end if;
  if r.status = 'signe' then return jsonb_build_object('already', true, 'doc_number', r.doc_number, 'kind', r.kind, 'email', r.signer_email); end if;
  if r.status <> 'en_attente' or r.expires_at < now() then raise exception 'EXPIRE: ce lien de signature n''est plus valable'; end if;
  if length(coalesce(p_name, '')) < 3 then raise exception 'ARGUMENT: nom du signataire obligatoire'; end if;
  update signature_requests set status = 'signe', signed_at = now(), signer_name = left(p_name, 120), signature_png = p_png, signer_ip = left(p_ip, 64), signer_ua = left(p_ua, 300), signed_pdf_b64 = p_signed_pdf where id = r.id;
  if r.kind = 'devis' and r.quote_id is not null then
    update quotes set status = 'accepte', accepted_at = now() where id = r.quote_id and status in ('brouillon', 'envoye');
  elsif r.kind = 'contrat' and r.contract_id is not null then
    update contracts set status = 'actif' where id = r.contract_id and status = 'en_cours';
  end if;
  if r.client_id is not null then
    insert into interactions(client_id, kind, summary) values (r.client_id, 'autre', (case when r.kind = 'devis' then 'Devis ' else 'Contrat ' end) || r.doc_number || ' signé en ligne par ' || left(p_name, 120));
  end if;
  return jsonb_build_object('doc_number', r.doc_number, 'kind', r.kind, 'email', r.signer_email, 'client_id', r.client_id);
end $$;
create or replace function automation_signature_refuse(p_secret text, p_token text, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare r signature_requests;
begin
  perform automation_guard(p_secret);
  select * into r from signature_requests where token = p_token and status = 'en_attente' for update;
  if not found then return; end if;
  update signature_requests set status = 'refuse', refused_reason = left(coalesce(p_reason, ''), 500) where id = r.id;
  if r.kind = 'devis' and r.quote_id is not null then update quotes set status = 'refuse' where id = r.quote_id and status = 'envoye'; end if;
  if r.client_id is not null then insert into interactions(client_id, kind, summary) values (r.client_id, 'autre', (case when r.kind = 'devis' then 'Devis ' else 'Contrat ' end) || r.doc_number || ' refusé en ligne' || coalesce(' : ' || nullif(left(p_reason, 300), ''), '')); end if;
end $$;
revoke all on function automation_signature_complete(text, text, text, text, text, text, text), automation_signature_refuse(text, text, text) from public;
grant execute on function automation_signature_complete(text, text, text, text, text, text, text), automation_signature_refuse(text, text, text) to anon, authenticated;

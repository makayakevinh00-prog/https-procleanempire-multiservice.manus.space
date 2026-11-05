-- 0013 — Module 1 : chaque demande du site crée (ou retrouve) automatiquement une fiche prospect,
-- avec type de demande, étape commerciale (pipeline) et historique des échanges.
-- Compatible : uniquement des ajouts ; les clients existants gardent leur statut.

-- ───────────────────────── Étape commerciale ─────────────────────────
alter table clients add column if not exists pipeline text
  check (pipeline in ('nouveau_prospect','a_contacter','rdv_programme','devis_envoye','devis_accepte','devis_refuse','client_actif'));
alter table clients add column if not exists source text;
update clients set pipeline = case status when 'actif' then 'client_actif' when 'prospect' then 'nouveau_prospect' end where pipeline is null;
create index if not exists clients_pipeline_idx on clients (pipeline);

-- ───────────────────────── Type de demande ─────────────────────────
alter table quote_requests add column if not exists request_type text not null default 'devis'
  check (request_type in ('devis','rendez_vous','airbnb','copropriete','professionnel','conciergerie'));

-- ───────────────────────── Historique : nouveaux types d'événements ─────────────────────────
alter table interactions drop constraint if exists interactions_kind_check;
alter table interactions add constraint interactions_kind_check
  check (kind in ('appel','email','rdv','note','relance','devis','facture','autre','demande','statut'));

-- ───────────────────────── Dédoublonnage ─────────────────────────
-- Téléphone comparé sur ses 9 derniers chiffres : « 06 12 34 56 78 » = « +33 6 12 34 56 78 ».
create or replace function norm_phone(p text) returns text language sql immutable set search_path = public as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9 then right(regexp_replace(p, '\D', '', 'g'), 9) end
$$;

-- L'e-mail identifie la personne en priorité ; le téléphone sert de repli seulement si l'e-mail ne correspond à aucune fiche.
create or replace function find_client_match(p_email text, p_phone text) returns uuid
language plpgsql stable set search_path = public as $$
declare cid uuid;
begin
  if nullif(trim(p_email), '') is not null then
    select id into cid from clients where lower(email) = lower(trim(p_email)) order by (status = 'inactif'), created_at limit 1;
    if cid is not null then return cid; end if;
  end if;
  if norm_phone(p_phone) is not null then
    select id into cid from clients where norm_phone(phone) = norm_phone(p_phone) order by (status = 'inactif'), created_at limit 1;
  end if;
  return cid;
end $$;

-- ───────────────────────── Réception d'une demande du site (remplace la v2) ─────────────────────────
create or replace function submit_quote_request_v2(p_secret text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v uuid; dup boolean := false; r quote_requests; cid uuid; fresh boolean := false; cl clients;
  nm text; cand text; recent int; label text; s app_settings;
begin
  perform automation_guard(p_secret);
  if nullif(p ->> 'reference', '') is not null then
    select id into v from quote_requests where reference = p ->> 'reference';
    if v is not null then dup := true; end if;
  end if;
  if v is null then
    insert into quote_requests(reference, received_at, name, company, email, phone, address, postcode, city, service, start_date, message, details, source, request_type)
    values (p ->> 'reference', coalesce((p ->> 'received_at')::timestamptz, now()), coalesce(nullif(p ->> 'name', ''), 'Sans nom'), p ->> 'company',
            p ->> 'email', p ->> 'phone', p ->> 'address', p ->> 'postcode', p ->> 'city', p ->> 'service', p ->> 'start_date',
            p ->> 'message', coalesce(p -> 'details', '{}'::jsonb), p ->> 'source', coalesce(nullif(p ->> 'type', ''), 'devis'))
    on conflict (reference) do nothing
    returning id into v;
    if v is null then
      select id into v from quote_requests where reference = p ->> 'reference';
      dup := true;
    end if;
  end if;
  select * into r from quote_requests where id = v;

  if not dup then
    -- 1. Fiche existante ? (e-mail ou téléphone) — jamais de doublon.
    cid := find_client_match(r.email, r.phone);
    -- 2. Sinon, nouvelle fiche prospect (sauf déluge : au-delà de 30 demandes/heure on enregistre la demande sans créer de fiche).
    select count(*) into recent from quote_requests where received_at > now() - interval '1 hour';
    if cid is null and recent <= 30 then
      nm := trim(coalesce(nullif(r.company, ''), r.name));
      cand := nm;
      if exists (select 1 from clients where lower(name) = lower(cand)) then cand := nm || ' (' || coalesce(nullif(r.city, ''), 'site web') || ')'; end if;
      if exists (select 1 from clients where lower(name) = lower(cand)) then cand := nm || ' (' || r.request_number || ')'; end if;
      insert into clients(name, kind, status, pipeline, email, phone, address, postal_code, city, source, notes)
      values (cand, case when nullif(r.company, '') is not null then 'entreprise' else 'particulier' end, 'prospect',
              case when r.request_type = 'rendez_vous' then 'a_contacter' else 'nouveau_prospect' end,
              nullif(r.email, ''), nullif(r.phone, ''), nullif(r.address, ''), nullif(r.postcode, ''), nullif(r.city, ''), 'site web',
              concat_ws(E'\n', case when nullif(r.company, '') is not null then 'Contact : ' || r.name end, nullif(r.message, '')))
      returning id into cid;
      fresh := true;
    end if;
    if cid is not null then
      update quote_requests set client_id = cid where id = r.id;
      select * into cl from clients where id = cid;
      -- Un ancien prospect refusé qui revient repart à zéro ; un client actif reste actif.
      if not fresh and cl.pipeline = 'devis_refuse' then update clients set pipeline = 'nouveau_prospect' where id = cid; end if;
      label := case r.request_type when 'devis' then 'devis' when 'rendez_vous' then 'rendez-vous' when 'airbnb' then 'nettoyage Airbnb'
               when 'copropriete' then 'nettoyage de copropriété' when 'professionnel' then 'nettoyage professionnel' else 'conciergerie' end;
      insert into interactions(client_id, kind, summary, created_by)
      values (cid, 'demande', left(format('Demande de %s depuis le site (%s) : %s%s%s', label, r.request_number, coalesce(r.service, 'prestation non précisée'),
              case when nullif(r.message, '') is not null then ' — ' || r.message else '' end,
              case when cl.is_reserved then ' [CONTACT RÉSERVÉ]' else '' end), 600), null);
    end if;
    select * into r from quote_requests where id = v;
  end if;

  select * into s from app_settings where id;
  select * into cl from clients where id = r.client_id;
  return jsonb_build_object('id', r.id, 'request_number', r.request_number, 'tracking_token', r.tracking_token, 'status', r.status, 'duplicate', dup,
    'client_id', r.client_id, 'new_prospect', fresh, 'reserved', coalesce(cl.is_reserved, false), 'request_type', r.request_type,
    'notify_to', coalesce(nullif(s.notify_email, ''), s.company_email), 'company_name', s.company_name);
end $$;
revoke all on function submit_quote_request_v2(text, jsonb) from public, anon;
grant execute on function submit_quote_request_v2(text, jsonb) to anon, authenticated;

-- ───────────────────────── Le pipeline suit la vie du devis et du contrat ─────────────────────────
create or replace function sync_pipeline_from_quote() returns trigger
language plpgsql security definer set search_path = public as $$
declare target text; txt text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  target := case new.status when 'envoye' then 'devis_envoye' when 'accepte' then 'devis_accepte' when 'refuse' then 'devis_refuse' end;
  txt := case new.status when 'envoye' then 'envoyé' when 'accepte' then 'accepté' when 'refuse' then 'refusé' when 'expire' then 'expiré' end;
  if target is not null then
    update clients set pipeline = target
     where id = new.client_id and pipeline is distinct from 'client_actif'
       and not (pipeline = 'devis_accepte' and target = 'devis_envoye');          -- jamais de retour en arrière
  end if;
  if txt is not null then
    insert into interactions(client_id, kind, summary, created_by) values (new.client_id, 'devis', format('Devis %s %s', coalesce(new.number, ''), txt), null);
  end if;
  return new;
end $$;
drop trigger if exists quotes_pipeline_t on quotes;
create trigger quotes_pipeline_t after insert or update of status on quotes for each row execute function sync_pipeline_from_quote();
revoke all on function sync_pipeline_from_quote() from public, anon, authenticated;

create or replace function sync_pipeline_from_contract() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'actif' and (tg_op = 'INSERT' or old.status is distinct from 'actif') then
    update clients set pipeline = 'client_actif', status = case when status = 'prospect' then 'actif' else status end where id = new.client_id;
    insert into interactions(client_id, kind, summary, created_by) values (new.client_id, 'statut', format('Contrat activé : %s — le prospect devient client actif', new.label), null);
  end if;
  return new;
end $$;
drop trigger if exists contracts_pipeline_t on contracts;
create trigger contracts_pipeline_t after insert or update of status on contracts for each row execute function sync_pipeline_from_contract();
revoke all on function sync_pipeline_from_contract() from public, anon, authenticated;

-- Le changement d'étape à la main est lui aussi daté dans l'historique.
create or replace function log_pipeline_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pipeline is distinct from old.pipeline and new.pipeline is not null and old.pipeline is not null then
    insert into interactions(client_id, kind, summary, created_by)
    values (new.id, 'statut', format('Étape commerciale : %s → %s', old.pipeline, new.pipeline), auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists clients_pipeline_log_t on clients;
create trigger clients_pipeline_log_t after update of pipeline on clients for each row execute function log_pipeline_change();
revoke all on function log_pipeline_change() from public, anon, authenticated;

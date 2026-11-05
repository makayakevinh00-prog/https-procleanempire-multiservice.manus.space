-- 0009 — API publique du site : numéro de demande, jeton de suivi, statut consultable par le client.
-- Compatible : uniquement des ajouts. Le public n'accède à AUCUNE table : il passe par deux fonctions
-- qui exigent le numéro de demande ET son jeton (capacité secrète à 256 bits), et ne renvoient que le strict nécessaire.

create sequence if not exists quote_request_seq;
alter table quote_requests add column if not exists request_number text unique;
alter table quote_requests add column if not exists tracking_token text;

create or replace function quote_request_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.request_number is null then
    new.request_number := 'DEM-' || to_char(now() at time zone 'Europe/Paris', 'YYMM') || '-' || lpad(nextval('quote_request_seq')::text, 4, '0');
  end if;
  if new.tracking_token is null then
    new.tracking_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');   -- 64 hex, ~244 bits
  end if;
  return new;
end $$;
drop trigger if exists quote_request_defaults_t on quote_requests;
create trigger quote_request_defaults_t before insert on quote_requests for each row execute function quote_request_defaults();
revoke all on function quote_request_defaults() from public, anon, authenticated;

-- Demandes déjà reçues : numéro et jeton rétroactifs.
update quote_requests set request_number = 'DEM-' || to_char(received_at at time zone 'Europe/Paris', 'YYMM') || '-' || lpad(nextval('quote_request_seq')::text, 4, '0')
  where request_number is null;
update quote_requests set tracking_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') where tracking_token is null;
create index if not exists quote_requests_token_idx on quote_requests (request_number);

-- Réception depuis le site (clé d'automatisation) : renvoie le numéro, le jeton de suivi et l'état ; idempotent sur `reference`.
create or replace function submit_quote_request_v2(p_secret text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v uuid; dup boolean := false; r quote_requests;
begin
  perform automation_guard(p_secret);
  insert into quote_requests(reference, received_at, name, company, email, phone, address, postcode, city, service, start_date, message, details, source)
  values (p ->> 'reference', coalesce((p ->> 'received_at')::timestamptz, now()), coalesce(nullif(p ->> 'name', ''), 'Sans nom'), p ->> 'company',
          p ->> 'email', p ->> 'phone', p ->> 'address', p ->> 'postcode', p ->> 'city', p ->> 'service', p ->> 'start_date',
          p ->> 'message', coalesce(p -> 'details', '{}'::jsonb), p ->> 'source')
  on conflict (reference) do nothing
  returning id into v;
  if v is null then
    select id into v from quote_requests where reference = p ->> 'reference';
    dup := true;
  end if;
  select * into r from quote_requests where id = v;
  return jsonb_build_object('id', r.id, 'request_number', r.request_number, 'tracking_token', r.tracking_token, 'status', r.status, 'duplicate', dup);
end $$;
revoke all on function submit_quote_request_v2(text, jsonb) from public, anon;
grant execute on function submit_quote_request_v2(text, jsonb) to anon, authenticated;   -- protégée par le secret (automation_guard)

-- Statut public d'une demande. Même réponse (null) pour numéro inconnu et mauvais jeton.
create or replace function public_request_status(p_ref text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r quote_requests; q quotes; inv invoices; c clients;
  today date := (now() at time zone 'Europe/Paris')::date;
  code text; label text; res jsonb; reserved boolean := false; missions jsonb;
begin
  if p_ref is null or p_token is null or length(p_token) < 32 or length(p_ref) > 30 then return null; end if;
  select * into r from quote_requests where request_number = upper(trim(p_ref)) and tracking_token = p_token;
  if not found then return null; end if;

  if r.quote_id is not null then select * into q from quotes where id = r.quote_id; end if;
  select * into c from clients where id = coalesce(r.client_id, q.client_id);
  reserved := coalesce(c.is_reserved, false);

  res := jsonb_build_object('request_number', r.request_number, 'received_at', r.received_at, 'service', r.service);

  -- Contact réservé : aucune information détaillée n'est publiée.
  if reserved then
    return res || jsonb_build_object('status', 'en_traitement', 'status_label', 'En cours de traitement : nous revenons vers vous directement.');
  end if;

  if r.status = 'ignoree' then code := 'clos'; label := 'Demande clôturée';
  elsif r.status = 'nouvelle' then code := 'recue'; label := 'Demande reçue : nous revenons vers vous rapidement.';
  elsif q.id is null then code := 'en_traitement'; label := 'En cours de traitement';
  else
    case q.status
      when 'envoye' then code := 'devis_envoye'; label := 'Devis envoyé : en attente de votre réponse';
      when 'accepte' then code := 'devis_accepte'; label := 'Devis accepté : merci pour votre confiance';
      when 'refuse' then code := 'devis_refuse'; label := 'Devis refusé';
      when 'expire' then code := 'devis_expire'; label := 'Devis expiré';
      else code := 'en_traitement'; label := 'Votre devis est en préparation';
    end case;
  end if;

  if q.id is not null and q.status <> 'brouillon' then
    res := res || jsonb_build_object('quote', jsonb_build_object('number', q.number, 'status', q.status, 'issue_date', q.issue_date,
      'valid_until', q.valid_until, 'total_ttc', q.total_ttc, 'document', true));
  end if;

  -- Rendez-vous et comptes rendus : missions du contrat issu de ce devis (jamais l'agent, ni l'accès, ni les notes).
  if q.contract_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
        'date', i.scheduled_date, 'time', i.start_time, 'hours', i.duration_hours, 'title', i.title,
        'label', case when i.stage in ('planifiee','affectee') then 'Confirmé' when i.stage in ('en_route','arrivee','en_cours') then 'En cours' else 'Réalisé' end,
        'done', (select count(*) from jsonb_array_elements(i.checklist) e where coalesce((e ->> 'done')::boolean, false)),
        'total', jsonb_array_length(i.checklist),
        'finished', i.stage in ('terminee','a_verifier','validee','facturable','facturee')
      ) order by i.scheduled_date, i.start_time nulls last), '[]'::jsonb) into missions
    from interventions i where i.contract_id = q.contract_id and i.stage not in ('brouillon','annulee') and i.scheduled_date >= today - 45;
    if jsonb_array_length(missions) > 0 then
      res := res || jsonb_build_object('appointments', missions);
      if code = 'devis_accepte' then code := 'planifie'; label := 'Intervention planifiée'; end if;
    end if;
  end if;

  if q.invoice_id is not null then
    select * into inv from invoices where id = q.invoice_id;
    if inv.id is not null and inv.status in ('envoye','en_retard','paye') and inv.number is not null then
      res := res || jsonb_build_object('invoice', jsonb_build_object('number', inv.number, 'status', inv.status, 'issue_date', inv.issue_date,
        'due_date', inv.due_date, 'total_ttc', inv.total_ttc, 'paid', inv.status = 'paye', 'document', true));
      code := 'facture'; label := case when inv.status = 'paye' then 'Facture réglée : merci !' else 'Facture émise' end;
    end if;
  end if;
  return res || jsonb_build_object('status', code, 'status_label', label);
end $$;

-- Données d'un document (devis / facture) pour le PDF public. Mêmes garde-fous que le statut.
create or replace function public_request_doc(p_ref text, p_token text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r quote_requests; q quotes; inv invoices; c clients; lines jsonb;
begin
  if p_ref is null or p_token is null or length(p_token) < 32 or length(p_ref) > 30 then return null; end if;
  select * into r from quote_requests where request_number = upper(trim(p_ref)) and tracking_token = p_token;
  if not found or r.quote_id is null then return null; end if;
  select * into q from quotes where id = r.quote_id;
  select * into c from clients where id = q.client_id;
  if coalesce(c.is_reserved, false) then return null; end if;
  if p_kind = 'devis' then
    if q.status = 'brouillon' then return null; end if;
    select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]'::jsonb) into lines from quote_lines l where l.quote_id = q.id;
    return jsonb_build_object('row', to_jsonb(q), 'lines', lines, 'client', jsonb_build_object('name', c.name, 'address', c.address, 'postal_code', c.postal_code, 'city', c.city, 'siret', c.siret, 'email', c.email),
      'company', (select to_jsonb(s) - 'automation_secret' from app_settings s where id));
  elsif p_kind = 'facture' then
    select * into inv from invoices where id = q.invoice_id;
    if inv.id is null or inv.status not in ('envoye','en_retard','paye') or inv.number is null then return null; end if;
    select coalesce(jsonb_agg(to_jsonb(l) order by l.position), '[]'::jsonb) into lines from invoice_lines l where l.invoice_id = inv.id;
    return jsonb_build_object('row', to_jsonb(inv), 'lines', lines, 'client', jsonb_build_object('name', c.name, 'address', c.address, 'postal_code', c.postal_code, 'city', c.city, 'siret', c.siret, 'email', c.email),
      'company', (select to_jsonb(s) - 'automation_secret' from app_settings s where id));
  end if;
  return null;
end $$;

revoke all on function public_request_status(text, text) from public;
revoke all on function public_request_doc(text, text, text) from public;
grant execute on function public_request_status(text, text), public_request_doc(text, text, text) to anon, authenticated;

-- 0020 — Échanges avec les clients (onglet « Échanges » de la fiche client, section « À faire maintenant » de l'accueil)
-- ADDITIVE : crée une table et deux fonctions. Aucune donnée existante n'est modifiée ni supprimée.
-- À appliquer seulement sur « go » explicite de Kevinh.
--
-- Une ligne = un message : mail reçu du client, réponse préparée par l'IA (à valider), mail envoyé, mise en demeure préparée/envoyée.
-- Les relances et e-mails déjà envoyés par le CRM restent dans `email_log` et `reminders` : la fiche client les rassemble à l'affichage.

create table if not exists client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade, -- null = expéditeur inconnu (aucune fiche avec cet e-mail)
  direction text not null check (direction in ('entrant', 'sortant')),
  kind text not null default 'mail' check (kind in ('mail', 'reponse_ia', 'mise_en_demeure')),
  status text not null check (status in ('recu', 'traite', 'a_valider', 'envoye', 'echec', 'annule')),
  subject text,
  body text not null,
  from_email text,
  to_email text,
  entity text,              -- 'invoice' pour une mise en demeure
  entity_id uuid,
  in_reply_to uuid references client_messages(id) on delete set null,
  ai_notes text,            -- points que l'IA demande de vérifier avant d'envoyer (jamais envoyés au client)
  external_id text,         -- identifiant du mail chez le fournisseur : évite les doublons
  received_at timestamptz,  -- horodatage du mail reçu
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint client_messages_sent_has_date check (status <> 'envoye' or sent_at is not null),
  constraint client_messages_inbound_is_mail check (direction = 'sortant' or kind = 'mail')
);
create index if not exists client_messages_client_idx on client_messages (client_id, created_at desc);
create index if not exists client_messages_todo_idx on client_messages (created_at desc) where status in ('recu', 'a_valider');
create unique index if not exists client_messages_external_uniq on client_messages (external_id) where external_id is not null;

alter table client_messages enable row level security;
drop policy if exists client_messages_owner on client_messages;
create policy client_messages_owner on client_messages for all to authenticated using (is_owner()) with check (is_owner());

-- Réception d'un mail client (appelée par /api/inbound/email avec le secret d'automatisation).
-- Rattache le mail à la fiche dont l'e-mail correspond ; sinon le garde sans fiche (visible sur l'accueil). Rejouable : même external_id = même ligne.
create or replace function automation_log_inbound_email(p_secret text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  addr text := lower(trim(coalesce(p->>'from_email', '')));
  cid uuid;
  mid uuid;
  ext text := nullif(p->>'external_id', '');
begin
  perform automation_guard(p_secret);
  if addr = '' or coalesce(trim(p->>'body'), '') = '' then raise exception 'MAIL_INVALIDE: expéditeur et contenu requis'; end if;
  if ext is not null then
    select id into mid from client_messages where external_id = ext;
    if mid is not null then return jsonb_build_object('id', mid, 'duplicate', true); end if;
  end if;
  select id into cid from clients where lower(email) = addr order by (status = 'actif') desc, created_at limit 1;
  insert into client_messages(client_id, direction, kind, status, subject, body, from_email, external_id, received_at)
  values (cid, 'entrant', 'mail', 'recu', left(p->>'subject', 300), left(p->>'body', 20000), addr, ext, coalesce((p->>'received_at')::timestamptz, now()))
  returning id into mid;
  if cid is not null then
    insert into interactions(client_id, kind, summary) values (cid, 'email', 'Mail reçu : ' || coalesce(nullif(left(p->>'subject', 120), ''), '(sans objet)'));
  end if;
  return jsonb_build_object('id', mid, 'client_id', cid, 'matched', cid is not null, 'duplicate', false);
end $$;
revoke execute on function automation_log_inbound_email(text, jsonb) from public, anon, authenticated;
grant execute on function automation_log_inbound_email(text, jsonb) to anon;

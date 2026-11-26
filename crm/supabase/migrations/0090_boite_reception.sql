-- Boîte de réception : les e-mails reçus des clients, rattachés à leur fiche, avec réponse depuis le CRM.
create table if not exists inbound_emails (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  received_at timestamptz not null default now(),
  from_email text not null,
  from_name text,
  subject text,
  body text,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'a_repondre' check (status in ('a_repondre','repondu','traite')),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inbound_emails_status_idx on inbound_emails (status, received_at desc);
create index if not exists inbound_emails_client_idx on inbound_emails (client_id, received_at desc);
alter table inbound_emails enable row level security;
drop policy if exists inbound_emails_owner on inbound_emails;
create policy inbound_emails_owner on inbound_emails for all to authenticated using (is_owner()) with check (is_owner());

-- Réception d'un e-mail (appelée avec le secret d'automatisation) : rattache l'expéditeur à un client connu, sans doublon.
create or replace function automation_inbound_email(p_secret text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_from text := lower(trim(coalesce(p->>'from_email','')));
        v_client uuid; v_id uuid;
begin
  perform automation_guard(p_secret);
  if v_from = '' or coalesce(p->>'message_id','') = '' then raise exception 'MESSAGE_INVALIDE'; end if;
  if v_from like '%@procleanempire.com' then return jsonb_build_object('ignored', true); end if;
  v_client := (select x.id from (select c.id from clients c where lower(c.email) = v_from union all select ce.client_id from client_emails ce where lower(ce.email) = v_from) x limit 1);
  insert into inbound_emails(message_id, received_at, from_email, from_name, subject, body, client_id)
  values (left(p->>'message_id', 300), coalesce((p->>'received_at')::timestamptz, now()), v_from, left(p->>'from_name', 160), left(p->>'subject', 300), left(p->>'body', 20000), v_client)
  on conflict (message_id) do nothing returning id into v_id;
  return jsonb_build_object('id', v_id, 'client_id', v_client, 'duplicate', v_id is null);
end $$;
revoke execute on function automation_inbound_email(text, jsonb) from public, anon, authenticated;
grant execute on function automation_inbound_email(text, jsonb) to anon, authenticated;

-- Contrats signés hors signature en ligne (papier, PDF renvoyé par e-mail) : on enregistre la date.
alter table contracts add column if not exists signed_on date;
alter table contracts add column if not exists signed_note text;

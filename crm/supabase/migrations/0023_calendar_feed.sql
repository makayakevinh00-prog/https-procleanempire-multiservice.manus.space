-- 0023 — Abonnement calendrier (Outlook, Google, Apple) : lien privé, révocable, en lecture seule.
-- Compatible : uniquement des ajouts. Seule l'empreinte SHA-256 du lien est stockée.
-- Le flux ne contient ni montant, ni facture, ni contrat, ni note interne, ni coordonnée de contact.
-- Les clients « contact réservé » n'y apparaissent que sous un titre neutre.

create table if not exists calendar_feed (
  id smallint primary key default 1 check (id = 1),   -- une seule ligne : un seul lien actif
  token_hash text not null,
  set_at timestamptz not null default now()
);
alter table calendar_feed enable row level security;
drop policy if exists calendar_feed_owner on calendar_feed;
create policy calendar_feed_owner on calendar_feed for all to authenticated using (is_owner()) with check (is_owner());

create or replace function calendar_feed_events(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_token is null or length(p_token) < 32
     or not exists (select 1 from calendar_feed where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')) then
    raise exception 'ACCES_REFUSE: lien invalide ou révoqué.';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'title', case when c.is_reserved then 'Mission (contact réservé)' else i.title end,
      'date', i.scheduled_date, 'time', i.start_time, 'hours', i.duration_hours, 'stage', i.stage,
      'agent', i.assignee, 'client', case when c.is_reserved then null else c.name end,
      'site', case when c.is_reserved then null else s.name end,
      'address', case when c.is_reserved then null else coalesce(i.site_address, nullif(concat_ws(', ', s.address, nullif(concat_ws(' ', s.postal_code, s.city), '')), '')) end,
      'updated_at', i.updated_at) order by i.scheduled_date, i.start_time nulls last), '[]'::jsonb)
    from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
    where i.scheduled_date between today - 60 and today + 180);
end $$;
revoke all on function calendar_feed_events(text) from public;
grant execute on function calendar_feed_events(text) to anon, authenticated;

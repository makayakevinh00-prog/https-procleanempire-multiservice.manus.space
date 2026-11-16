-- 0063 — Statut de chaque intervenant (salarié ou indépendant), suivi de l'installation de l'application, rappels de photos par e-mail.
alter table staff add column if not exists employment text not null default 'salarie' check (employment in ('salarie', 'auto_entrepreneur', 'entreprise', 'etudiant'));
alter table staff add column if not exists app_opened_at timestamptz;
alter table staff add column if not exists app_installed_at timestamptz;

create table if not exists agent_photo_reminders (
  intervention_id uuid primary key references interventions(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table agent_photo_reminders enable row level security;
revoke all on agent_photo_reminders from anon;
drop policy if exists agent_photo_reminders_owner on agent_photo_reminders;
create policy agent_photo_reminders_owner on agent_photo_reminders for all to authenticated using (is_owner()) with check (is_owner());

-- L'application s'ouvre : on le note ; ouverte depuis l'écran d'accueil du téléphone = installée.
create or replace function agent_mark_app(p_token text, p_installed boolean) returns void language plpgsql security definer set search_path = public as $$
declare s staff := agent_by_token(p_token);
begin
  update staff set app_opened_at = now(), app_installed_at = case when p_installed then coalesce(app_installed_at, now()) else app_installed_at end where id = s.id;
end $$;
revoke all on function agent_mark_app(text, boolean) from public;
grant execute on function agent_mark_app(text, boolean) to anon, authenticated;

-- Missions du jour demandé sans arrivée pointée ou sans photo, d'agents ayant un e-mail et n'ayant pas installé l'application, pas encore relancés.
create or replace function automation_photo_reminders(p_secret text, p_day date) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('intervention_id', i.id, 'staff_id', s.id, 'name', s.full_name, 'email', s.email, 'client', c.name, 'title', i.title,
      'address', coalesce(i.site_address, nullif(concat_ws(', ', st.address, nullif(concat_ws(' ', st.postal_code, st.city), '')), '')), 'date', i.scheduled_date, 'arrived', i.arrived_at is not null))
    from interventions i join staff s on s.id = i.staff_id join clients c on c.id = i.client_id left join sites st on st.id = i.site_id
    where i.scheduled_date = p_day and i.stage <> 'annulee' and s.active and s.email is not null and s.app_installed_at is null
      and (i.arrived_at is null or not exists (select 1 from mission_photos p where p.intervention_id = i.id))
      and not exists (select 1 from agent_photo_reminders r where r.intervention_id = i.id)), '[]'::jsonb);
end $$;
create or replace function automation_photo_reminder_done(p_secret text, p_intervention uuid, p_staff uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  insert into agent_photo_reminders(intervention_id, staff_id) values (p_intervention, p_staff) on conflict do nothing;
end $$;
revoke all on function automation_photo_reminders(text, date), automation_photo_reminder_done(text, uuid, uuid) from public;
grant execute on function automation_photo_reminders(text, date), automation_photo_reminder_done(text, uuid, uuid) to anon, authenticated;

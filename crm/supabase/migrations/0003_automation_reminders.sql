-- 0003 — Relances de factures impayées pilotées par la tâche planifiée (même secret que 0002).

create or replace function automation_refresh_overdue(p_secret text) returns int
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return refresh_overdue();
end $$;

create or replace function automation_due_reminders(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'automation_secret' from app_settings s where id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('invoice', to_jsonb(i),
                'client', jsonb_build_object('name', c.name, 'email', c.email, 'is_reserved', c.is_reserved))), '[]'::jsonb)
              from invoices i join clients c on c.id = i.client_id
              where i.status in ('envoye', 'en_retard')));
end $$;

-- Enregistre une relance AUTOMATIQUE : la base re-vérifie contact réservé, délai minimum et maximum de relances.
create or replace function automation_register_reminder(p_secret text, p_invoice_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r reminders;
begin
  perform automation_guard(p_secret);
  select * into r from register_reminder(p_invoice_id, 'email', 'auto', 'relance automatique');
  return to_jsonb(r);
end $$;

create or replace function automation_undo_reminder(p_secret text, p_reminder_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  perform undo_reminder(p_reminder_id);
end $$;

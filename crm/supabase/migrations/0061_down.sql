-- Retour arrière de 0061 : la fonction redevient celle de 0003 (facture + nom, e-mail et « contact réservé » du client).
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

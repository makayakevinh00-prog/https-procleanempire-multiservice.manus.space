-- Chaque mail client reçu, et chaque réponse envoyée, s'inscrit dans l'historique des échanges du client.
create or replace function inbound_email_to_history() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.client_id is not null then
    insert into interactions(client_id, kind, summary, occurred_at, created_by) values (new.client_id, 'email', left('Mail reçu : ' || coalesce(nullif(new.subject,''), '(sans objet)'), 300), new.received_at, null);
  elsif tg_op = 'UPDATE' and new.client_id is not null and new.status = 'repondu' and old.status is distinct from 'repondu' then
    insert into interactions(client_id, kind, summary, created_by) values (new.client_id, 'email', left('Réponse envoyée : ' || coalesce(nullif(new.subject,''), '(sans objet)'), 300), null);
  end if;
  return new;
end $$;
drop trigger if exists inbound_emails_history on inbound_emails;
create trigger inbound_emails_history after insert or update on inbound_emails for each row execute function inbound_email_to_history();

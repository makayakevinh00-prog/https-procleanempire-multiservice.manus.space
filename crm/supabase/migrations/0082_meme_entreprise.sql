-- Deux fiches client pour une même entreprise (deux dénominations, deux contrats, un seul lieu) : par exemple SEA et Île-de-France Recyclage.
-- Les fiches restent distinctes (contrats et factures séparés), mais le terrain les traite comme un seul passage :
-- quand l'agent pointe son arrivée (ou son départ) chez l'une, la mission du même jour chez l'autre est pointée avec.
alter table clients add column if not exists same_as uuid references clients(id) on delete set null;

create or replace function clients_linked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a is not null and b is not null and a <> b and exists (
    select 1 from clients x, clients y where x.id = a and y.id = b
      and (x.same_as = y.id or y.same_as = x.id or (x.same_as is not null and x.same_as = y.same_as)));
$$;
revoke all on function clients_linked(uuid, uuid) from public, anon;
grant execute on function clients_linked(uuid, uuid) to authenticated;

create or replace function interventions_same_company() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.staff_id is null then return new; end if;
  if new.arrived_at is not null and old.arrived_at is null then
    update interventions i set arrived_at = new.arrived_at, arrived_distance_m = new.arrived_distance_m, arrived_accuracy_m = new.arrived_accuracy_m, arrived_verified = new.arrived_verified,
        stage = case when i.stage::text in ('planifiee', 'affectee', 'en_route') then 'arrivee' else i.stage end
     where i.id <> new.id and i.staff_id = new.staff_id and i.scheduled_date = new.scheduled_date and i.arrived_at is null and i.invoice_id is null
       and i.stage::text in ('planifiee', 'affectee', 'en_route') and clients_linked(i.client_id, new.client_id);
  end if;
  return new;
end $$;
drop trigger if exists interventions_same_company_t on interventions;
create trigger interventions_same_company_t after update of arrived_at on interventions for each row execute function interventions_same_company();

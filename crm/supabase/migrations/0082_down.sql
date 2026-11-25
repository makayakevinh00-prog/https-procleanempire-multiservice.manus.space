drop trigger if exists interventions_same_company_t on interventions;
drop function if exists interventions_same_company();
drop function if exists clients_linked(uuid, uuid);
alter table clients drop column if exists same_as;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'category') then
    alter table services drop constraint if exists services_category_check;
    update services set category = 'options' where category = 'conciergerie';
    alter table services add constraint services_category_check check (category is null or category in ('bureaux', 'logements', 'commerces', 'vehicules', 'specialites', 'options'));
  end if;
end $$;
drop table if exists concierge_automations;
drop table if exists concierge_revenues;
drop table if exists concierge_stays;
drop table if exists concierge_listings;

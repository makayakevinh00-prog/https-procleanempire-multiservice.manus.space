drop trigger if exists interventions_zz_zones_t on interventions;
drop function if exists interventions_zone_checklist();
alter table sites drop constraint if exists sites_zones_is_array;
alter table sites drop column if exists zones, drop column if exists specifics, drop column if exists frequency;

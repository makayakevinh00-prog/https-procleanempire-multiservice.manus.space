-- Retour à la paye en pourcentage seul (version 0083).
create or replace function cleaning_job_amounts() returns trigger language plpgsql as $$
declare s marketplace_settings;
begin
  select * into s from marketplace_settings limit 1;
  if tg_op = 'INSERT' or new.price_ht is distinct from old.price_ht then
    new.cleaner_amount := round(new.price_ht * s.cleaner_pct / 100, 2) + coalesce(new.linen_bonus, 0);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - (new.cleaner_amount - coalesce(new.linen_bonus, 0)) - new.platform_amount - coalesce(new.linen_bonus, 0), 2);
  end if;
  return new;
end $$;

drop trigger if exists cleaning_jobs_amounts_t on cleaning_jobs;
create trigger cleaning_jobs_amounts_t before insert or update of price_ht on cleaning_jobs
  for each row execute function cleaning_job_amounts();

alter table cleaning_jobs drop column if exists job_kind;
alter table marketplace_settings drop column if exists hourly_floor_paris, drop column if exists hourly_floor_other, drop column if exists hourly_floor_office;

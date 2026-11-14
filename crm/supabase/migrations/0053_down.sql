drop function if exists partner_push_stay(text, uuid, text, date, date, boolean);
drop function if exists partner_set_api_key(text, text);
drop function if exists partner_guide(text, uuid);
drop function if exists partner_set_guide(text, uuid, jsonb);
drop function if exists partner_ref_for_analysis(text, uuid);
drop function if exists partner_ref_add_photo(text, uuid, text, text);
drop function if exists partner_set_linen(text, uuid, int);
drop function if exists partner_save_listing(text, uuid, jsonb);
drop function if exists partner_overview(text);
drop function if exists partner_listing(text, uuid);
drop function if exists partner_client(text);
drop table if exists partner_access;
drop trigger if exists cleaning_jobs_stock on cleaning_jobs;
drop function if exists cleaning_jobs_stock_trg();
alter table cleaning_jobs drop column if exists linen_counted;
do $$ begin if to_regclass('public.concierge_listings') is not null then alter table concierge_listings drop column if exists linen_per_stay, drop column if exists linen_dirty, drop column if exists linen_clean; end if; end $$;
-- courier_run_update, courier_runs, cleaning_job_linen et automation_concierge_apply reviennent à leur version en rejouant 0052 et 0047.

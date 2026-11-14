drop function if exists automation_job_ref_photos(text, uuid);
drop function if exists listing_ref_photos_b64(uuid);
drop function if exists listing_ref_add_photo(uuid, text, text);
drop table if exists listing_ref_photos;
do $$ begin if to_regclass('public.concierge_listings') is not null then alter table concierge_listings drop column if exists ref_at, drop column if exists ref_guide; end if; end $$;
-- cleaner_my_jobs et automation_job_context reviennent à leur version en rejouant 0050 et 0045 ; cleaning_job_guide reste (sans effet).

-- Retour arrière de 0069.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'nettoyeur-tick';
  end if;
end $$;
drop function if exists automation_accept_booking(text, uuid, double precision, double precision);
drop function if exists automation_bookings_to_accept(text);
drop function if exists booking_covered(text, double precision, double precision);
drop function if exists booking_auto_ok(cleaning_bookings);
drop function if exists booking_track(text);
drop function if exists book_cleaning_tracked(jsonb);
drop function if exists cleaner_reliability(cleaners);
drop index if exists cleaning_bookings_track_uq;
alter table cleaning_bookings drop column if exists auto_accepted, drop column if exists track_token;
alter table marketplace_settings drop column if exists auto_accept_bookings;
-- Les fonctions redéfinies (demandes ouvertes, aperçu) reviennent à leur version en rejouant 0048.

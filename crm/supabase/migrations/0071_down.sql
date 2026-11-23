-- Retour arrière de 0071. booking_track et cleaner_reliability reviennent à leur version en rejouant 0069.
drop function if exists booking_rate(text, int, text);
drop function if exists automation_set_booking_payment(text, uuid, boolean, text, text);
drop function if exists automation_claim_booking_charges(text);
drop function if exists automation_set_booking_card(text, text, text, text);
alter table cleaning_bookings drop constraint if exists cleaning_bookings_rating_chk, drop constraint if exists cleaning_bookings_payment_status_chk;
alter table cleaning_bookings drop column if exists rated_at, drop column if exists rating_comment, drop column if exists rating, drop column if exists paid_at, drop column if exists charge_started_at,
  drop column if exists payment_error, drop column if exists payment_status, drop column if exists stripe_payment_intent, drop column if exists stripe_payment_method, drop column if exists stripe_customer;

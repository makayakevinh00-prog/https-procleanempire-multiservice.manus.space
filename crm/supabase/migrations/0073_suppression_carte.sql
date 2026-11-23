-- 0073 — Suppression complète du paiement par carte à la réservation (décision du 23/11/2026 : prélèvement en fin de mois uniquement).
-- Retire le réglage, les fonctions et les colonnes ajoutés par 0071 et 0072. La note du client et le suivi restent. Rejouable.
drop function if exists booking_card_enabled();
drop function if exists automation_set_booking_payment(text, uuid, boolean, text, text);
drop function if exists automation_claim_booking_charges(text);
drop function if exists automation_set_booking_card(text, text, text, text);

-- Suivi sans état de paiement.
create or replace function booking_track(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  select jsonb_build_object('status', b.status, 'kind', b.kind, 'date', b.job_date, 'city', b.city, 'postal_code', b.postal_code, 'price_ht', b.price_ht,
           'window_start', coalesce(j.window_start, s.window_start), 'window_end', coalesce(j.window_end, s.window_end),
           'job_status', j.status, 'cleaner', case when j.cleaner_id is not null then split_part(trim(c.full_name), ' ', 1) end,
           'arrived_at', j.arrived_at, 'created_at', b.created_at, 'rating', b.rating) into r
    from cleaning_bookings b left join cleaning_jobs j on j.id = b.job_id left join cleaners c on c.id = j.cleaner_id
         left join lateral (select window_start, window_end from marketplace_settings limit 1) s on true
   where b.track_token = p_token;
  if r is null then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  return r;
end $$;

alter table cleaning_bookings drop constraint if exists cleaning_bookings_payment_status_chk;
alter table cleaning_bookings drop column if exists stripe_customer, drop column if exists stripe_payment_method, drop column if exists stripe_payment_intent,
  drop column if exists payment_status, drop column if exists payment_error, drop column if exists charge_started_at, drop column if exists paid_at;
alter table marketplace_settings drop column if exists card_payments;

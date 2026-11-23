-- 0072 — Le paiement par carte à la réservation devient un réglage, coupé par défaut.
-- Décision du 23/11/2026 : les clients sont prélevés en fin de mois (prélèvement SEPA), pas débités par carte après chaque ménage.
-- La note du client et le suivi restent actifs. Rejouable.
alter table marketplace_settings add column if not exists card_payments boolean not null default false;

create or replace function booking_card_enabled() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select card_payments from marketplace_settings limit 1), false)
$$;
revoke all on function booking_card_enabled() from public;
grant execute on function booking_card_enabled() to anon, authenticated;

-- 0070 — Paiement par carte et note du client, comme sur une application VTC.
-- À la réservation, le client enregistre sa carte (chez Stripe : aucun numéro de carte n'est stocké ici). Il n'est débité qu'une fois le ménage validé.
-- Après le ménage, il note le nettoyeur de 1 à 5. Sans Stripe configuré, rien ne change : paiement sur facture.
-- Rejouable.

alter table cleaning_bookings add column if not exists stripe_customer text;
alter table cleaning_bookings add column if not exists stripe_payment_method text;
alter table cleaning_bookings add column if not exists stripe_payment_intent text;
alter table cleaning_bookings add column if not exists payment_status text;
alter table cleaning_bookings add column if not exists payment_error text;
alter table cleaning_bookings add column if not exists charge_started_at timestamptz;
alter table cleaning_bookings add column if not exists paid_at timestamptz;
alter table cleaning_bookings add column if not exists rating smallint;
alter table cleaning_bookings add column if not exists rating_comment text;
alter table cleaning_bookings add column if not exists rated_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cleaning_bookings_payment_status_chk') then
    alter table cleaning_bookings add constraint cleaning_bookings_payment_status_chk check (payment_status is null or payment_status in ('carte', 'en_cours', 'payee', 'echec'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cleaning_bookings_rating_chk') then
    alter table cleaning_bookings add constraint cleaning_bookings_rating_chk check (rating is null or rating between 1 and 5);
  end if;
end $$;

-- Le serveur enregistre la carte choisie par le client (identifiants Stripe uniquement). Jamais sur une réservation déjà payée ou en cours de débit.
create or replace function automation_set_booking_card(p_secret text, p_token text, p_customer text, p_method text) returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform automation_guard(p_secret);
  if coalesce(p_customer, '') !~ '^cus_[A-Za-z0-9]+$' or coalesce(p_method, '') !~ '^pm_[A-Za-z0-9]+$' then raise exception 'ARGUMENT: carte invalide'; end if;
  update cleaning_bookings set stripe_customer = p_customer, stripe_payment_method = p_method, payment_status = 'carte', payment_error = null
   where track_token = p_token and status <> 'refusee' and (payment_status is null or payment_status in ('carte', 'echec'));
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Réservations à débiter : carte enregistrée et ménage validé. Chaque réservation n'est rendue qu'une fois (elle passe « en cours »).
create or replace function automation_claim_booking_charges(p_secret text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform automation_guard(p_secret);
  with due as (
    select b.id from cleaning_bookings b join cleaning_jobs j on j.id = b.job_id
     where b.payment_status = 'carte' and b.status = 'acceptee' and j.status = 'validee' and b.price_ht > 0
     order by b.created_at limit 20 for update of b skip locked),
  upd as (
    update cleaning_bookings b set payment_status = 'en_cours', charge_started_at = now() from due where b.id = due.id
    returning b.id, b.name, b.email, b.kind, b.city, b.job_date, b.price_ht, b.stripe_customer, b.stripe_payment_method, b.track_token)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'email', email, 'kind', kind, 'city', city, 'date', job_date, 'price_ht', price_ht,
           'customer', stripe_customer, 'method', stripe_payment_method, 'track_token', track_token)), '[]'::jsonb) into r from upd;
  return r;
end $$;

-- Résultat du débit. Un échec garde la carte : le patron peut relancer ou facturer.
create or replace function automation_set_booking_payment(p_secret text, p_id uuid, p_ok boolean, p_intent text, p_error text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform automation_guard(p_secret);
  update cleaning_bookings set payment_status = case when p_ok then 'payee' else 'echec' end, stripe_payment_intent = coalesce(left(p_intent, 100), stripe_payment_intent),
         payment_error = case when p_ok then null else left(coalesce(p_error, 'Paiement refusé'), 300) end, paid_at = case when p_ok then now() else paid_at end
   where id = p_id and payment_status = 'en_cours';
end $$;

-- Le client note son ménage : une seule fois, uniquement quand le ménage est terminé et validé.
create or replace function booking_rate(p_token text, p_rating int, p_comment text) returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'ARGUMENT: la note va de 1 à 5'; end if;
  update cleaning_bookings b set rating = p_rating, rating_comment = left(nullif(trim(coalesce(p_comment, '')), ''), 600), rated_at = now()
    from cleaning_jobs j where j.id = b.job_id and j.status = 'validee' and b.track_token = p_token and b.rating is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'ARGUMENT: ce ménage ne peut pas (ou plus) être noté'; end if;
end $$;

-- Suivi : on ajoute l'état du paiement et la note (toujours rien de privé).
create or replace function booking_track(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{64}$' then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  select jsonb_build_object('status', b.status, 'kind', b.kind, 'date', b.job_date, 'city', b.city, 'postal_code', b.postal_code, 'price_ht', b.price_ht,
           'window_start', coalesce(j.window_start, s.window_start), 'window_end', coalesce(j.window_end, s.window_end),
           'job_status', j.status, 'cleaner', case when j.cleaner_id is not null then split_part(trim(c.full_name), ' ', 1) end,
           'arrived_at', j.arrived_at, 'created_at', b.created_at,
           'payment_status', b.payment_status, 'rating', b.rating) into r
    from cleaning_bookings b left join cleaning_jobs j on j.id = b.job_id left join cleaners c on c.id = j.cleaner_id
         left join lateral (select window_start, window_end from marketplace_settings limit 1) s on true
   where b.track_token = p_token;
  if r is null then raise exception 'INTROUVABLE: lien de suivi invalide'; end if;
  return r;
end $$;

-- Fiabilité du nettoyeur : on ajoute la note moyenne donnée par les clients.
create or replace function cleaner_reliability(c cleaners) returns jsonb language sql stable as $$
  with n as (
    select (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.status = 'validee' and j.review_note is null)::int as clean,
           (select count(*) from cleaning_jobs j where j.cleaner_id = c.id and j.review_note is not null)::int as redo,
           (select count(*) from cleaning_noshows s where s.cleaner_id = c.id)::int as missed,
           (select round(avg(b.rating), 1) from cleaning_bookings b join cleaning_jobs j on j.id = b.job_id where j.cleaner_id = c.id and b.rating is not null) as stars,
           (select count(*) from cleaning_bookings b join cleaning_jobs j on j.id = b.job_id where j.cleaner_id = c.id and b.rating is not null)::int as ratings)
  select jsonb_build_object('clean', clean, 'redo', redo, 'missed', missed, 'stars', stars, 'ratings', ratings,
                            'score', case when clean + redo + missed >= 3 then round(100.0 * clean / (clean + redo + missed))::int end) from n
$$;

do $$ declare f text; begin
  foreach f in array array['automation_set_booking_card(text, text, text, text)', 'automation_claim_booking_charges(text)', 'automation_set_booking_payment(text, uuid, boolean, text, text)', 'booking_rate(text, int, text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

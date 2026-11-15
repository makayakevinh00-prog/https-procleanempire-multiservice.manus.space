-- Retour arrière de 0062.
drop table if exists listing_improvements;
drop table if exists listing_reviews;
drop table if exists listing_market;
drop table if exists listing_prices;
do $$ begin
  if to_regclass('public.concierge_listings') is not null then
    execute 'alter table concierge_listings drop column if exists public_url';
    execute 'alter table concierge_listings drop column if exists base_price';
  end if;
end $$;

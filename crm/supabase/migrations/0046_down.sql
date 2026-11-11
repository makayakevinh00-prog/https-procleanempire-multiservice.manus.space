drop function if exists book_cleaning(jsonb);
drop function if exists booking_prices();
drop table if exists cleaning_bookings;
alter table marketplace_settings drop column if exists price_maison, drop column if exists price_t3, drop column if exists price_t2, drop column if exists price_studio;

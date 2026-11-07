-- Retour arrière de 0023 : supprime uniquement l'abonnement calendrier.
drop function if exists calendar_feed_events(text);
drop table if exists calendar_feed;

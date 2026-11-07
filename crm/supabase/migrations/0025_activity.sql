-- 0025 — Famille d'activité : trier les prestations pour savoir ce qui rapporte.
-- Compatible : uniquement des ajouts (colonnes facultatives). Aucune donnée existante n'est modifiée :
-- tant qu'une famille n'est pas enregistrée, elle est DÉDUITE à l'affichage (contrat du client, mots-clés) et le patron peut la corriger.
-- Familles : nettoyage_airbnb · nettoyage_pro (bureaux & commerces) · gestion_locative (Airbnb, Abritel, Booking) · ponctuel.

alter table contracts     add column if not exists activity text check (activity in ('nettoyage_airbnb','nettoyage_pro','gestion_locative','ponctuel'));
alter table interventions add column if not exists activity text check (activity in ('nettoyage_airbnb','nettoyage_pro','gestion_locative','ponctuel'));
alter table invoices      add column if not exists activity text check (activity in ('nettoyage_airbnb','nettoyage_pro','gestion_locative','ponctuel'));
alter table quotes        add column if not exists activity text check (activity in ('nettoyage_airbnb','nettoyage_pro','gestion_locative','ponctuel'));

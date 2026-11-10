-- 0037 — Catalogue : rangé par type de prestation, avec coût de revient, marge cible, saison et clients à qui proposer.
-- Additif (colonnes en plus) + nettoyage des noms : le catalogue est générique, jamais un nom de client, une adresse ou une ville.
alter table services add column if not exists category text;
alter table services add column if not exists duration_hours numeric(6, 2);
alter table services add column if not exists duration_estimated boolean not null default false;
alter table services add column if not exists materials_cost_ht numeric(12, 2) not null default 0;
alter table services add column if not exists target_margin_pct numeric(5, 2);
alter table services add column if not exists season_months int[];
alter table services add column if not exists complements text[];
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'services_category_check') then
    alter table services add constraint services_category_check check (category is null or category in ('bureaux', 'logements', 'commerces', 'vehicules', 'specialites', 'options'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'services_duration_check') then
    alter table services add constraint services_duration_check check (duration_hours is null or duration_hours >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'services_target_margin_check') then
    alter table services add constraint services_target_margin_check check (target_margin_pct is null or (target_margin_pct >= 0 and target_margin_pct < 100));
  end if;
end $$;
alter table app_settings add column if not exists default_target_margin_pct numeric(5, 2) not null default 40 check (default_target_margin_pct >= 0 and default_target_margin_pct < 100);

-- Rangement par type de prestation (par code ; sans effet si le code n'existe pas).
update services set category = 'bureaux' where code in ('BUR-HEBDO', 'BUR-HEURE');
update services set category = 'logements' where code in ('AIR-PAR-STU', 'AIR-PAR-T2', 'AIR-PAR-T3', 'AIR-PAR-T4', 'AIR-XL-ESS', 'AIR-STU-ESS', 'AIR-T2-ESS', 'AIR-T3-ESS', 'AIR-T4-ESS', 'AIR-REM', 'ENT-COLOC-HEBDO', 'ENT-COLOC-2HEBDO', 'ENT-COLOC-COMMUNS', 'REM-CHAMBRE', 'REM-SEJOUR', 'REM-COMP');
update services set category = 'options' where code in ('AIR-OPT-URG', 'AIR-OPT-NUIT', 'LIN-JEU', 'LIN-SET');
update services set category = 'vehicules' where code in ('DET-COMP', 'DET-EXT', 'DET-INT');
update services set category = 'specialites' where code in ('PIG-FIL', 'PIG-FILET-BAL', 'PIG-FILET-GD', 'PIG-PICS', 'DEC-SOL', 'DEC-FORF', 'DEC-MURS', 'DEC-FIENTES', 'DEC-BALCON-5');

-- Noms génériques : plus de client, d'adresse ni de ville dans le catalogue.
update services set name = 'Entretien de bureaux et locaux — 1 passage par semaine (à partir de)' where code = 'BUR-HEBDO';
update services set name = 'Nettoyage de bureaux — heure ponctuelle' where code = 'BUR-HEURE';
update services set name = 'Entretien des parties communes (colocation) — 2 passages / semaine' where code = 'ENT-COLOC-2HEBDO';
update services set name = 'Entretien des parties communes (colocation) — 1 passage / semaine' where code = 'ENT-COLOC-HEBDO';
update services set name = 'Nettoyage mensuel des parties communes (colocation)' where code = 'ENT-COLOC-COMMUNS';
update services set name = 'Forfait ménage par séjour (tarif de contrat conciergerie)', active = false where code = 'CTR-ELY-MEN';
update services set name = 'Gestion conciergerie — commission sur revenus (interne, hors catalogue)', active = false where code = 'CTR-ELY-GEST';
update services set name = 'Ménage fin de séjour < 55 m² (tarif de contrat conciergerie)', active = false where code = 'CTR-CONCIERGAIR';
update services set name = 'Ménage maison (tarif de contrat)', active = false where code = 'CTR-GEETHA';
update services set category = 'logements' where code in ('CTR-ELY-MEN', 'CTR-CONCIERGAIR', 'CTR-GEETHA');

-- Temps : seulement ceux qu'on peut poser sans deviner. « Estimé » = valeur de départ à corriger ; l'heure ponctuelle dure une heure par définition.
update services set duration_hours = 1, duration_estimated = false where code = 'BUR-HEURE';
update services set duration_hours = v.h, duration_estimated = true from (values
  ('AIR-STU-ESS', 1.5), ('AIR-T2-ESS', 2.0), ('AIR-T3-ESS', 2.5), ('AIR-T4-ESS', 3.0), ('AIR-XL-ESS', 4.0),
  ('AIR-PAR-STU', 1.5), ('AIR-PAR-T2', 2.0), ('AIR-PAR-T3', 2.5), ('AIR-PAR-T4', 3.0),
  ('REM-CHAMBRE', 2.0), ('DET-INT', 2.0), ('DET-EXT', 1.5), ('DET-COMP', 3.5), ('LIN-JEU', 0.3)
) as v(code, h) where services.code = v.code;

-- À qui proposer quoi (activités des contrats : nettoyage_airbnb, nettoyage_pro, gestion_locative).
update services set complements = array['nettoyage_airbnb', 'gestion_locative'] where code in ('LIN-JEU', 'LIN-SET');

-- Idées à chiffrer : masquées tant qu'elles n'ont ni prix ni temps (le prix conseillé se calcule ensuite).
insert into services (code, name, description, unit, unit_price_ht, vat_rate, active, category, season_months, complements) values
  ('NOEL-DECO', 'Décoration de Noël — pose et dépose', 'À chiffrer : renseignez le temps, le coût du matériel, puis appliquez le prix conseillé.', 'forfait', 0, 20, false, 'options', array[10, 11, 12], array['nettoyage_pro', 'nettoyage_airbnb']),
  ('OPT-POUBELLES', 'Sortie et rentrée des poubelles', 'À chiffrer : renseignez le temps par passage et les frais, pour ne jamais l''accepter à perte.', 'passage', 0, 20, false, 'options', null, array['nettoyage_pro', 'gestion_locative']),
  ('OPT-VITRES', 'Nettoyage des vitres', 'À chiffrer : renseignez le temps et le matériel.', 'intervention', 0, 20, false, 'bureaux', array[3, 4, 5, 9], array['nettoyage_pro'])
on conflict (code) do nothing;

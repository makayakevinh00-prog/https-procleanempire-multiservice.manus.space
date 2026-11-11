-- 0043 — Veille : chiffres du secteur de la propreté (avec leur source), coût et lien d'inscription des certifications.
-- Additif. Les chiffres du secteur viennent de sources publiques citées ; ils se mettent à jour (par l'assistant ou à la main), jamais inventés.
create table if not exists sector_facts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('france', 'monde', 'acteurs')),
  label text not null unique,
  value text not null,
  note text,
  source_name text not null,
  source_url text,
  as_of text,
  sort int not null default 100,
  updated_at timestamptz not null default now()
);
alter table sector_facts enable row level security;
drop policy if exists sector_facts_owner on sector_facts;
create policy sector_facts_owner on sector_facts for all to authenticated using (is_owner()) with check (is_owner());
do $$ begin
  if to_regprocedure('team_can(text,text)') is not null then
    drop policy if exists sector_facts_team_read on sector_facts;
    create policy sector_facts_team_read on sector_facts for select to authenticated using (team_can('veille', 'read'));
    drop policy if exists sector_facts_team_ins on sector_facts;
    create policy sector_facts_team_ins on sector_facts for insert to authenticated with check (team_can('veille', 'write'));
    drop policy if exists sector_facts_team_upd on sector_facts;
    create policy sector_facts_team_upd on sector_facts for update to authenticated using (team_can('veille', 'write')) with check (team_can('veille', 'write'));
    drop policy if exists sector_facts_team_del on sector_facts;
    create policy sector_facts_team_del on sector_facts for delete to authenticated using (team_can('veille', 'write'));
  end if;
end $$;

alter table certifications add column if not exists cost_eur numeric(10, 2) check (cost_eur is null or cost_eur >= 0);
alter table certifications add column if not exists enroll_url text;

insert into sector_facts (scope, label, value, note, source_name, source_url, as_of, sort) values
  ('france', 'Chiffre d''affaires du secteur de la propreté en France', '22 milliards d''euros', null, 'Le Monde de la Propreté — chiffres clés nationaux (FEP)', 'https://www.monde-proprete.com/chiffres-cles-proprete', 'édition 2026', 10),
  ('france', 'Entreprises de propreté (au moins 1 salarié)', 'Plus de 15 000', 'Selon la FEP et l''Insee : 15 954 entreprises, soit +3,4 % par rapport à 2019.', 'Le Monde de la Propreté ; FEP via Republik Group', 'https://www.monde-proprete.com/chiffres-cles-proprete', 'édition 2026', 20),
  ('france', 'Emplois dans le secteur', 'Plus de 600 000', 'Plus de 95 000 postes créés en 10 ans.', 'Le Monde de la Propreté — chiffres clés nationaux (FEP)', 'https://www.monde-proprete.com/chiffres-cles-proprete', 'édition 2026', 30),
  ('france', 'Qui fait le secteur', '92 % des entreprises ont moins de 50 salariés ; les groupes de plus de 250 salariés emploient 55 % des salariés', 'Un tissu de PME : une entreprise comme la vôtre est la norme, mais quelques grands groupes concentrent l''emploi.', 'FEP, d''après l''Insee, via Republik Group', 'https://www.republikgroup.com/articles/ca459db8-f312-f111-a69a-000d3a39bd37/proprete-et-hygiene-un-secteur-dynamique-ou-des-chantiers-restent-a-mener', 'dernières données FEP', 40),
  ('france', 'Poids des bureaux et sites tertiaires', 'Plus d''un tiers du chiffre d''affaires du secteur', 'Interventions surtout en horaires décalés : la journée est un argument commercial.', 'FEP, via Republik Group', 'https://www.republikgroup.com/articles/ca459db8-f312-f111-a69a-000d3a39bd37/proprete-et-hygiene-un-secteur-dynamique-ou-des-chantiers-restent-a-mener', 'dernières données FEP', 50),
  ('monde', 'Marché mondial des services de nettoyage', 'Environ 442 milliards de dollars en 2025, 770,8 milliards attendus en 2033 (+7,3 % par an)', 'Les estimations varient fortement selon ce qui est compté : Fortune Business Insights donne 451,6 Md$ ; Expert Market Research 79 Md$ pour une définition plus étroite.', 'Grand View Research', 'https://www.grandviewresearch.com/industry-analysis/cleaning-services-market-report', '2025', 10),
  ('acteurs', 'Plus grande entreprise de propreté en France', 'Onet : environ 1,7 milliard d''euros de chiffre d''affaires', 'Leader du secteur en France depuis des années.', 'Oxynet — top 10 des entreprises de nettoyage', 'https://www.oxynet.fr/top-10-des-entreprises-de-nettoyage', 'année non précisée par la source', 10),
  ('acteurs', 'Les grands groupes français suivants', 'Atalian : 1 055 M€ ; Samsic : 986 M€ ; GSF : plus d''1 milliard d''euros', 'Atalian et Samsic d''après le classement 2025 publié par Samsic ; GSF d''après le classement de Bâtiment-Entretien (2021). Les périmètres de chiffre d''affaires peuvent différer d''une source à l''autre.', 'Samsic — classement 2025 ; Bâtiment-Entretien', 'https://www.samsic.fr/services/proprete/classement-2025-top-10-entreprise-nettoyage-france/', '2021 à 2025', 20),
  ('acteurs', 'Plus grands groupes mondiaux de services (nettoyage compris)', 'Sodexo : environ 26,5 Md$ ; ISS : environ 12,1 Md$', 'Services intégrés (restauration, facility management) : ce n''est pas du nettoyage seul.', 'Expert Market Research', 'https://www.expertmarketresearch.com/blogs/top-cleaning-services-companies', '2025', 30)
on conflict (label) do nothing;

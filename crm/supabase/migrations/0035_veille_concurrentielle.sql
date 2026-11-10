-- 0035 — Veille concurrentielle : concurrents suivis, journal de veille, certifications / formations à obtenir (et ce qu'en ont les concurrents).
-- Additif. Accès réservé au patron (et à l'assistant via le connecteur, qui passe par agent_admin_api).
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  siren text check (siren is null or siren ~ '^\d{9}$'),
  website text, city text, postal_code text, naf_code text,
  headcount text, revenue_eur numeric(14,2), revenue_year int, creation_date date,
  services text, positioning text, strengths text, weaknesses text, prices text,
  status text not null default 'surveille' check (status in ('surveille', 'archive')),
  source text not null default 'manuel' check (source in ('manuel', 'annuaire')),
  last_reviewed_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists competitors_name_uq on competitors (lower(name));
create unique index if not exists competitors_siren_uq on competitors (siren) where siren is not null;

create table if not exists certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'certification' check (kind in ('norme', 'certification', 'qualification', 'label', 'formation')),
  description text, benefit text, cost_note text, duration_note text, provider text, source_url text, notes text,
  status text not null default 'a_envisager' check (status in ('a_envisager', 'en_cours', 'obtenu', 'ecarte')),
  priority text not null default 'normale' check (priority in ('basse', 'normale', 'haute')),
  target_date date, obtained_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists certifications_name_uq on certifications (lower(name));

create table if not exists competitor_certifications (
  competitor_id uuid not null references competitors(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete cascade,
  noted_on date not null default current_date, source_url text,
  primary key (competitor_id, certification_id)
);

create table if not exists watch_items (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references competitors(id) on delete set null,
  kind text not null default 'autre' check (kind in ('prix', 'offre', 'certification', 'recrutement', 'communication', 'avis', 'appel_offres', 'autre')),
  title text not null, detail text, source_url text,
  observed_on date not null default current_date,
  impact text not null default 'moyen' check (impact in ('faible', 'moyen', 'fort')),
  action text, done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists watch_items_idx on watch_items (observed_on desc);

do $$ declare t text; begin
  foreach t in array array['competitors', 'certifications', 'competitor_certifications', 'watch_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- Référentiel de départ : uniquement des éléments vérifiés (sources indiquées). Coûts et durées volontairement non renseignés : à chiffrer sur devis des organismes.
insert into certifications (name, kind, description, benefit, cost_note, duration_note, provider, source_url, priority) values
  ('Qualipropre', 'qualification', 'Qualification des entreprises de propreté, d''hygiène et de services associés, délivrée par un organisme indépendant reconnu depuis 1996 (33 qualifications, validité 4 ans).', 'Reconnaissance du savoir-faire auprès des acheteurs : les donneurs d''ordre peuvent chercher une entreprise qualifiée par SIREN, zone ou spécialité.', 'À chiffrer (demander à Qualipropre)', 'À préciser (validité de la qualification : 4 ans)', 'Qualipropre', 'http://qualipropre.org/', 'haute'),
  ('Certipropre', 'certification', 'Certification qui prolonge Qualipropre en ajoutant de nouveaux critères d''exigence, pour renforcer la confiance des acheteurs.', 'Niveau d''exigence supérieur à la qualification : argument pour les appels d''offres et les grands comptes.', 'À chiffrer (demander à Certipropre)', 'À préciser', 'Certipropre / Qualipropre', 'https://certipropre.com/', 'normale'),
  ('ISO 9001', 'norme', 'Management de la qualité : atteste que l''entreprise a un système structuré de maîtrise de ses processus (elle ne certifie pas un niveau de propreté en soi).', 'Souvent demandée dans les appels d''offres ; structure les contrôles qualité, les réclamations et l''amélioration continue.', 'À chiffrer (devis d''organismes certificateurs)', 'À préciser', 'Organisme certificateur accrédité', 'https://groupe-france-clean.fr/expertise/certification-iso-9001-pour-entreprises-de-nettoyage-guide-complet/', 'normale'),
  ('ISO 14001', 'norme', 'Management environnemental.', 'Preuve d''engagement environnemental (produits, consommations, déchets) demandée par certains donneurs d''ordre.', 'À chiffrer (devis d''organismes certificateurs)', 'À préciser', 'Organisme certificateur accrédité', 'https://propulsebyca.fr/idees-business/entreprise-nettoyage/reglementation-entreprise-nettoyage', 'basse'),
  ('ISO 45001', 'norme', 'Management de la santé et de la sécurité au travail.', 'Utile pour rassurer sur la sécurité des équipes ; à vérifier selon les clients visés.', 'À chiffrer', 'À préciser', 'Organisme certificateur accrédité', null, 'basse'),
  ('CQP Agent d''entretien et de rénovation en propreté', 'formation', 'Certificat de qualification professionnelle de la branche propreté : l''agent intervient chez le client, le plus souvent en équipe volante.', 'Formation reconnue pour monter en compétence les agents et valoriser l''équipe auprès des clients.', 'À chiffrer (financement possible par la formation professionnelle, à vérifier)', 'À préciser (organisme de formation)', 'Organisme de formation de la branche', 'http://www.intercariforef.org/outils/recherche-certifinfo/certifications/57704', 'haute'),
  ('EcoVadis', 'label', 'Évaluation de la performance RSE (environnement, social, éthique, achats responsables) souvent demandée par les grands donneurs d''ordre.', 'Ouvre des marchés auprès de grandes entreprises qui évaluent leurs fournisseurs.', 'À chiffrer', 'À préciser', 'EcoVadis', 'https://groupe-essi.com/responsabilite-societale-des-entreprises-certifications/', 'basse')
on conflict (lower(name)) do nothing;

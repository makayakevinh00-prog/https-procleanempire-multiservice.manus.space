-- Fournisseurs : entreprises et auto-entrepreneurs (dont les agents), avec prix et paiements.
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'autre' check (category in ('linge','sous_traitance','produits','materiel','autre')),
  kind text not null default 'entreprise' check (kind in ('entreprise','auto_entrepreneur')),
  status text not null default 'actif' check (status in ('actif','a_etudier','inactif')),
  contact_name text, email text, phone text, siret text, website text, address text,
  prices jsonb not null default '[]'::jsonb,       -- [{label, price_ht, unit, note}]
  payment_terms text, notes text,
  staff_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  paid_on date not null, amount numeric(12,2) not null, label text,
  source text not null default 'manuel' check (source in ('manuel','qonto')),
  qonto_id text unique, created_at timestamptz not null default now()
);
create index if not exists supplier_payments_idx on supplier_payments (supplier_id, paid_on desc);
do $$ declare t text; begin
  foreach t in array array['suppliers','supplier_payments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

-- Premiers fournisseurs (e-mails d'octobre 2026 + paiements Qonto)
insert into suppliers(name, category, kind, status, contact_name, email, phone, website, prices, payment_terms, notes, staff_id)
select * from (values
 ('Esma Nouali', 'sous_traitance', 'auto_entrepreneur', 'actif', 'Esma Nouali', 'esmanouali@icloud.com', null, null,
  '[{"label":"Ménage Airbnb Goussainville (fin de séjour)","price_ht":50,"unit":"par ménage","note":"Rémunération annoncée dans les plannings"},{"label":"Ménage + livraison des draps + photos (Paris 16e, Grande Armée)","price_ht":100,"unit":"par mission","note":"Rémunération annoncée dans le planning"}]'::jsonb,
  'Virement', 'Agent de ménage, auto-entrepreneuse. Missions envoyées par e-mail ; à terme via l''application Équipe.', (select id from staff where full_name = 'Esma Nouali' limit 1)),
 ('Laundryheap Linen', 'linge', 'entreprise', 'a_etudier', 'Yannick Mbengue (Directeur France)', 'yannick@laundryheap.com', '+33 6 64 62 85 82', 'https://www.laundryheap.com',
  '[{"label":"Kit de linge complet — 1er kit livré dans un appartement","price_ht":20,"unit":"par livraison","note":"1 drap, 1 housse de couette, 2 taies, 1 grande serviette, 1 petite serviette. Location, nettoyage et rotation inclus."},{"label":"Kit de linge complet — à partir du 2e kit dans le même appartement","price_ht":18,"unit":"par kit","note":""}]'::jsonb,
  null, 'Offre reçue le 20/10/2026. Pas de minimum de commande. Livraison 7 j/7 avec 24 h de préavis, stock tampon possible, entretien de votre propre linge possible.', null),
 ('Atelier du Linge', 'linge', 'entreprise', 'a_etudier', 'Mme Nobre', 'contact@atelierdulinge.com', null, null,
  '[]'::jsonb, null, 'Grille tarifaire reçue (formule location avec mois d''essai) : prix à saisir ici. Le 19/10/2026 vous avez demandé le prix du drap housse, les frais de collecte/livraison (Paris 16e/20e, Saint-Ouen, Val-d''Oise), le coût d''un kit complet, la date de 1re livraison et les conditions de l''essai (dépôt, quantité minimale).', null),
 ('ELIS', 'linge', 'entreprise', 'a_etudier', null, null, null, null,
  '[]'::jsonb, null, 'Demande de devis le 16/10/2026 (location et entretien de linge, Île-de-France). Un expert devait vous rappeler ; relancé le 19/10/2026 : pas de contact à cette date.', null),
 ('LAV MATIC (laverie)', 'linge', 'entreprise', 'actif', null, null, null, null,
  '[{"label":"Lavage en laverie libre-service","price_ht":null,"unit":"2 à 3 € par cycle","note":"Paiements par carte"}]'::jsonb,
  'Carte', 'Lavage du linge en laverie (paiements Qonto du 29-30 octobre 2026). Montants TTC.', null)
) as v(name, category, kind, status, contact_name, email, phone, website, prices, payment_terms, notes, staff_id)
where not exists (select 1 from suppliers where suppliers.name = v.name);

insert into supplier_payments(supplier_id, paid_on, amount, label, source, qonto_id)
select s.id, v.paid_on::date, v.amount, v.label, 'qonto', v.qid
from (values
('esma','01a1a162-f443-7edf-b74f-082c6712bc19','2026-11-03',800,'Esma Nouali'),
('esma','01a18c60-8606-71ae-a63d-8d730ded1551','2026-10-30',17,'ESMA NOUALI'),
('lav','01a18623-a281-78ef-a502-9c83ce7c8f8a','2026-10-30',2,'LAV MATIC'),
('lav','01a181a5-0532-7e2e-9cc5-6869993ad172','2026-10-29',3,'LAV MATIC'),
('lav','01a181a7-211c-7443-9ac2-05fec6089286','2026-10-29',3,'LAV MATIC'),
('lav','01a181db-8d7e-7e85-9720-b7bb99fc5021','2026-10-29',3,'LAV MATIC'),
('lav','01a181f5-c0e0-714c-b40c-0b6b31e3a620','2026-10-29',3,'LAV MATIC'),
('lav','01a181f6-8627-7b29-8ef7-1ca89ce76db7','2026-10-29',3,'LAV MATIC'),
('lav','01a183a7-7fc0-72e2-88be-62ba9e7a3418','2026-10-29',3,'LAV MATIC'),
('lav','01a183a8-11e5-7fa8-a1ae-59ffd9398268','2026-10-29',3,'LAV MATIC'),
('lav','01a183a8-98f3-7839-b63b-c3c64fa78a2b','2026-10-29',3,'LAV MATIC'),
('lav','01a183a9-28b4-77d9-83a0-075f489435a0','2026-10-29',3,'LAV MATIC'),
('lav','01a181bc-fb24-75f9-9fcc-10b05a8d4ee5','2026-10-29',2,'LAV MATIC'),
('lav','01a181bf-fd84-7da4-b3ba-3983df51a486','2026-10-29',2,'LAV MATIC'),
('lav','01a182c5-76fd-7f20-b868-f5f74c0bafff','2026-10-29',2,'LAV MATIC'),
('lav','01a182c6-1aed-705e-b523-ab2460f51bdc','2026-10-29',2,'LAV MATIC'),
('lav','01a182c6-af13-74d5-bb2b-b539098459c8','2026-10-29',2,'LAV MATIC'),
('lav','01a1841d-4db8-7539-a243-fb4f76b0fe84','2026-10-29',2,'LAV MATIC'),
('lav','01a1841e-70f5-7fb1-a885-eccb98edaef3','2026-10-29',2,'LAV MATIC'),
('lav','01a1841f-0af0-7544-9f41-3a86bda76401','2026-10-29',2,'LAV MATIC')
) as v(who, qid, paid_on, amount, label)
join suppliers s on s.name = case v.who when 'esma' then 'Esma Nouali' else 'LAV MATIC (laverie)' end
on conflict (qonto_id) do nothing;

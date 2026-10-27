-- Données initiales ProClean Empire (idempotent : relançable sans doublons).
-- Les valeurs inconnues restent NULL (à compléter dans le CRM) — rien n'est inventé.

-- ── Clients ──
insert into clients (name, kind, status, address, postal_code, city, is_reserved, reserved_reason, notes) values
 ('SARB OPTIQUE', 'entreprise', 'actif', null, null, 'Roissy-en-France', false, null, null),
 ('ILE DE FRANCE RECYCLAGE', 'entreprise', 'actif', null, null, 'Herblay-sur-Seine', false, null, null),
 ('SEA SOCIÉTÉ D''EXPLOITATION AUTOMOBILE', 'entreprise', 'actif', null, null, 'Herblay-sur-Seine', false, null, null),
 ('SWYFO', 'entreprise', 'actif', null, null, 'Cergy', false, null, null),
 ('TK', 'entreprise', 'actif', null, null, null, false, null, 'Localisation à préciser.'),
 ('Ramanujam GEETHA', 'particulier', 'actif', null, null, 'Goussainville', false, null, null),
 ('Ahmed El Youssfi', 'particulier', 'actif', null, '75016', 'Paris 16e', true,
    'Traitement patron uniquement — aucune action automatique.',
    'Rémunération : 9 % des revenus + 155 € TTC par séjour.'),
 ('RNB OPTIQUE', 'entreprise', 'actif', null, null, null, true,
    'Traitement patron uniquement — aucune action automatique.', null),
 ('Floriane', 'particulier', 'actif', null, null, null, false, null, 'Nom de famille et adresse à compléter.')
on conflict (lower(name)) do nothing;

-- ── Contrats récurrents (heures par intervention : à renseigner) ──
insert into contracts (client_id, label, billing_mode, monthly_amount_ht, per_visit_amount_ht, terms, start_date, end_date, status, visits_per_week, notes)
select c.id, v.label, v.mode, v.monthly, v.per_visit, v.terms, v.start_date::date, v.end_date::date, v.status, v.visits, v.notes
from (values
  ('SARB OPTIQUE',                           'Entretien SARB OPTIQUE',             'mensuel', 470.00, null::numeric, null, '2026-10-01', '2027-07-31', 'actif', null::numeric, null),
  ('ILE DE FRANCE RECYCLAGE',                'Entretien IDF Recyclage',            'mensuel', 300.00, null, null, '2026-08-01', '2027-07-31', 'actif', null, null),
  ('SEA SOCIÉTÉ D''EXPLOITATION AUTOMOBILE', 'Entretien SEA',                      'mensuel', 600.00, null, null, '2026-08-01', '2027-07-31', 'actif', null, null),
  ('SWYFO',                                  'Passages SWYFO (2×/sem)',            'passage', null, 120.00, null, null, null, 'actif', 2, null),
  ('TK',                                     'Passages TK (1×/sem)',               'passage', null, null, null, null, null, 'actif', 1, 'Montant et site à préciser.'),
  ('Ramanujam GEETHA',                       'Passages Goussainville (1×/sem)',    'passage', null, 60.00, null, null, null, 'actif', 1, null),
  ('Ahmed El Youssfi',                       'Gestion séjours Paris 16e',          'autre',   null, null, '9 % des revenus + 155 € TTC par séjour', null, null, 'actif', null, 'Contact réservé — traitement patron uniquement.')
) as v(client, label, mode, monthly, per_visit, terms, start_date, end_date, status, visits, notes)
join clients c on lower(c.name) = lower(v.client)
where not exists (select 1 from contracts k where k.client_id = c.id and k.label = v.label);

-- ── Devis acceptés en attente de facturation ──
insert into quotes (number, client_id, status, subject, accepted_at, notes)
select v.number, c.id, 'accepte', v.subject, now(), v.notes
from (values
  ('DEV-107', 'Floriane',         'Décontamination balcon',      'Intervention estimée 2h30–3h.'),
  ('DEV-108', 'Ahmed El Youssfi', 'Prestation Paris 16e',        'CONTACT RÉSERVÉ — traitement patron uniquement.'),
  ('DEV-109', 'Floriane',         'Pose filet anti-pigeons',     'Facture à refaire.'),
  ('DEV-110', 'SWYFO',            'Nettoyage chambre colocation', null)
) as v(number, client, subject, notes)
join clients c on lower(c.name) = lower(v.client)
on conflict (number) do nothing;

insert into quote_lines (quote_id, position, description, quantity, unit_price_ht, vat_rate)
select q.id, 0, v.descr, 1, v.price, 20
from (values
  ('DEV-107', 'Décontamination balcon (2h30–3h)', 200.00),
  ('DEV-108', 'Prestation Paris 16e',             129.17),
  ('DEV-109', 'Pose de filet anti-pigeons',       375.00),
  ('DEV-110', 'Nettoyage chambre en colocation',  120.00)
) as v(number, descr, price)
join quotes q on q.number = v.number
where not exists (select 1 from quote_lines l where l.quote_id = q.id);

-- La prochaine numérotation de devis continue après DEV-110.
insert into counters(key, value) values ('DEV', 110)
on conflict (key) do update set value = greatest(counters.value, 110);

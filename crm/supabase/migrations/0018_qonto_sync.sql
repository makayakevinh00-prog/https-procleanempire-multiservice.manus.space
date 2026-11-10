-- Sync Qonto : lien entre les clients CRM et les clients Qonto
-- + référence Qonto sur chaque facture émise

alter table clients
  add column if not exists qonto_id text;

alter table invoices
  add column if not exists qonto_invoice_id   text,
  add column if not exists qonto_invoice_number text;

-- Mapping des clients existants vers leurs IDs Qonto
update clients set qonto_id = '01a17467-680e-74d5-b0ce-88f10f155425' where name = 'Ahmed El Youssfi';
update clients set qonto_id = '01a15545-2a1c-7061-be7f-5d3e0420b1bb' where name = 'CONCIERG AIR';
update clients set qonto_id = '01a15545-2c16-7170-ac54-e77a6b8ab202' where name = 'CONCIERGERIE EASY STAY';
update clients set qonto_id = '01a15545-3425-76db-a7b6-193992e8c0e7' where name = 'Geetha Ramanujam';
update clients set qonto_id = '01a15545-25f9-7033-b9a5-da3ba636fc43' where name = 'ILE DE FRANCE RECYCLAGE';
update clients set qonto_id = '01a15545-3a51-78fd-9aef-e9e9cedae692' where name = 'Keisha Orneme';
update clients set qonto_id = '01a15545-3606-7e45-b00c-e02698b9712f' where name = 'Nathalie Pinon';
update clients set qonto_id = '01a15545-2836-70a2-8d3d-75ac9280ce47' where name = 'SARB OPTIQUE';
update clients set qonto_id = '01a15545-20c9-709c-9b34-7cf2bae84e7e' where name = 'SEA EXPLOITATION AUTOMOBILE';
update clients set qonto_id = '01a15545-2ed0-7eb6-9a38-25f82b3c6ad8' where name = 'SWYFO';
update clients set qonto_id = '01a15545-317a-77a9-ab53-e4e326d08ff7' where name = 'TAWER IMMOBILIER';
update clients set qonto_id = '01a09e45-bccb-700c-8b88-7fa03f461577' where name = 'Tk carrelage';

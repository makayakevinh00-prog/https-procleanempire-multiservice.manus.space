-- 0006 — Sites, Équipe, Missions (12 étapes), anomalies/réclamations, journal des modifications.
-- Migration COMPATIBLE : aucune colonne supprimée, aucune donnée effacée.
-- `interventions.status` (planifie/realise/annule) reste la source de la facturation existante ;
-- la nouvelle colonne `stage` (12 étapes) est synchronisée dans les deux sens par trigger.
-- `interventions.assignee` (texte) reste renseigné à partir de `staff_id` pour l'ancien code.

-- ───────────────────────── Sites ─────────────────────────
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  address text,
  postal_code text,
  city text,
  access_notes text,          -- codes, clés, horaires d'accès (jamais exposé au client)
  contact_name text,
  contact_phone text,
  checklist jsonb not null default '[]'::jsonb,   -- ["Vider les poubelles", ...] copiée sur chaque mission
  status text not null default 'actif' check (status in ('actif','inactif')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sites_client_idx on sites (client_id);
drop trigger if exists sites_touch on sites;
create trigger sites_touch before update on sites for each row execute function touch_updated_at();

-- ───────────────────────── Équipe ─────────────────────────
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  role text not null default 'agent' check (role in ('agent','responsable')),
  zone text,                  -- secteur habituel (ville / département) pour les suggestions
  skills text[] not null default '{}',
  weekly_capacity_hours numeric(5,2) check (weekly_capacity_hours is null or weekly_capacity_hours >= 0),
  active boolean not null default true,
  notes text,
  user_id uuid unique,        -- compte de connexion de l'agent (étape mobile)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists staff_name_uq on staff (lower(full_name));
drop trigger if exists staff_touch on staff;
create trigger staff_touch before update on staff for each row execute function touch_updated_at();

-- ───────────────────────── Liens ─────────────────────────
alter table contracts add column if not exists site_id uuid references sites(id) on delete set null;
alter table contracts add column if not exists staff_id uuid references staff(id) on delete set null;
alter table interventions add column if not exists site_id uuid references sites(id) on delete set null;
alter table interventions add column if not exists staff_id uuid references staff(id) on delete set null;
alter table interventions add column if not exists checklist jsonb not null default '[]'::jsonb;  -- [{label, done}]
alter table interventions add column if not exists stage_changed_at timestamptz;
alter table interventions add column if not exists stage text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'interventions_stage_check') then
    alter table interventions add constraint interventions_stage_check check (stage in
      ('brouillon','planifiee','affectee','en_route','arrivee','en_cours','a_verifier','terminee','validee','facturable','facturee','annulee'));
  end if;
end $$;
create index if not exists interventions_staff_idx on interventions (staff_id, scheduled_date);
create index if not exists interventions_site_idx on interventions (site_id, scheduled_date);

-- ───────────────────────── Synchronisation étape ⇄ statut historique ─────────────────────────
create or replace function stage_to_status(p text) returns text language sql immutable as $$
  select case
    when p = 'annulee' then 'annule'
    when p in ('a_verifier','terminee','validee','facturable','facturee') then 'realise'
    else 'planifie' end
$$;

create or replace function interventions_stage_sync() returns trigger language plpgsql as $$
declare sname text;
begin
  -- Étape absente (ancien code, automatisations) : déduite du statut historique.
  if tg_op = 'INSERT' then
    if new.stage is null then
      new.stage := case new.status when 'annule' then 'annulee' when 'realise' then 'terminee'
                   else case when new.staff_id is not null or new.assignee is not null then 'affectee' else 'planifiee' end end;
    end if;
    new.status := stage_to_status(new.stage);
  elsif new.stage is distinct from old.stage then
    new.status := stage_to_status(new.stage);            -- l'étape a été changée : elle fait foi
  elsif new.status is distinct from old.status then        -- ancien code : on aligne l'étape
    new.stage := case new.status when 'annule' then 'annulee'
                 when 'realise' then case when old.stage in ('a_verifier','terminee','validee','facturable','facturee') then old.stage else 'terminee' end
                 else case when old.stage in ('brouillon','planifiee','affectee','en_route','arrivee','en_cours') then old.stage
                           when new.staff_id is not null or new.assignee is not null then 'affectee' else 'planifiee' end end;
  end if;

  -- Facturation : une mission rattachée à une facture est « facturée », et ne peut pas revenir en arrière.
  if new.invoice_id is not null then
    new.stage := 'facturee'; new.status := 'realise';
  elsif new.stage = 'facturee' then
    new.stage := 'facturable';
  end if;

  -- Intervenant : le texte historique suit la fiche équipe.
  if new.staff_id is not null then
    select full_name into sname from staff where id = new.staff_id;           -- toujours aligné sur la fiche
    new.assignee := sname;
    if new.stage in ('brouillon','planifiee') then new.stage := 'affectee'; end if;
  elsif new.staff_id is null and tg_op = 'UPDATE' and old.staff_id is not null and new.assignee is not distinct from old.assignee then
    new.assignee := null;
    if new.stage = 'affectee' then new.stage := 'planifiee'; end if;
  end if;

  -- Site et check-list : hérités du contrat / du site à la création.
  if tg_op = 'INSERT' then
    if new.site_id is null and new.contract_id is not null then
      select site_id into new.site_id from contracts where id = new.contract_id;
    end if;
    if new.staff_id is null and new.assignee is null and new.contract_id is not null then
      select staff_id into new.staff_id from contracts where id = new.contract_id;
      if new.staff_id is not null then
        select full_name into new.assignee from staff where id = new.staff_id;
        if new.stage = 'planifiee' then new.stage := 'affectee'; end if;
      end if;
    end if;
    if new.site_id is not null and new.checklist = '[]'::jsonb then
      select coalesce(jsonb_agg(jsonb_build_object('label', x, 'done', false)), '[]'::jsonb) into new.checklist
        from sites s, jsonb_array_elements_text(s.checklist) x where s.id = new.site_id;
    end if;
    if new.site_address is null and new.site_id is not null then
      select nullif(concat_ws(', ', address, nullif(concat_ws(' ', postal_code, city), '')), '') into new.site_address from sites where id = new.site_id;
    end if;
  end if;

  if tg_op = 'INSERT' or new.stage is distinct from old.stage then new.stage_changed_at := now(); end if;
  return new;
end $$;
drop trigger if exists interventions_stage_t on interventions;
create trigger interventions_stage_t before insert or update on interventions for each row execute function interventions_stage_sync();

-- Le contrat garde aussi le nom de l'intervenant historique aligné sur la fiche équipe,
-- et un nouveau contrat sans site reçoit automatiquement son site (adresse du contrat, sinon du client).
create or replace function contracts_staff_sync() returns trigger language plpgsql as $$
declare cl record;
begin
  if tg_op = 'INSERT' and new.site_id is null then
    select address, postal_code, city into cl from clients where id = new.client_id;
    select id into new.site_id from sites
     where client_id = new.client_id and lower(coalesce(address,'')) = lower(coalesce(new.site_address, cl.address, '')) limit 1;
    if new.site_id is null then
      insert into sites(client_id, name, address, postal_code, city)
        values (new.client_id, new.label, coalesce(new.site_address, cl.address),
                case when new.site_address is null then cl.postal_code end, case when new.site_address is null then cl.city end)
        returning id into new.site_id;
    end if;
  end if;
  if new.staff_id is not null then
    select full_name into new.assignee from staff where id = new.staff_id;   -- toujours aligné sur la fiche
  elsif new.staff_id is null and tg_op = 'UPDATE' and old.staff_id is not null and new.assignee is not distinct from old.assignee then
    new.assignee := null;
  end if;
  return new;
end $$;
drop trigger if exists contracts_staff_t on contracts;
create trigger contracts_staff_t before insert or update on contracts for each row execute function contracts_staff_sync();

-- ───────────────────────── Anomalies & réclamations ─────────────────────────
create table if not exists mission_issues (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('anomalie','reclamation')),
  intervention_id uuid references interventions(id) on delete set null,
  site_id uuid references sites(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  severity text not null default 'normale' check (severity in ('faible','normale','haute')),
  description text not null check (length(trim(description)) > 0),
  status text not null default 'ouverte' check (status in ('ouverte','resolue')),
  resolution text,
  reported_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists mission_issues_open_idx on mission_issues (status, created_at desc);

-- Une mission avec anomalie ouverte passe « à vérifier » (si elle était terminée).
create or replace function mission_issue_flag() returns trigger language plpgsql as $$
begin
  if new.intervention_id is not null and new.status = 'ouverte' then
    update interventions set stage = 'a_verifier'
     where id = new.intervention_id and stage in ('terminee','validee','facturable') and invoice_id is null;
  end if;
  return new;
end $$;
drop trigger if exists mission_issue_flag_t on mission_issues;
create trigger mission_issue_flag_t after insert on mission_issues for each row execute function mission_issue_flag();

-- ───────────────────────── Journal : qui a modifié quoi et quand ─────────────────────────
create table if not exists change_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor text not null,        -- e-mail de l'utilisateur, ou « automatisation »
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert','update','delete')),
  changes jsonb               -- update : {colonne: [avant, après]} ; delete : ligne complète ; insert : null
);
create index if not exists change_log_row_idx on change_log (table_name, row_id, at desc);
create index if not exists change_log_at_idx on change_log (at desc);

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb; k text; o jsonb; n jsonb; who text;
begin
  who := coalesce(nullif(auth.jwt() ->> 'email', ''), case when auth.uid() is null then 'automatisation' else auth.uid()::text end);
  if tg_op = 'UPDATE' then
    o := to_jsonb(old); n := to_jsonb(new);
    for k in select jsonb_object_keys(n) loop
      if k not in ('updated_at','stage_changed_at') and (o -> k) is distinct from (n -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
    insert into change_log(actor_id, actor, table_name, row_id, action, changes) values (auth.uid(), who, tg_table_name, new.id, 'update', diff);
    return new;
  elsif tg_op = 'INSERT' then
    insert into change_log(actor_id, actor, table_name, row_id, action) values (auth.uid(), who, tg_table_name, new.id, 'insert');
    return new;
  else
    insert into change_log(actor_id, actor, table_name, row_id, action, changes) values (auth.uid(), who, tg_table_name, old.id, 'delete', to_jsonb(old));
    return old;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['clients','contracts','quotes','invoices','payments','interventions','sites','staff','mission_issues','services']
  loop
    execute format('drop trigger if exists %I on %I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row()', t || '_audit', t);
  end loop;
end $$;

-- ───────────────────────── RLS : responsable uniquement (agents : étape mobile) ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['sites','staff','mission_issues','change_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
  end loop;
  create policy sites_owner on sites for all to authenticated using (is_owner()) with check (is_owner());
  create policy staff_owner on staff for all to authenticated using (is_owner()) with check (is_owner());
  create policy mission_issues_owner on mission_issues for all to authenticated using (is_owner()) with check (is_owner());
  -- Le journal se lit, il ne se modifie pas (les écritures passent par le trigger SECURITY DEFINER).
  create policy change_log_owner on change_log for select to authenticated using (is_owner());
end $$;

-- ───────────────────────── Reprise des données existantes ─────────────────────────
-- Un site par contrat (adresse du contrat, sinon celle du client), sans doublon par client + adresse.
do $$
declare k record; sid uuid; addr text;
begin
  for k in select c.id, c.client_id, c.label, c.site_address, cl.address, cl.postal_code, cl.city
             from contracts c join clients cl on cl.id = c.client_id where c.site_id is null order by c.created_at
  loop
    addr := coalesce(k.site_address, k.address);
    select id into sid from sites where client_id = k.client_id and lower(coalesce(address,'')) = lower(coalesce(addr,'')) limit 1;
    if sid is null then
      insert into sites(client_id, name, address, postal_code, city)
        values (k.client_id, k.label, addr, case when k.site_address is null then k.postal_code end, case when k.site_address is null then k.city end)
        returning id into sid;
    end if;
    update contracts set site_id = sid where id = k.id;
  end loop;
end $$;
update interventions i set site_id = c.site_id from contracts c where i.contract_id = c.id and i.site_id is null and c.site_id is not null;

-- Les intervenants déjà saisis en texte deviennent des fiches Équipe.
insert into staff(full_name)
select distinct on (lower(trim(a))) trim(a) from (
  select assignee a from contracts where assignee is not null and trim(assignee) <> ''
  union all select assignee from interventions where assignee is not null and trim(assignee) <> ''
) s
on conflict do nothing;
update contracts c set staff_id = s.id from staff s where c.staff_id is null and c.assignee is not null and lower(trim(c.assignee)) = lower(s.full_name);
update interventions i set staff_id = s.id from staff s where i.staff_id is null and i.assignee is not null and lower(trim(i.assignee)) = lower(s.full_name) and i.invoice_id is null;
update interventions set stage = case status when 'annule' then 'annulee' when 'realise' then case when invoice_id is not null then 'facturee' else 'terminee' end
  else case when assignee is not null then 'affectee' else 'planifiee' end end where stage is null;
-- Pas de valeur par défaut : à l'insertion, l'étape est déduite du statut historique par le trigger.
alter table interventions alter column stage set not null;

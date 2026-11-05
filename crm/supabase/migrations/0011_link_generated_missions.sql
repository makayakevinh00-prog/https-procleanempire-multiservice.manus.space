-- 0011 — Les missions générées par le planning (nom de l'intervenant en texte) sont reliées à sa fiche Équipe.
-- Sans ce lien, elles n'apparaissaient pas sur le téléphone de l'agent.
create or replace function interventions_stage_sync() returns trigger language plpgsql as $$
declare sname text;
begin
  -- Lien avec la fiche Équipe : une mission créée par le planning automatique ne porte que le NOM de l'intervenant.
  -- On retrouve sa fiche (celle du contrat, sinon par le nom) pour que la mission apparaisse sur son téléphone.
  if new.staff_id is null and (tg_op = 'INSERT' or new.assignee is distinct from old.assignee) and new.assignee is not null and trim(new.assignee) <> '' then
    if tg_op = 'INSERT' and new.contract_id is not null then
      select c.staff_id into new.staff_id from contracts c join staff st on st.id = c.staff_id and st.active
       where c.id = new.contract_id and lower(trim(coalesce(c.assignee, ''))) = lower(trim(new.assignee));
    end if;
    if new.staff_id is null then
      select st.id into new.staff_id from staff st where st.active and lower(trim(st.full_name)) = lower(trim(new.assignee)) limit 1;
    end if;
  end if;
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

-- Missions existantes : rattrapage par le nom.
update interventions i set staff_id = st.id from staff st
 where i.staff_id is null and i.assignee is not null and st.active and lower(trim(st.full_name)) = lower(trim(i.assignee)) and i.invoice_id is null
   and i.stage in ('planifiee','affectee','en_route','arrivee','en_cours');

-- 0028 — Sites : fréquence, éléments spécifiques, zones (pièces) avec tâches et points d'attention.
-- Additif : aucune colonne existante n'est modifiée. Les missions créées ensuite pour un site qui a des zones
-- reçoivent une check-list par pièce (la check-list à plat reste le repli pour les sites sans zones).
alter table sites add column if not exists frequency text;
alter table sites add column if not exists specifics text[] not null default '{}';
alter table sites add column if not exists zones jsonb not null default '[]'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sites_zones_is_array') then
    alter table sites add constraint sites_zones_is_array check (jsonb_typeof(zones) = 'array');
  end if;
end $$;

create or replace function interventions_zone_checklist() returns trigger language plpgsql as $$
declare flat jsonb; built jsonb;
begin
  if new.site_id is null then return new; end if;
  select jsonb_agg(jsonb_build_object('label', x, 'done', false)) into flat from sites s, jsonb_array_elements_text(s.checklist) x where s.id = new.site_id;
  -- Seulement si la check-list est vide ou simplement copiée du site : on ne remplace jamais une liste saisie à la main.
  if new.checklist = '[]'::jsonb or new.checklist is not distinct from coalesce(flat, '[]'::jsonb) then
    select coalesce(jsonb_agg(jsonb_build_object('label', t.task, 'done', false, 'room', z.name) order by z.ord, t.ord), '[]'::jsonb) into built
      from sites s,
           lateral (select z.value ->> 'name' as name, z.ord from jsonb_array_elements(s.zones) with ordinality as z(value, ord)) z,
           lateral (select tk.value as task, tk.ord from jsonb_array_elements_text((select value -> 'tasks' from jsonb_array_elements(s.zones) with ordinality as zz(value, o) where zz.o = z.ord)) with ordinality as tk(value, ord)) t
     where s.id = new.site_id;
    if built <> '[]'::jsonb then new.checklist := built; end if;
  end if;
  return new;
end $$;
drop trigger if exists interventions_zz_zones_t on interventions;
create trigger interventions_zz_zones_t before insert on interventions for each row execute function interventions_zone_checklist();

-- Paye du nettoyeur : taux horaire plancher.
-- Le nettoyeur touche le plus élevé de deux montants : sa part en pourcentage du prix client, ou
-- (taux horaire du type de ménage × durée prévue). Le plancher ne baisse jamais une paye existante.
-- Taux : Paris (code postal 75) 17 €/h, ailleurs 15 €/h, bureaux 12 €/h (modifiables dans Nettoyeurs > Réglages).

alter table marketplace_settings
  add column if not exists hourly_floor_paris numeric(6, 2) not null default 17 check (hourly_floor_paris >= 0),
  add column if not exists hourly_floor_other numeric(6, 2) not null default 15 check (hourly_floor_other >= 0),
  add column if not exists hourly_floor_office numeric(6, 2) not null default 12 check (hourly_floor_office >= 0);

alter table cleaning_jobs
  add column if not exists job_kind text not null default 'logement' check (job_kind in ('logement', 'bureau'));

create or replace function cleaning_job_amounts() returns trigger language plpgsql as $$
declare s marketplace_settings; recalc boolean; rate numeric; base numeric; plancher numeric; pay numeric;
begin
  select * into s from marketplace_settings limit 1;
  if tg_op = 'INSERT' then recalc := true;
  else recalc := new.price_ht is distinct from old.price_ht or new.status = 'ouverte';
  end if;
  if recalc then
    rate := case when new.job_kind = 'bureau' then s.hourly_floor_office
                 when left(coalesce(new.postal_code, ''), 2) = '75' then s.hourly_floor_paris
                 else s.hourly_floor_other end;
    base := round(new.price_ht * s.cleaner_pct / 100, 2);
    plancher := round(rate * coalesce(new.duration_hours, 0), 2);
    pay := greatest(base, plancher);
    new.cleaner_amount := pay + coalesce(new.linen_bonus, 0);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - pay - new.platform_amount - coalesce(new.linen_bonus, 0), 2);
  end if;
  return new;
end $$;

drop trigger if exists cleaning_jobs_amounts_t on cleaning_jobs;
create trigger cleaning_jobs_amounts_t before insert or update of price_ht, duration_hours, postal_code, job_kind on cleaning_jobs
  for each row execute function cleaning_job_amounts();

-- Recalcul des ménages encore ouverts (les ménages acceptés ou validés gardent leur paye).
update cleaning_jobs set price_ht = price_ht where status = 'ouverte';

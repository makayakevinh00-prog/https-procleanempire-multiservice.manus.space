-- Paye du nettoyeur : mode « horaire » (taux × durée prévue, sans part en pourcentage) ou « plancher » (le plus élevé des deux).
-- En mode horaire, si la durée est inconnue, la part en pourcentage s'applique. Réglage : Nettoyeurs > Réglages.
alter table marketplace_settings add column if not exists pay_mode text not null default 'plancher' check (pay_mode in ('plancher', 'horaire'));

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
    if s.pay_mode = 'horaire' and plancher > 0 then pay := plancher;
    else pay := greatest(base, plancher);
    end if;
    new.cleaner_amount := pay + coalesce(new.linen_bonus, 0);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - pay - new.platform_amount - coalesce(new.linen_bonus, 0), 2);
  end if;
  return new;
end $$;

update marketplace_settings set pay_mode = 'horaire';
update cleaning_jobs set price_ht = price_ht where status = 'ouverte';

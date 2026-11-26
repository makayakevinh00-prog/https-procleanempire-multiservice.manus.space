-- Linge lavé par le nettoyeur : la prime peut être ajoutée aussi après la validation du ménage, tant que le virement n'est pas fait.
create or replace function cleaner_linen_washed(p_token text, p_job uuid, p_washed boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; bonus numeric(8, 2); delta numeric(8, 2);
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if not (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.payout_id is null)) then raise exception 'INDISPONIBLE: ce ménage est déjà payé, la prime ne peut plus être modifiée'; end if;
  select linen_bonus into bonus from marketplace_settings limit 1;
  bonus := case when coalesce(p_washed, false) then coalesce(bonus, 0) else 0 end;
  delta := bonus - j.linen_bonus;
  update cleaning_jobs set linen_washed = coalesce(p_washed, false), linen_bonus = bonus, cleaner_amount = cleaner_amount + delta, logistics_amount = logistics_amount - delta where id = j.id;
  return jsonb_build_object('washed', coalesce(p_washed, false), 'bonus', bonus, 'amount', j.cleaner_amount + delta);
end $$;
grant execute on function cleaner_linen_washed(text, uuid, boolean) to anon, authenticated;

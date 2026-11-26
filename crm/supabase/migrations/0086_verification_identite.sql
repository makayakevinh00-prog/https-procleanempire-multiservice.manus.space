-- Vérification d'identité (pièce + selfie) par un prestataire : on ne garde que le statut et l'identifiant de session, jamais les documents.
alter table cleaners add column if not exists identity_status text not null default 'a_verifier' check (identity_status in ('a_verifier', 'en_cours', 'verifie', 'echec', 'non_requis')),
  add column if not exists identity_session_id text, add column if not exists identity_verified_at timestamptz;
-- Les nettoyeurs déjà inscrits avant aujourd'hui ne sont pas bloqués ; la direction peut leur demander plus tard.
update cleaners set identity_status = 'non_requis' where created_at < (now() at time zone 'Europe/Paris')::date and identity_status = 'a_verifier';

create or replace function cleaner_identity(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners := cleaner_pending_by_token(p_token);
begin
  return jsonb_build_object('id', c.id, 'name', c.full_name, 'email', c.email, 'status', c.identity_status, 'session_id', c.identity_session_id, 'verified_at', c.identity_verified_at);
end $$;
grant execute on function cleaner_identity(text) to anon, authenticated;

create or replace function cleaner_accept_job(p_token text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date; fav boolean;
begin
  c := cleaner_by_token(p_token);
  if c.identity_status not in ('verifie', 'non_requis') then raise exception 'IDENTITE: vérifiez d''abord votre identité (pièce d''identité et selfie, 2 minutes) pour accepter des ménages'; end if;
  if c.certified_at is null then raise exception 'FORMATION: terminez d''abord la formation ProClean (révision puis tests) pour accepter des ménages'; end if;
  select * into j from cleaning_jobs where id = p_job for update;
  if not found or j.status <> 'ouverte' then raise exception 'INDISPONIBLE: ce ménage vient d''être pris ou n''est plus disponible'; end if;
  if j.postal_code like '75%' and coalesce(c.training_score, 0) < training_paris_min() then raise exception 'INDISPONIBLE: les ménages à Paris sont réservés aux nettoyeurs ayant au moins % % à la formation', training_paris_min(), '%'; end if;
  if j.job_date < today then raise exception 'INDISPONIBLE: cette date est passée'; end if;
  if not cleaner_covers(c, j) then raise exception 'INDISPONIBLE: ce ménage est hors de votre zone'; end if;
  if not dispatch_eligible(c, j) then raise exception 'INDISPONIBLE: vous avez déjà un ménage sur ce créneau'; end if;
  if not dispatch_visible(c, j) then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé à d''autres nettoyeurs, mieux placés'; end if;
  select exists (select 1 from cleaner_favorites f where f.cleaner_id = c.id and f.client_id = j.client_id) into fav;
  if j.priority_until is not null and j.priority_until > now() and not fav then raise exception 'INDISPONIBLE: ce ménage est d''abord proposé aux favoris du propriétaire'; end if;
  update cleaning_jobs set status = 'acceptee', cleaner_id = c.id, accepted_at = now() where id = j.id;
  if j.intervention_id is not null then update interventions set assignee = c.full_name where id = j.intervention_id; end if;
  return jsonb_build_object('ok', true, 'title', j.title, 'date', j.job_date, 'city', j.city, 'name', c.full_name, 'amount', j.cleaner_amount);
end $$;
grant execute on function cleaner_accept_job(text, uuid) to anon, authenticated;

-- 0087 — Espace agent : photo de profil, formation (3 modules propres aux agents) avec certificat, et rapport mensuel (heures, ponctualité, qualité).
alter table staff add column if not exists avatar bytea, add column if not exists certified_at timestamptz, add column if not exists certificate_no text unique, add column if not exists training_score int;

-- Les agents ont leurs propres modules (agent_*) : les modules et fonctions des nettoyeurs indépendants ne changent pas.
do $$ declare c record; begin
  for c in select conrelid::regclass::text t, conname from pg_constraint where contype = 'c' and conrelid in ('training_questions'::regclass, 'training_attempts'::regclass) and pg_get_constraintdef(oid) ilike '%module%' loop
    execute format('alter table %s drop constraint %I', c.t, c.conname);
  end loop;
end $$;
alter table training_questions add constraint training_questions_module_check check (module in ('app', 'process', 'incident', 'agent_app', 'agent_process', 'agent_incident'));
alter table training_attempts add constraint training_attempts_module_check check (module in ('app', 'process', 'incident', 'agent_app', 'agent_process', 'agent_incident'));
alter table training_attempts alter column cleaner_id drop not null;
alter table training_attempts add column if not exists staff_id uuid references staff(id) on delete cascade;
alter table training_attempts add constraint training_attempts_owner_one check ((cleaner_id is null) <> (staff_id is null));
create index if not exists training_attempts_staff_idx on training_attempts (staff_id, module);

-- Photo (JPEG réduit par le téléphone, 150 Ko au plus).
create or replace function agent_set_avatar(p_token text, p_b64 text) returns void language plpgsql security definer set search_path = public as $$
declare a staff; d bytea;
begin
  a := agent_by_token(p_token);
  if p_b64 is null or p_b64 = '' then update staff set avatar = null where id = a.id; return; end if;
  d := decode(p_b64, 'base64');
  if length(d) > 150000 then raise exception 'PHOTO_TROP_LOURDE'; end if;
  if substring(d from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'PHOTO_FORMAT'; end if;
  update staff set avatar = d where id = a.id;
end $$;
create or replace function agent_avatar(p_token text) returns text language plpgsql stable security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  return (select replace(encode(avatar, 'base64'), E'\n', '') from staff where id = a.id and avatar is not null);
end $$;

-- Formation : avancement, questions sans les réponses, correction faite dans la base, certificat quand les trois modules sont réussis.
create or replace function agent_training(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  return jsonb_build_object('name', a.full_name, 'certified_at', a.certified_at, 'certificate_no', a.certificate_no, 'score', a.training_score, 'pass_mark', training_pass_mark(),
    'modules', (select jsonb_object_agg(m, jsonb_build_object(
      'best', (select max(score) from training_attempts where staff_id = a.id and module = m),
      'passed', exists (select 1 from training_attempts where staff_id = a.id and module = m and passed),
      'attempts', (select count(*) from training_attempts where staff_id = a.id and module = m),
      'questions', (select count(*) from training_questions where module = m and active))) from unnest(array['agent_app', 'agent_process', 'agent_incident']) m));
end $$;
create or replace function agent_training_questions(p_token text, p_module text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff;
begin
  a := agent_by_token(p_token);
  if p_module not in ('agent_app', 'agent_process', 'agent_incident') then raise exception 'ARGUMENT: module inconnu'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'question', question, 'options', options) order by position) from training_questions where module = p_module and active), '[]'::jsonb);
end $$;
create or replace function agent_training_submit(p_token text, p_module text, p_answers jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare a staff; total int; good int := 0; pct int; ok boolean; wrong jsonb := '[]'::jsonb; r record; all_ok boolean; avg_score int; no text;
begin
  a := agent_by_token(p_token);
  if p_module not in ('agent_app', 'agent_process', 'agent_incident') then raise exception 'ARGUMENT: module inconnu'; end if;
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then raise exception 'ARGUMENT: réponses invalides'; end if;
  select count(*) into total from training_questions where module = p_module and active;
  if total = 0 then raise exception 'ARGUMENT: aucune question pour ce module'; end if;
  for r in select * from training_questions where module = p_module and active order by position loop
    if (p_answers ->> r.id::text) ~ '^\d+$' and (p_answers ->> r.id::text)::int = r.answer then good := good + 1;
    else wrong := wrong || jsonb_build_array(jsonb_build_object('id', r.id, 'why', r.why)); end if;
  end loop;
  pct := round(100.0 * good / total);
  ok := pct >= training_pass_mark();
  insert into training_attempts (staff_id, module, score, passed) values (a.id, p_module, pct, ok);
  select bool_and(m.passed) into all_ok from (select exists (select 1 from training_attempts where staff_id = a.id and module = x and passed) as passed from unnest(array['agent_app', 'agent_process', 'agent_incident']) x) m;
  select round(avg(b))::int into avg_score from (select max(score) as b from training_attempts where staff_id = a.id and passed group by module) s;
  if all_ok then
    no := coalesce(a.certificate_no, 'PCE-A-' || to_char(now() at time zone 'Europe/Paris', 'YY') || '-' || lpad(nextval('certificate_seq')::text, 4, '0'));
    update staff set certified_at = coalesce(certified_at, now()), certificate_no = no, training_score = avg_score where id = a.id;
  else
    update staff set training_score = avg_score where id = a.id;
  end if;
  return jsonb_build_object('score', pct, 'passed', ok, 'good', good, 'total', total, 'wrong', wrong, 'certified', coalesce(all_ok, false), 'pass_mark', training_pass_mark());
end $$;

-- Rapport du mois : ce que l'agent a fait (missions, heures, jours), sa ponctualité, la qualité de son travail, et la répartition par client.
create or replace function agent_month(p_token text, p_month date default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a staff; today date := (now() at time zone 'Europe/Paris')::date; m0 date; m1 date; res jsonb;
begin
  a := agent_by_token(p_token);
  m0 := date_trunc('month', coalesce(p_month, today))::date; m1 := (m0 + interval '1 month')::date;
  with mine as (
    select i.*, c.name as client_name, s.name as site_name from interventions i join clients c on c.id = i.client_id left join sites s on s.id = i.site_id
     where i.staff_id = a.id and i.scheduled_date >= m0 and i.scheduled_date < m1),
  done as (select * from mine where stage in ('terminee', 'a_verifier', 'validee', 'facturable', 'facturee') and scheduled_date <= today)
  select jsonb_build_object(
    'agent', a.full_name, 'month', m0, 'today', today,
    'first_month', (select date_trunc('month', min(scheduled_date))::date from interventions where staff_id = a.id),
    'missions', (select count(*) from done),
    'hours', (select coalesce(sum(duration_hours), 0) from done),
    'days', (select count(distinct scheduled_date) from done),
    'sites', (select count(distinct site_id) from done),
    'arrivals', (select count(*) from done where arrived_at is not null),
    'verified', (select count(*) from done where arrived_verified),
    'punct_total', (select count(*) from done where arrived_at is not null and start_time is not null),
    'punct_ok', (select count(*) from done where arrived_at is not null and start_time is not null and arrived_at <= ((scheduled_date + start_time) at time zone 'Europe/Paris') + interval '10 minutes'),
    'validated', (select count(*) from done where stage in ('validee', 'facturable', 'facturee')),
    'redo', (select count(*) from done where ai_report ->> 'verdict' = 'reprise'),
    'issues', (select count(*) from mission_issues x where x.intervention_id in (select id from done)),
    'cancelled', (select count(*) from mine where stage = 'annulee'),
    'upcoming', (select count(*) from interventions where staff_id = a.id and scheduled_date >= today and stage in ('planifiee', 'affectee')),
    'upcoming_hours', (select coalesce(sum(duration_hours), 0) from interventions where staff_id = a.id and scheduled_date >= today and stage in ('planifiee', 'affectee')),
    'by_client', (select coalesce(jsonb_agg(jsonb_build_object('client', t.client_name, 'missions', t.n, 'hours', t.h) order by t.h desc, t.n desc), '[]'::jsonb) from (select client_name, count(*) n, coalesce(sum(duration_hours), 0) h from done group by client_name) t),
    'list', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'date', d.scheduled_date, 'time', d.start_time, 'client', d.client_name, 'site', d.site_name, 'hours', d.duration_hours, 'stage', d.stage) order by d.scheduled_date desc, d.start_time desc nulls last), '[]'::jsonb) from (select * from done order by scheduled_date desc, start_time desc nulls last limit 60) d)
  ) into res;
  return res;
end $$;

insert into training_questions (module, position, question, options, answer, why) select * from (values
('agent_app', 1, 'Comment votre arrivée est-elle pointée ?', $j$["En appuyant sur « Arrivée » à la fin du ménage", "Par SMS à la direction", "Toute seule, grâce à votre position, quand vous êtes sur place (le bouton « Arrivée » sert de secours)", "Elle n'est pas enregistrée"]$j$::jsonb, 2, 'L''application pointe l''arrivée avec votre position. Gardez la localisation activée ; si elle ne se pointe pas, utilisez le bouton « Arrivée » une fois sur place.'),
('agent_app', 2, 'Vous arrivez sur place. Que faites-vous avant de toucher à quoi que ce soit ?', $j$["Je commence par les sols", "Je filme le lieu avec le film d'arrivée : l'IA prépare mes tâches", "J'appelle le client", "Je ne fais rien de particulier"]$j$::jsonb, 1, 'Le film d''arrivée prouve l''état du lieu avant votre passage et permet à l''IA de préparer votre liste de tâches et vos conseils.'),
('agent_app', 3, 'À quoi sert le film de fin ?', $j$["À remplacer la check-list", "À prévenir le client que vous partez", "À rien, il est facultatif", "À refaire le même tour : l'IA compare avec l'arrivée et contrôle le travail"]$j$::jsonb, 3, 'L''IA compare l''arrivée et la fin pour vérifier que tout est fait. Sans film de fin, la mission est vérifiée à la main par la direction.'),
('agent_app', 4, 'L''IA vous signale des zones à reprendre. Que faites-vous ?', $j$["Je termine quand même sans rien refaire", "Je reprends ces zones puis je refilme la fin", "J'attends le lendemain", "Je supprime le film"]$j$::jsonb, 1, 'Les zones signalées sont à reprendre avant de partir ; refilmez-les une fois propres.'),
('agent_app', 5, 'Vous constatez un dégât, une tache impossible ou un oubli du client. Que faites-vous ?', $j$["Je le répare moi-même", "Je n'en parle pas", "Je le signale tout de suite avec une photo (« Signaler un problème »)", "Je le dis au prochain agent"]$j$::jsonb, 2, 'Un problème signalé avec une photo vous protège et permet à la direction de prévenir le client.'),
('agent_app', 6, 'Un endroit vous résiste (tache, surface délicate). Que faire ?', $j$["Utiliser « Je suis bloqué » : je photographie et l'aide m'explique comment faire et avec quels produits", "Essayer n'importe quel produit", "Laisser tel quel sans le dire", "Demander au client de le faire"]$j$::jsonb, 0, 'Le bouton « Je suis bloqué » donne la méthode et les produits adaptés, sans risquer d''abîmer la surface.'),
('agent_app', 7, 'Où retrouvez-vous vos fiches de paie ?', $j$["Elles ne sont pas dans l'application", "Dans l'onglet Messages", "Par courrier uniquement", "Dans l'application, rubrique Fiches de paie : la direction les dépose chaque mois"]$j$::jsonb, 3, 'Vos bulletins sont déposés chaque mois par la direction ; conservez-les sans limite de durée.'),
('agent_app', 8, 'L''application vous demande de filmer le stock de produits avant de partir. Que faites-vous ?', $j$["Je filme lentement chaque produit, étiquette visible : l'IA compte ce qui reste", "Je ne filme que les produits pleins", "Je rapporte les bidons vides chez moi", "Je passe cette étape"]$j$::jsonb, 0, 'Le comptage du stock permet de réapprovisionner à temps. Filmez chaque produit étiquette visible, au moins quelques secondes.'),
('agent_process', 1, 'Dans quel ordre travaillez-vous une pièce ?', $j$["Les sols d'abord", "Au hasard", "Du haut vers le bas et du fond vers la porte : poussières d'abord, sols en dernier", "La salle de bain puis le reste"]$j$::jsonb, 2, 'La poussière tombe : on commence en hauteur et on finit par le sol, en reculant vers la sortie.'),
('agent_process', 2, 'Quels produits ne faut-il jamais mélanger ?', $j$["L'eau et le savon", "L'eau de Javel avec du vinaigre ou de l'ammoniaque", "Le vinaigre et l'eau", "Le savon et la microfibre"]$j$::jsonb, 1, 'Ce mélange dégage un gaz toxique. Un produit à la fois, fenêtre ouverte.'),
('agent_process', 3, 'Puis-je utiliser le même chiffon pour les WC et pour les plans de travail ?', $j$["Oui, si je le rince", "Jamais : chiffons séparés par zone (sanitaires, cuisine, bureaux)", "Oui, le même jour", "Seulement pour le sol"]$j$::jsonb, 1, 'Mélanger les chiffons transmet des bactéries. Un code couleur par zone évite les erreurs.'),
('agent_process', 4, 'Comment traitez-vous un sol ?', $j$["Je lave directement", "Je dépoussière d'abord (aspirateur ou balai), puis je lave", "Je passe seulement de l'eau", "Je le laisse sécher sans le laver"]$j$::jsonb, 1, 'Dépoussiérer avant de laver évite la boue et les traînées.'),
('agent_process', 5, 'Comment éviter les traces sur les vitres et les miroirs ?', $j$["Avec un torchon de cuisine", "Avec de l'eau de Javel", "En les laissant sécher seuls", "Produit adapté, puis microfibre propre et sèche, du haut vers le bas"]$j$::jsonb, 3, 'La microfibre sèche enlève le produit et évite les auréoles.'),
('agent_process', 6, 'Quelles zones sont très touchées et souvent oubliées ?', $j$["Seulement le sol", "Poignées de porte, interrupteurs, rampes, télécommandes et claviers", "Seulement les vitres", "Aucune"]$j$::jsonb, 1, 'Ce sont les zones que tout le monde touche : elles se désinfectent à chaque passage.'),
('agent_process', 7, 'Que faites-vous des poubelles ?', $j$["Je les laisse pleines", "Je vide dans l'évier", "Je les vide, je remets un sac propre et je sors les déchets selon la consigne du lieu", "Je les cache"]$j$::jsonb, 2, 'Un sac propre en place est attendu à chaque passage ; la consigne du lieu précise où sortir les déchets.'),
('agent_process', 8, 'Avant de quitter le lieu, que faites-vous ?', $j$["Je pars dès que j'ai fini la dernière pièce", "Je relis la check-list pièce par pièce, je ferme tout selon la consigne, puis je filme la fin", "Je laisse la porte ouverte", "J'éteins mon téléphone"]$j$::jsonb, 1, 'Le contrôle final évite les reprises : une tâche oubliée se voit sur le film de fin.'),
('agent_process', 9, 'Comment vous comportez-vous chez un client ?', $j$["Discret : je ne prends rien et je ne photographie ni objets personnels ni documents", "J'utilise ses affaires si besoin", "Je mets de la musique", "J'invite un ami"]$j$::jsonb, 0, 'Vous travaillez chez quelqu''un : discrétion et respect sont obligatoires.'),
('agent_incident', 1, 'Un objet est cassé ou abîmé quand vous arrivez. Que faites-vous ?', $j$["Je le répare discrètement", "Je le jette", "Je ne dis rien", "Je le photographie avant de toucher à quoi que ce soit, puis je le signale"]$j$::jsonb, 3, 'Votre photo prise avant le ménage prouve que le dégât n''est pas de votre fait.'),
('agent_incident', 2, 'Vous cassez quelque chose pendant le ménage. Que faites-vous ?', $j$["Je le dis tout de suite à la direction, avec une photo", "Je le cache ou je le remplace sans rien dire", "J'attends que le client le remarque", "Je préviens seulement le client"]$j$::jsonb, 0, 'Une casse accidentelle arrive à tout le monde : déclarée, elle se règle ; cachée, elle détruit la confiance.'),
('agent_incident', 3, 'Vous trouvez de l''argent ou un bijou. Que faites-vous ?', $j$["Je le mets de côté", "Je ne le déplace pas, je le photographie et je le signale à la direction", "Je le donne à un voisin", "Je le range dans un tiroir"]$j$::jsonb, 1, 'Ne jamais rien emporter : le signalement vous protège.'),
('agent_incident', 4, 'Vous voyez une seringue ou un objet dangereux. Que faites-vous ?', $j$["Je le ramasse à mains nues", "Je le cache", "Je n'y touche pas, je préviens la direction et j'attends ses consignes", "Je le jette"]$j$::jsonb, 2, 'Votre sécurité passe avant tout : un objet dangereux ne se manipule pas.'),
('agent_incident', 5, 'Fuite d''eau, odeur de gaz ou fumée dans le lieu. Que faites-vous ?', $j$["Je continue le ménage", "J'attends de voir si ça s'arrête", "Je répare moi-même", "La sécurité d'abord : je sors en cas de gaz ou de fumée, j'appelle le 18 ou le 112 si besoin, je coupe l'eau si c'est simple, puis je préviens la direction"]$j$::jsonb, 3, 'Vous ne réparez jamais : la sécurité d''abord, puis la direction.'),
('agent_incident', 6, 'Une personne devient agressive ou menaçante. Que faites-vous ?', $j$["Je reste calme, je ne discute pas, je quitte les lieux si je me sens en danger et je préviens la direction (112 en urgence)", "Je réponds sur le même ton", "Je continue coûte que coûte", "Je poste un message sur les réseaux"]$j$::jsonb, 0, 'Aucun ménage ne vaut votre sécurité : partez, la direction gère le client.'),
('agent_incident', 7, 'Le code ou la clé ne fonctionne pas. Que faites-vous ?', $j$["Je force la serrure", "Je contacte la direction, sans jamais forcer l'accès", "Je pars sans prévenir", "J'appelle un serrurier moi-même"]$j$::jsonb, 1, 'Ne forcez jamais un accès : la direction contacte le client.'),
('agent_incident', 8, 'Un client vous propose un extra payé directement, hors ProClean. Que faites-vous ?', $j$["J'accepte, c'est plus simple", "J'accepte en espèces seulement", "Je refuse poliment : tout passe par ProClean", "J'en parle aux collègues"]$j$::jsonb, 2, 'Hors ProClean, vous n''êtes ni payé ni couvert en cas de problème.'),
('agent_incident', 9, 'Vous vous blessez ou vous avez un malaise pendant la mission. Que faites-vous ?', $j$["Je continue pour finir", "Je ne dis rien", "Je rentre sans prévenir", "Je m'arrête, j'appelle le 15 ou le 112 si c'est grave, puis je préviens la direction"]$j$::jsonb, 3, 'Votre santé passe avant la mission : arrêtez-vous et prévenez.')
) v(module, position, question, options, answer, why) where not exists (select 1 from training_questions where module like 'agent\_%');

do $$ declare f text; begin
  foreach f in array array['agent_set_avatar(text,text)', 'agent_avatar(text)', 'agent_training(text)', 'agent_training_questions(text,text)', 'agent_training_submit(text,text,jsonb)', 'agent_month(text,date)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

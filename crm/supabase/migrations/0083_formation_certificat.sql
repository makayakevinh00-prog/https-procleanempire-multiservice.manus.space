-- Formation ProClean : révision et tests (utilisation de l'application, process de ménage), certificat, blocage des ménages tant que non réussi,
-- priorité de Paris aux meilleurs scores, et prime « linge lavé » côté nettoyeur.
alter table cleaners add column if not exists certified_at timestamptz, add column if not exists certificate_no text unique, add column if not exists training_score int;
alter table marketplace_settings add column if not exists linen_bonus numeric(8, 2) not null default 10 check (linen_bonus >= 0);
alter table cleaning_jobs add column if not exists linen_washed boolean not null default false, add column if not exists linen_bonus numeric(8, 2) not null default 0;

create table if not exists training_questions (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('app', 'process', 'incident')),
  position int not null,
  question text not null,
  options jsonb not null,
  answer int not null,
  why text not null,
  active boolean not null default true,
  unique (module, position)
);
create table if not exists training_attempts (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  module text not null check (module in ('app', 'process', 'incident')),
  score int not null check (score between 0 and 100),
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists training_attempts_cleaner_idx on training_attempts (cleaner_id, module);
create sequence if not exists certificate_seq start 1;
do $$ declare t text; begin
  foreach t in array array['training_questions', 'training_attempts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_owner', t);
    execute format('create policy %I on %I for all to authenticated using (is_owner()) with check (is_owner())', t || '_owner', t);
  end loop;
end $$;

insert into training_questions (module, position, question, options, answer, why) select * from (values
('app', 1, 'Quand mon arrivée est-elle enregistrée ?', '["Dès que je suis devant le logement : l''application le fait toute seule avec ma position", "Quand je finis le ménage", "Le lendemain, en appelant la direction", "Je n''ai rien à faire, ce n''est jamais enregistré"]'::jsonb, 0, 'L''application suit votre position et pointe l''arrivée automatiquement dès que vous êtes sur place. Gardez la localisation activée.'),
('app', 2, 'Que faire avant de commencer à nettoyer ?', '["Commencer par la cuisine, on filmera plus tard", "Filmer ou photographier tout le logement : c''est le film d''arrivée", "Envoyer un message au propriétaire", "Rien, on filme seulement à la fin"]'::jsonb, 1, 'Le film d''arrivée prouve l''état du logement à votre arrivée et permet à l''IA de préparer la liste des tâches.'),
('app', 3, 'À quoi sert le film de fin ?', '["À décorer le profil", "À rien, il est facultatif", "À montrer le logement propre : l''IA compare avec l''arrivée et valide le ménage", "À remplacer la check-list"]'::jsonb, 2, 'Sans film de fin, le ménage ne peut pas être validé ni payé.'),
('app', 4, 'L''IA signale des zones à reprendre. Que faites-vous ?', '["Je les refais, je les refilme, puis j''envoie à nouveau", "Je les ignore et je termine", "Je préviens seulement le lendemain", "Je supprime la vidéo"]'::jsonb, 0, 'Les zones signalées sont à reprendre avant la validation. Refilmez-les une fois propres.'),
('app', 5, 'Quand suis-je payé(e) ?', '["Tout de suite après l''arrivée", "Une fois le ménage validé : il passe en « à recevoir », puis en versement, puis payé", "Jamais avant la fin du mois suivant sans suivi", "Seulement si le propriétaire est content"]'::jsonb, 1, 'Le suivi est visible dans l''onglet Gains : à recevoir, en versement, payé.'),
('app', 6, 'Je ne peux plus assurer un ménage accepté. Que faire ?', '["Ne rien dire et ne pas venir", "Envoyer un SMS au propriétaire", "Le libérer dans l''application le plus tôt possible pour qu''un autre nettoyeur le prenne", "Attendre l''heure du ménage"]'::jsonb, 2, 'Libérer tôt protège le client et votre fiabilité. Une absence sans prévenir pénalise votre score.'),
('app', 7, 'Où trouve-t-on l''adresse exacte et les consignes d''accès ?', '["Dans Mes ménages, après avoir accepté le ménage", "Sur la liste des demandes, avant d''accepter", "Par e-mail du client", "Elles ne sont jamais données"]'::jsonb, 0, 'Pour protéger les clients, l''adresse et les codes ne sont visibles qu''une fois le ménage accepté.'),
('app', 8, 'À quoi sert le bouton « En ligne » ?', '["À jouer en ligne", "À me rendre visible pour recevoir rapidement les propositions proches de moi", "À supprimer mon compte", "À partager mon écran"]'::jsonb, 1, 'Les nettoyeurs en ligne reçoivent les propositions en premier, selon leur proximité et leur fiabilité.'),
('app', 9, 'Je pars pour un ménage. Que dois-je faire dans l''application ?', '["Rien", "Appuyer sur « Je pars », choisir voiture ou transports : le trajet et l''heure d''arrivée sont partagés", "M''envoyer un e-mail", "Couper la localisation"]'::jsonb, 1, '« Je pars » ouvre l''itinéraire et partage l''avancée pour que le client sache à quelle heure vous arrivez.'),
('app', 10, 'Je constate un dégât dans le logement. Que faire ?', '["Le réparer discrètement", "Le signaler dans l''application avec une photo, avant de commencer", "Ne rien dire", "Le dire au prochain voyageur"]'::jsonb, 1, 'Un dégât signalé avec photo avant le ménage vous protège : il n''est pas mis sur votre compte.'),
('app', 11, 'Le code ou la clé ne fonctionne pas. Que faire ?', '["Forcer la serrure", "Partir sans prévenir", "Contacter la direction via l''application ou par téléphone, sans forcer", "Appeler un serrurier moi-même"]'::jsonb, 2, 'Ne forcez jamais un accès : la direction contacte le propriétaire ou la conciergerie.'),
('app', 12, 'Suivi des draps : quelle est la bonne suite ?', '["Je les jette", "Je les dépose, je les récupère propres, puis je les remets en place dans le logement", "Je les garde chez moi", "Je les laisse dans la machine"]'::jsonb, 1, 'Chaque étape est cochée dans l''application : déposé, renvoyé, récupéré, remis.'),
('process', 1, 'Dans quel ordre nettoyer une pièce ?', '["Du bas vers le haut", "Du haut vers le bas (poussière, surfaces, puis sol), en finissant par la sortie", "Le sol d''abord, puis le plafond", "Au hasard"]'::jsonb, 1, 'La poussière tombe : on commence en hauteur et on finit par le sol, en reculant vers la porte.'),
('process', 2, 'Par quelle pièce finir le ménage ?', '["Par la salle de bain et les WC, avec des chiffons dédiés", "Par la cuisine", "Par la chambre", "Peu importe"]'::jsonb, 0, 'Les pièces les plus sales passent en dernier pour ne rien salir de propre.'),
('process', 3, 'Puis-je utiliser le même chiffon en cuisine et dans les WC ?', '["Oui, si je le rince", "Oui, si c''est la même journée", "Jamais : chiffons séparés par zone (cuisine, sanitaires, WC)", "Seulement pour le sol"]'::jsonb, 2, 'Mélanger les chiffons transmet des bactéries. Un code couleur évite les erreurs.'),
('process', 4, 'Quels produits ne faut-il jamais mélanger ?', '["Eau et savon", "Eau de Javel avec vinaigre ou ammoniaque", "Vinaigre et eau", "Savon et microfibre"]'::jsonb, 1, 'Ce mélange dégage un gaz toxique. Utilisez un produit à la fois et aérez.'),
('process', 5, 'Que faire du lit en fin de ménage ?', '["Le laisser défait", "Mettre des draps propres, bien tendus, oreillers et couvertures en place", "Poser les draps sales dessus", "Seulement lisser la couette"]'::jsonb, 1, 'Un lit impeccable est ce que le voyageur voit en premier.'),
('process', 6, 'Cheveux et poussière au sol : quelle méthode ?', '["Passer la serpillière directement", "Aspirer d''abord, puis laver le sol", "Balayer vers le palier", "Rien"]'::jsonb, 1, 'Aspirer avant de laver évite de faire de la boue et des traînées.'),
('process', 7, 'Miroirs et vitres : comment éviter les traces ?', '["Les essuyer avec une serviette de bain", "Produit adapté, puis microfibre propre et sèche, du haut vers le bas", "Les laisser sécher seuls", "Utiliser de l''eau de Javel"]'::jsonb, 1, 'La microfibre sèche enlève le produit et évite les auréoles.'),
('process', 8, 'Poubelles : que faut-il faire ?', '["Les laisser pleines", "Les vider, remettre un sac propre et sortir les déchets selon la consigne", "Les vider dans la baignoire", "Les cacher dans le placard"]'::jsonb, 1, 'Un sac propre en place est attendu à chaque départ.'),
('process', 9, 'Cuisine : que contrôle-t-on ?', '["Seulement le sol", "Évier, plaques, micro-ondes, réfrigérateur, surfaces et poignées", "Rien, les voyageurs s''en occupent", "Seulement la vaisselle"]'::jsonb, 1, 'Ces zones sont les premières regardées par les clients et les voyageurs.'),
('process', 10, 'Un voyageur a oublié un objet. Que faites-vous ?', '["Je le garde", "Je le jette", "Je ne le touche pas plus que nécessaire, je le photographie et je le signale dans l''application", "Je le poste sur les réseaux"]'::jsonb, 2, 'Un objet oublié appartient au voyageur : on le signale, on ne le garde pas.'),
('process', 11, 'Il manque un produit ou un consommable. Que faire ?', '["Ne rien dire", "Le signaler dans l''application à la fin du ménage", "Aller en acheter sans le dire", "Utiliser les produits du voyageur"]'::jsonb, 1, 'Le signalement permet de réapprovisionner avant le prochain ménage.'),
('process', 12, 'Avant le film de fin, que faut-il faire ?', '["Rien", "Relire la check-list et vérifier chaque pièce, lumières éteintes et fenêtres fermées", "Filmer le plus vite possible", "Partir"]'::jsonb, 1, 'Le contrôle final évite les reprises. Une tâche oubliée se voit sur le film.'),
('process', 13, 'Comment se comporter dans le logement d''un client ?', '["Utiliser ses affaires", "Rester discret, respecter les lieux et ne rien prendre ni photographier d''objets personnels", "Inviter un ami", "Écouter la musique fort"]'::jsonb, 1, 'Vous entrez chez quelqu''un : discrétion et respect sont obligatoires.'),
('process', 14, 'Taches sur les draps ou le linge. Que faire ?', '["Les ignorer", "Les signaler avec photo et mettre le linge à laver selon la consigne", "Les cacher sous le lit", "Jeter le linge"]'::jsonb, 1, 'Le signalement permet de traiter la tache ou de prévenir le propriétaire.'),
('incident', 1, 'Un objet est cassé ou abîmé quand vous arrivez. Que faites-vous ?', '["Je le répare ou le remplace discrètement", "Je le photographie tel quel avant de toucher à quoi que ce soit, puis je le signale avant de commencer", "Je le jette pour que ça ne se voie pas", "Je n''en parle pas, ce n''est pas mon problème"]'::jsonb, 1, 'Votre photo, prise avant le ménage, prouve que le dégât n''est pas de votre fait et permet à la direction de prévenir le client.'),
('incident', 2, 'Vous cassez quelque chose pendant le ménage. Que faites-vous ?', '["Je le cache ou je le jette", "Je le remplace moi-même sans rien dire", "Je le dis tout de suite à la direction, avec une photo : une casse déclarée se règle, une casse cachée devient un vrai problème", "J''attends que le client le remarque"]'::jsonb, 2, 'Une casse accidentelle arrive à tout le monde. Déclarée, elle peut être prise en charge ; cachée, elle détruit la confiance.'),
('incident', 3, 'Le logement est dans un état extrême (déchets, taches, saleté inhabituelle). Que faites-vous ?', '["Je refuse de travailler et je pars sans rien dire", "Je photographie ou filme l''état d''arrivée, je préviens la direction, puis je fais le ménage prévu", "Je contacte moi-même le voyageur pour lui faire des reproches", "Je nettoie à moitié pour gagner du temps"]'::jsonb, 1, 'Les preuves d''arrivée permettent de facturer un supplément ou de demander un geste au voyageur : c''est la direction qui traite, pas vous.'),
('incident', 4, 'Vous trouvez de l''argent, un bijou ou un objet de valeur. Que faites-vous ?', '["Je le mets de côté pour plus tard", "Je ne le déplace pas plus que nécessaire, je le photographie et je le signale à la direction", "Je le remets au premier voisin croisé", "Je le prends pour le protéger"]'::jsonb, 1, 'Ne jamais rien emporter : le signalement vous protège et permet de le restituer au bon propriétaire.'),
('incident', 5, 'Le logement est saccagé : fête, murs ou meubles dégradés volontairement. Que faites-vous ?', '["Je range et je nettoie tout avant de prévenir", "Je filme et photographie d''abord l''état exact, je préviens la direction avant de nettoyer, puis j''attends ses consignes", "Je discute avec le voyageur pour qu''il rembourse", "Je pars sans rien faire"]'::jsonb, 1, 'Tant que les dégâts ne sont pas documentés, rien ne doit être nettoyé ni déplacé : ce sont les preuves du dossier d''assurance ou de caution.'),
('incident', 6, 'Vous voyez une seringue, une drogue ou un objet dangereux. Que faites-vous ?', '["Je le ramasse à mains nues pour le jeter", "Je n''y touche pas, je préviens tout de suite la direction et j''attends ses consignes", "Je le range dans un tiroir", "J''en parle aux voisins"]'::jsonb, 1, 'Votre sécurité passe avant tout. Un objet dangereux ne se manipule pas : la direction décide de la suite.'),
('incident', 7, 'Un voyageur est encore dans le logement à votre arrivée. Que faites-vous ?', '["Je commence quand même le ménage autour de lui", "Je reste poli, je ne commence pas, je préviens la direction depuis l''application et j''attends ses instructions", "Je lui demande de partir tout de suite", "Je repars sans prévenir"]'::jsonb, 1, 'L''heure de départ se règle entre le client et la direction : vous ne négociez pas, vous prévenez.'),
('incident', 8, 'Un voyageur ou un propriétaire devient agressif ou menaçant. Que faites-vous ?', '["Je réponds sur le même ton", "Je reste calme, je ne discute pas, je quitte les lieux si je me sens en danger et je préviens la direction (112 en cas d''urgence)", "Je continue le ménage coûte que coûte", "Je poste un message sur les réseaux sociaux"]'::jsonb, 1, 'Aucun ménage ne vaut votre sécurité. Partez, prévenez la direction : nous gérons le client.'),
('incident', 9, 'Fuite d''eau, odeur de gaz ou fumée dans le logement. Que faites-vous ?', '["Je continue le ménage", "Odeur de gaz : je n''allume rien, j''aère, je sors et j''appelle les secours ; fuite d''eau : je coupe l''arrivée si c''est simple ; dans tous les cas je préviens la direction", "J''attends de voir si ça s''arrête", "Je répare moi-même"]'::jsonb, 1, 'La sécurité d''abord (18 ou 112 en cas de danger), puis la direction. Vous n''avez jamais à réparer.'),
('incident', 10, 'Le logement est abîmé : que dites-vous au voyageur ou au propriétaire ?', '["Je le tiens pour responsable devant lui", "Rien de définitif : je constate, je photographie et je signale, c''est la direction qui échange avec le client", "Je lui demande de payer sur place", "Je lui propose de réparer contre de l''argent"]'::jsonb, 1, 'Vous constatez et vous signalez. Accuser ou demander de l''argent n''est pas votre rôle et peut vous mettre en difficulté.'),
('incident', 11, 'Un client vous propose un extra ou un paiement directement, en dehors de ProClean. Que faites-vous ?', '["J''accepte, c''est plus simple", "Je refuse poliment et je renvoie vers ProClean : tout passe par l''application", "J''accepte seulement en espèces", "J''en parle aux autres nettoyeurs"]'::jsonb, 1, 'Hors application, vous n''êtes ni payé ni couvert en cas de problème.')
) v(module, position, question, options, answer, why) where not exists (select 1 from training_questions);

create or replace function training_pass_mark() returns int language sql immutable as $$ select 80 $$;
create or replace function training_paris_min() returns int language sql immutable as $$ select 90 $$;

-- Avancement : meilleure note de chaque module, certificat.
create or replace function cleaner_training(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_pending_by_token(p_token);
  return jsonb_build_object('name', c.full_name, 'certified_at', c.certified_at, 'certificate_no', c.certificate_no, 'score', c.training_score, 'pass_mark', training_pass_mark(), 'paris_min', training_paris_min(),
    'modules', jsonb_build_object(
      'app', jsonb_build_object('best', (select max(score) from training_attempts where cleaner_id = c.id and module = 'app'), 'passed', exists (select 1 from training_attempts where cleaner_id = c.id and module = 'app' and passed), 'attempts', (select count(*) from training_attempts where cleaner_id = c.id and module = 'app'), 'questions', (select count(*) from training_questions where module = 'app' and active)),
      'process', jsonb_build_object('best', (select max(score) from training_attempts where cleaner_id = c.id and module = 'process'), 'passed', exists (select 1 from training_attempts where cleaner_id = c.id and module = 'process' and passed), 'attempts', (select count(*) from training_attempts where cleaner_id = c.id and module = 'process'), 'questions', (select count(*) from training_questions where module = 'process' and active)),
      'incident', jsonb_build_object('best', (select max(score) from training_attempts where cleaner_id = c.id and module = 'incident'), 'passed', exists (select 1 from training_attempts where cleaner_id = c.id and module = 'incident' and passed), 'attempts', (select count(*) from training_attempts where cleaner_id = c.id and module = 'incident'), 'questions', (select count(*) from training_questions where module = 'incident' and active))));
end $$;

-- Questions d'un module, sans les réponses.
create or replace function cleaner_training_questions(p_token text, p_module text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners;
begin
  c := cleaner_pending_by_token(p_token);
  if p_module not in ('app', 'process', 'incident') then raise exception 'ARGUMENT: module inconnu'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'question', question, 'options', options) order by position) from training_questions where module = p_module and active), '[]'::jsonb);
end $$;

-- Correction faite dans la base : la note ne peut pas être envoyée par l'application. Le certificat est délivré quand les trois modules sont réussis.
create or replace function cleaner_training_submit(p_token text, p_module text, p_answers jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; total int; good int := 0; pct int; ok boolean; wrong jsonb := '[]'::jsonb; r record; all_ok boolean; avg_score int; no text;
begin
  c := cleaner_pending_by_token(p_token);
  if p_module not in ('app', 'process', 'incident') then raise exception 'ARGUMENT: module inconnu'; end if;
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then raise exception 'ARGUMENT: réponses invalides'; end if;
  select count(*) into total from training_questions where module = p_module and active;
  if total = 0 then raise exception 'ARGUMENT: aucune question pour ce module'; end if;
  for r in select * from training_questions where module = p_module and active order by position loop
    if (p_answers ->> r.id::text) ~ '^\d+$' and (p_answers ->> r.id::text)::int = r.answer then good := good + 1;
    else wrong := wrong || jsonb_build_array(jsonb_build_object('id', r.id, 'why', r.why)); end if;
  end loop;
  pct := round(100.0 * good / total);
  ok := pct >= training_pass_mark();
  insert into training_attempts (cleaner_id, module, score, passed) values (c.id, p_module, pct, ok);
  select bool_and(m.passed) into all_ok from (select exists (select 1 from training_attempts where cleaner_id = c.id and module = x and passed) as passed from unnest(array['app', 'process', 'incident']) x) m;
  select round(avg(b))::int into avg_score from (select max(score) as b from training_attempts where cleaner_id = c.id and passed group by module) s;
  if all_ok then
    no := coalesce(c.certificate_no, 'PCE-' || to_char(now() at time zone 'Europe/Paris', 'YY') || '-' || lpad(nextval('certificate_seq')::text, 4, '0'));
    update cleaners set certified_at = coalesce(certified_at, now()), certificate_no = no, training_score = avg_score where id = c.id;
  else
    update cleaners set training_score = avg_score where id = c.id;
  end if;
  return jsonb_build_object('score', pct, 'passed', ok, 'good', good, 'total', total, 'wrong', wrong, 'certified', coalesce(all_ok, false), 'pass_mark', training_pass_mark());
end $$;

-- Prime « linge lavé » : le nettoyeur qui lave lui-même les draps touche la prime en plus de sa part.
create or replace function cleaning_job_amounts() returns trigger language plpgsql as $$
declare s marketplace_settings;
begin
  select * into s from marketplace_settings limit 1;
  if tg_op = 'INSERT' or new.price_ht is distinct from old.price_ht then
    new.cleaner_amount := round(new.price_ht * s.cleaner_pct / 100, 2) + coalesce(new.linen_bonus, 0);
    new.platform_amount := round(new.price_ht * s.platform_pct / 100, 2);
    new.logistics_amount := round(new.price_ht - (new.cleaner_amount - coalesce(new.linen_bonus, 0)) - new.platform_amount - coalesce(new.linen_bonus, 0), 2);
  end if;
  return new;
end $$;

create or replace function cleaner_linen_washed(p_token text, p_job uuid, p_washed boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; bonus numeric(8, 2); delta numeric(8, 2);
begin
  c := cleaner_by_token(p_token);
  select * into j from cleaning_jobs where id = p_job and cleaner_id = c.id for update;
  if not found then raise exception 'INDISPONIBLE: ménage introuvable'; end if;
  if j.status not in ('acceptee', 'a_verifier', 'a_reprendre') then raise exception 'INDISPONIBLE: ce ménage est déjà validé, la prime ne peut plus être modifiée'; end if;
  select linen_bonus into bonus from marketplace_settings limit 1;
  bonus := case when coalesce(p_washed, false) then coalesce(bonus, 0) else 0 end;
  delta := bonus - j.linen_bonus;
  update cleaning_jobs set linen_washed = coalesce(p_washed, false), linen_bonus = bonus, cleaner_amount = cleaner_amount + delta, logistics_amount = logistics_amount - delta where id = j.id;
  return jsonb_build_object('washed', coalesce(p_washed, false), 'bonus', bonus, 'amount', j.cleaner_amount + delta);
end $$;

create or replace function cleaner_accept_job(p_token text, p_job uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c cleaners; j cleaning_jobs; today date := (now() at time zone 'Europe/Paris')::date; fav boolean;
begin
  c := cleaner_by_token(p_token);
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

create or replace function cleaner_my_jobs(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c cleaners; today date := (now() at time zone 'Europe/Paris')::date; need boolean; has_ref boolean := to_regclass('public.concierge_listings') is not null;
begin
  c := cleaner_by_token(p_token);
  select require_photos into need from marketplace_settings limit 1;
  return jsonb_build_object('require_photos', coalesce(need, true), 'jobs', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'title', j.title, 'date', j.job_date, 'window_start', j.window_start, 'window_end', j.window_end, 'hours', j.duration_hours,
        'city', j.city, 'postal_code', j.postal_code, 'address', j.address, 'access_notes', j.access_notes, 'amount', j.cleaner_amount, 'status', j.status,
        'cleaner_note', j.cleaner_note, 'review_note', j.review_note, 'departure', j.departure, 'arrived_at', j.arrived_at, 'validated_by', j.validated_by,
        'guide', case when has_ref and j.listing_id is not null then cleaning_job_guide(j.listing_id) end,
        'clean_linen', cleaning_job_linen(j.id),
        'photos_before', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'avant'),
        'photos_after', (select count(*) from cleaning_job_photos p where p.job_id = j.id and p.kind = 'apres'),
        'linen_washed', j.linen_washed, 'linen_bonus', j.linen_bonus, 'before_report', j.before_report, 'ai_status', j.ai_status, 'ai_report', j.ai_report,
        'linen', (select jsonb_build_object('status', l.status, 'method', l.method, 'tracking', l.tracking) from cleaning_linen l where l.job_id = j.id)) order by j.job_date, j.window_start)
      from cleaning_jobs j where j.cleaner_id = c.id and (j.status in ('acceptee', 'a_verifier', 'a_reprendre') or (j.status = 'validee' and j.job_date >= today - 30))), '[]'::jsonb));
end $$;

do $$ declare f text; begin
  foreach f in array array['cleaner_training(text)', 'cleaner_training_questions(text,text)', 'cleaner_training_submit(text,text,jsonb)', 'cleaner_linen_washed(text,uuid,boolean)', 'cleaner_accept_job(text,uuid)', 'cleaner_my_jobs(text)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

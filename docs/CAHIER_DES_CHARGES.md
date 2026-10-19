# Cahier des charges de référence — site procleanempire.com

Version du 19 octobre 2026. Synthèse validée par Kevinh des deux audits (« Audit et améliorations proposées » puis « Nouvelle audit du site ProClean Empire ») et de leurs compléments.
Ce document fait référence pour toute évolution du site. **Pas de nouvelle refonte : exécution des priorités dans l'ordre P0 → P3, chaque tâche validée par une preuve de test avant de passer à la suivante.**

Objectif : passer d'un site vitrine à un système commercial complet :
**Visiteur → demande qualifiée → prospect Axonaut → devis → relance → contrat récurrent.**

---

## 1. Règles de travail

- Une tâche n'est « terminée » que si elle est **vérifiée et prouvée**. Chaque compte rendu du développeur comporte trois colonnes : **action réalisée · preuve du test · résultat validé**.
- Fiabilité avant acquisition : formulaires, images manquantes, incohérences de contenu et sécurité sont corrigés avant tout investissement publicitaire.
- Rien n'est mis en ligne sans validation de Kevinh (branche + aperçu Vercel + pull request).
- Aucun chiffre, avis, label ou témoignage inventé. Une information non documentée est omise.

## 2. Critères d'acceptation (avant mise en production)

Pour chaque formulaire et chaque intégration :

1. la demande arrive au bon endroit (Axonaut, source de vérité commerciale) ;
2. le prospect reçoit une confirmation claire (à l'écran ; accusé par e-mail quand un envoi Outlook sera en place) ;
3. le contact et l'opportunité apparaissent dans Axonaut ;
4. un second envoi ne crée pas de doublon injustifié ;
5. aucune clé API n'est visible dans le navigateur ;
6. les erreurs sont compréhensibles et permettent de corriger le formulaire ;
7. les champs sont validés côté serveur ;
8. le formulaire résiste au spam et aux envois automatisés ;
9. les accès aux données sont limités aux personnes autorisées ;
10. la conservation et la suppression des données personnelles sont définies (§ 6).

Validation mobile obligatoire sur **un iPhone et un Android réels** : devis Airbnb, devis bureaux, formulaire Contact, ouverture de WhatsApp, appel, réservation Axonaut, affichage des images. Critère : demander un devis en quelques étapes, sans blocage, sans champ ambigu, sans élément flottant qui masque le bouton ou le formulaire.

## 3. Feuille de route

### P0 — Avant de considérer le site comme terminé
| # | Exigence | Statut (19/10/2026) |
|---|---|---|
| 1 | Tester tous les formulaires de bout en bout (vraies adresses de test) | Fait en recette automatique (faux Axonaut) ; **reste le test réel par Kevinh une fois `AXONAUT_API_KEY` en place** |
| 2 | Réception des demandes + confirmation client | Fait : confirmation à l'écran ; demande dans Axonaut ; trace complète dans les logs Vercel ; si Axonaut échoue, envoi de secours en un clic par e-mail ou WhatsApp |
| 3 | Formulaires de devis connectés à Axonaut (fiche + opportunité, prestation, surface, fréquence, ville, date, message, source) | Fait (PR #8 en ligne + origine du prospect) — à valider en réel ; diagnostic de la clé : /api/quote/health |
| 4 | Horaires, délais de réponse et d'intervention harmonisés (phrase unique partout) | Fait |
| 5 | Informations légales, coordonnées et promesses vérifiées | Fait : adresse alignée sur le Kbis (95300 Pontoise) ; **téléphone 06 17 21 22 30 (site) ≠ 06 17 21 23 30 (Règles §0) : à confirmer par Kevinh** |
| 6 | Une seule URL principale par prestation (bureaux…) | Fait : `/services/<prestation>` redirige (301) vers `/<prestation>` ; liens internes vers la page principale |
| 7 | Sécurité : anti-spam, validation serveur, clé API non exposée | Fait |
| 8 | Parcours essentiels sur iPhone et Android | Fait en émulation (iPhone 13, Pixel 5) ; **reste le test sur vrais téléphones** |
| — | Aucun placeholder ni image cassée en production | Fait (visuels réels ou illustration légendée, image de secours) |

### P1 — Augmenter les demandes qualifiées
1. Preuves B2B authentiques (avis professionnels / conciergeries, séparés par catégorie : Airbnb, bureaux, véhicules, remise en état).
2. Deux ou trois études de cas réelles (besoin · intervention · résultat), photos autorisées.
3. Section « Notre méthode de contrôle » : checklist, fréquence des contrôles, canal de signalement, délai de correction, compte rendu/photo, responsable du suivi.
4. Devis = CTA dominant, même libellé et même style partout ; alternatives : être rappelé, appeler / WhatsApp ; visite technique après qualification.
5. Deux univers distincts : **Propreté des locaux professionnels** (bureaux, commerces, restaurants, copropriétés, remises en état, contrats récurrents) et **Services spécialisés** (ménage Airbnb, véhicules de société, avions, ponctuel). La cible prioritaire passe en premier sur l'accueil.

### P2 — Suivi et rentabilité
1. Notifications et accusés de réception automatiques (via Outlook / Microsoft 365, plus Gmail).
2. Pipeline Axonaut et statuts : Nouveau · Devis à préparer · Devis envoyé · Relance · Gagné · Perdu ; règles anti-doublons ; demandes incomplètes ; historique unique (échanges, devis, relances, RDV).
3. Relances automatiques des devis sans réponse (une par semaine maximum, § 6).
4. Événements de conversion installés et testés (GA4, Search Console, Meta Pixel seulement si campagnes Meta) — avec consentement.
5. Suivi des contrats gagnés, de la marge et du chiffre d'affaires récurrent, pas seulement des formulaires.
6. Cohérence devis / facturation : devis accepté retrouvable depuis la fiche, statut réel, devis refusé hors « à relancer », contrat récurrent distinct d'une intervention ponctuelle, doublons fusionnés.
7. Vérifier que les rendez-vous pris sur la page de réservation Axonaut sont reliés aux fiches prospects.

### P3 — Croissance
1. Renforcer les pages locales déjà publiées (Pontoise, Cergy, Paris, Saint-Ouen, bureaux à Pontoise, Airbnb à Paris) et en ajouter (Saint-Ouen-l'Aumône, Osny, Éragny) sans contenu dupliqué.
2. Contenus utiles locaux (nettoyage Airbnb à Pontoise, remise en état de bureaux, entretien entre deux locations).
3. Performance mobile (Core Web Vitals, images WebP/AVIF, image hero).
4. Mise à jour régulière des études de cas et des avis.
5. Améliorations pilotées par les données réelles d'Axonaut et de GA4.

## 4. Mesure commerciale

Chaque mois, le site et Axonaut doivent répondre à : nombre de demandes de devis ; origine (Google, Meta, Instagram, WhatsApp, Axonaut, accès direct…) ; clics téléphone ; rendez-vous Axonaut ; devis envoyés ; devis relancés ; contrats signés ; pages qui produisent les meilleurs prospects ; chiffre d'affaires issu du site.

Indicateurs de rentabilité : **coût d'acquisition par client · taux de transformation des devis · marge estimée par prestation gagnée · chiffre d'affaires récurrent des contrats issus du site · coût et temps de traitement d'une demande.**
L'objectif est d'identifier les prestations et campagnes réellement rentables, pas seulement d'obtenir plus de prospects.

> Déjà en place : chaque demande enregistre son **origine** (« Origine du prospect », première page vue, site précédent) dans l'opportunité Axonaut.

## 5. Bilan mensuel après mise en ligne

Le 1er de chaque mois, un bilan du mois écoulé (rédigé par la machine, présenté par le Patron à Kevinh) :

| Indicateur | Source |
|---|---|
| Demandes reçues (par prestation et par origine) | Opportunités Axonaut « Demande site — … » |
| Devis envoyés | Devis Axonaut liés à ces fiches |
| Contrats gagnés / perdus (et motifs) | Statut des opportunités |
| Demandes perdues ou sans suite | Opportunités sans devis après 7 jours, échecs `[devis]` dans les logs Vercel |
| Marge estimée | Montants gagnés − coût main-d'œuvre et fournitures (Compta) |
| CA récurrent issu du site | Contrats sous contrat créés depuis le site |
| Corrections proposées du parcours | Pages, questions du formulaire, offres à ajuster |

## 6. RGPD et relances commerciales

- **Données collectées** : celles strictement utiles au devis (identité, coordonnées, adresse d'intervention, caractéristiques de la prestation, message, origine de la visite).
- **Base légale** : mesures précontractuelles à la demande de la personne + case de consentement ; intérêt légitime pour la mesure d'origine (sans cookie).
- **Durée de conservation** : prospects sans suite **3 ans après le dernier contact**, puis suppression ou anonymisation ; clients : durée de la relation + 3 ans ; pièces comptables 10 ans. Revue de purge annuelle dans Axonaut (en janvier).
- **Accès** : Kevinh et les agents de la machine autorisés via les comptes Axonaut / Microsoft 365 de l'entreprise ; clé API uniquement dans les variables d'environnement Vercel ; logs Vercel accessibles aux seuls administrateurs du projet.
- **Sous-traitants** : Axonaut (CRM), Vercel (hébergement, statistiques anonymes si activées), IGN / Géoplateforme (suggestions d'adresse).
- **Relances** : uniquement sur le devis demandé, une par semaine maximum ; pas d'offre sans rapport sans accord préalable (particuliers) ; professionnels : offres liées à leur activité ; opposition possible à chaque message (« STOP ») et respectée immédiatement.
- **Traceurs** : aucun cookie publicitaire ; Vercel Web Analytics (sans cookie, anonyme) seulement s'il est activé ; tout futur outil avec cookies ou suivi (GA4, Meta Pixel) uniquement après consentement via un bandeau conforme.
- **Droits** : accès, rectification, effacement, limitation, opposition, portabilité à contact@procleanempire.com, réponse sous un mois ; réclamation possible auprès de la CNIL.
- La politique de confidentialité du site reprend ces règles (texte à valider par Kevinh).

## 7. Points techniques permanents

- Une page principale par prestation (lien interne, canonique, efforts SEO) ; les doublons redirigent.
- Métadonnées uniques par page, données structurées exactes (ProfessionalService, Service, FAQPage), sitemap et robots à jour.
- Champs avec label associé, messages d'erreur lisibles, focus clavier visible, respect de `prefers-reduced-motion`, carrousel d'avis accessible.
- Coordonnées, horaires et informations légales identiques partout (source : `lib/site.ts` et `lib/content/legal.ts`).

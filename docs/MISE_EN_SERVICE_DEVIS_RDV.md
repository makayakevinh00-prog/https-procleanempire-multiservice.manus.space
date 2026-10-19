# Mise en service : demandes de devis, prise de RDV, fin d'Axonaut

Version du 19 octobre 2026 (branche `machine/refonte`).

## 1. Pourquoi les devis ne marchent pas aujourd'hui sur le site en ligne

Chemin actuel en production : formulaire (même composant sur toutes les pages) → `/api/quote` → API Axonaut.
Le diagnostic en ligne (`https://www.procleanempire.com/api/quote/health`, relevé le 19/10) répond `"cle": "absente"` :
**la variable `AXONAUT_API_KEY` n'existe pas dans Vercel (Production), donc chaque demande échoue et le visiteur voit un message d'erreur.**

## 2. Nouveau fonctionnement (plus aucune dépendance à Axonaut)

Formulaires concernés (un seul composant `QuoteForm`, même route `/api/quote`) : /contact, /devis, /menage-airbnb,
/nettoyage-paris, /conciergerie-entreprise, /nettoyage-bureaux et toutes les pages services et pages locales.

Pour chaque demande :
1. **Sauvegarde** dans une base Redis (Upstash, gratuit via le Marketplace Vercel) — la demande n'est jamais perdue, même si l'e-mail échoue ;
2. **E-mail à contact@procleanempire.com** (Resend) : prestation, détails, surface, adresse, ville, date, nom, téléphone, e-mail, message, page d'origine, origine du prospect, référence. « Répondre » écrit directement au client ;
3. **Accusé de réception au client** : « Demande bien reçue — votre devis sous 24 h », avec la signature de Kevinh ;
4. Trace complète dans les logs Vercel (`[devis]`) en dernier recours.

Protections : champ piège (honeypot) + délai minimal de remplissage, validation serveur, 5 demandes max / 10 min par adresse IP,
anti-doublon (même e-mail + même prestation < 10 min). En cas d'échec total : message clair avec le 06 17 21 22 30 et envoi en un clic par e-mail ou WhatsApp.
Tant qu'aucune variable n'est configurée, le visiteur transmet sa demande pré-remplie en un clic (e-mail ou WhatsApp) — jamais de message d'erreur.

Qonto (création automatique de la fiche client) : **non branché volontairement**. L'API Qonto le permet, mais demande une clé secrète de l'organisation
et créerait une fiche pour chaque prospect, y compris les demandes sans suite et les doublons. Recommandé : créer le client dans Qonto au moment du devis (déjà fait par la machine).

### Variables à ajouter dans Vercel (Settings → Environment Variables, cocher Production ET Preview, puis Redeploy)

| Variable | Valeur | Obligatoire |
|---|---|---|
| `RESEND_API_KEY` | clé « re_… » créée sur resend.com → API Keys | oui (e-mails) |
| `RESEND_FROM` | `ProClean Empire <devis@procleanempire.com>` — **après** vérification du domaine dans Resend | oui pour l'accusé client |
| `LEADS_TO_EMAIL` | `contact@procleanempire.com` (défaut) | non |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | ajoutées automatiquement par l'intégration Upstash (Vercel → Storage → Marketplace → Upstash for Redis → Connect) | oui (sauvegarde) |
| `NEXT_PUBLIC_BOOKING_URL` | lien public Microsoft Bookings (voir § 3) | non |
| `AXONAUT_API_KEY` | **à supprimer** (plus utilisée) | — |

Étapes Resend (15 min) : 1) créer un compte sur resend.com **avec contact@procleanempire.com** ; 2) Domains → Add domain → `procleanempire.com` → ajouter chez l'hébergeur DNS les 3 enregistrements affichés (SPF/DKIM) → Verify ; 3) API Keys → Create (permission « Sending access ») ; 4) mettre les variables ci-dessus dans Vercel → Redeploy.
Avant la vérification du domaine, seul l'e-mail interne peut partir (expéditeur `onboarding@resend.dev`, uniquement vers l'adresse du compte Resend).
Pourquoi pas le SMTP Microsoft 365 : Microsoft désactive l'authentification SMTP « simple » des boîtes Exchange Online en 2026 ; Resend est plus fiable et gratuit jusqu'à 3 000 e-mails/mois.

Contrôle : ouvrir `https://www.procleanempire.com/api/quote/health` → `sauvegarde: OK`, `emailInterne: configuré`, `accuseClient: configuré`.
Les demandes enregistrées se consultent dans Vercel → Storage → (base Upstash) → Data Browser (clés `devis:…`).

## 3. Prise de rendez-vous (remplace la page Axonaut)

Tous les boutons « Prendre RDV » lisent **une seule variable** : `NEXT_PUBLIC_BOOKING_URL`. Sans elle, ils mènent à /contact#rdv (WhatsApp ou téléphone).

Créer la page Microsoft Bookings (incluse dans Microsoft 365, les RDV tombent dans le calendrier Outlook) :
1. https://outlook.office.com/bookings → « Créer » une page de réservation « ProClean Empire » ;
2. Services : Appel découverte (20 min, téléphone), Visite d'évaluation (45 min), Devis bureaux (45 min), État des lieux remise en état (60 min) ;
3. Disponibilités : 8h–18h, 7j/7 (ou vos vrais créneaux), délai minimum de réservation 24 h ;
4. Publier → copier le lien public (`https://outlook.office.com/book/…`) → Vercel `NEXT_PUBLIC_BOOKING_URL` → Redeploy.
(Si Bookings n'est pas inclus dans votre abonnement Microsoft 365 : Cal.com gratuit, même principe.)

## 4. Résiliation d'Axonaut : liste de contrôle

| Dépend encore d'Axonaut | À faire avant de résilier | État |
|---|---|---|
| Formulaires de devis du site | Fusionner `machine/refonte` + variables § 2 | prêt sur la branche |
| Boutons « Prendre RDV » | Fusionner + page Bookings § 3 | prêt sur la branche |
| Variable Vercel `AXONAUT_API_KEY` | Supprimer après la fusion | — |
| Factures récurrentes SEA, IDF Recyclage, SARB Optique (jusqu'en juillet 2027) | Les recréer dans Qonto (facture récurrente si votre offre Qonto le propose, sinon la Facturation mensuelle du 28 de la machine les crée chaque mois dans Qonto) ; **désactiver** les récurrences Axonaut pour éviter une double facture | à faire avant le 28/10 |
| 312 devis | Export PDF + CSV (Axonaut → Devis → sélection → Exporter) | à faire |
| Factures émises | Export PDF + CSV (conservation 10 ans obligatoire) | à faire |
| Contacts / sociétés | Export CSV (déjà recréés dans Qonto le 19/10 pour les 11 clients actifs) | à faire |
| Catalogue produits (codes AIR-…, DET-…, BUR-…) | Export CSV, recréer dans Qonto les produits utilisés | à faire |
| Opportunités « Demande site — … », événements, notes | Export CSV (historique commercial) | à faire |
| Contrats Concierg'Air et Ahmed El Youssfi | Signature terminée avant la coupure | en cours |
| Agents de la machine | Déjà basculés sur Qonto (règles §0 et §14) | fait |

Date réaliste : **à partir du jeudi 29 octobre 2026**, après une facturation mensuelle du 28/10 réussie dans Qonto et les exports faits (compter 1 à 2 semaines au total).
À vérifier par Kevinh : Axonaut → Paramètres → Abonnement : formule **mensuelle ou annuelle** et **préavis** de résiliation.

## 5. Réponse automatique par l'agent commercial (demande de Kevinh, 19/10/2026)

Toutes les demandes arrivent par e-mail dans la boîte contact@procleanempire.com, avec le **même objet** quel que soit le chemin :
`[DEVIS SITE] <prestation> — <nom> — <ville>`.
- Envoi automatique (Resend configuré) : expéditeur `devis@procleanempire.com` (ou `onboarding@resend.dev`), **Reply-To = e-mail du client** ; corps « Libellé : valeur » (prestation, détails, adresse, ville, date, nom, entreprise, téléphone, e-mail, message, page d'origine, origine, référence).
- Sans configuration ou en secours : le visiteur envoie lui-même l'e-mail pré-rempli depuis sa propre adresse (même objet `[DEVIS SITE] …`).

Le Manager Commercial (passage horaire) repère ces e-mails par l'objet `[DEVIS SITE]`, répond au client (adresse du Reply-To ou de la ligne « E-mail ») avec le devis à la grille, et classe le mail (§13). L'accusé « Demande bien reçue » du site part tout de suite ; la réponse du Commercial est le devis.

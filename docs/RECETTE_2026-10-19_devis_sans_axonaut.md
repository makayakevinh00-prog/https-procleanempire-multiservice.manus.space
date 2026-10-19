# Recette du 19/10/2026 — devis sans Axonaut (branche machine/refonte)

Environnement : `npm ci` + `npm run build` + `tsc` OK ; serveur de production local ; **faux Resend et faux Upstash** locaux (aucune vraie clé disponible : le test réel en production reste à faire une fois les variables Vercel ajoutées).

| Action | Preuve | Résultat |
|---|---|---|
| Demande valide (API) | HTTP 200, référence D20261019-…, e-mail interne `[DEVIS SITE] Ménage Airbnb — …` vers contact@procleanempire.com (reply-to = client) + accusé « Demande bien reçue — votre devis sous 24 h » au client ; demande enregistrée en base | OK |
| Renvoi identique < 10 min | HTTP 200 `duplicate`, aucun nouvel e-mail | OK |
| Honeypot rempli | HTTP 200 neutre, rien envoyé, trace « Envoi automatique bloqué » | OK |
| E-mail invalide | HTTP 400 « Adresse e-mail invalide. » | OK |
| Base ET e-mail en panne | HTTP 502, message avec 06 17 21 22 30 + envoi en un clic e-mail/WhatsApp | OK |
| Trop de demandes même IP | HTTP 429 avec le numéro | OK |
| Aucune variable configurée | `handoff` : demande pré-remplie à envoyer en un clic, pas d'erreur | OK |
| Formulaire complet sur mobile (390×844, navigateur réel) : /nettoyage-paris, /menage-airbnb, /contact, /devis, /conciergerie-entreprise, /nettoyage-bureaux | « Demande bien reçue » + e-mail interne + accusé client reçus par le faux Resend pour chaque page | OK |
| Clés non exposées | `RESEND_API_KEY`, `KV_REST_API_TOKEN`, `api.resend.com` absents du code envoyé au navigateur ; plus aucune référence à Axonaut dans le code | OK |

Reste à faire (Kevinh) : variables Vercel (docs/MISE_EN_SERVICE_DEVIS_RDV.md § 2), puis une fausse demande réelle sur l'aperçu → vérifier l'e-mail dans Outlook et l'accusé dans la boîte de test.

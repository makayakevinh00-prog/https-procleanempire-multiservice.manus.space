# API du site public ↔ CRM

Le site **procleanempire.com** parle au CRM par deux canaux. Dans les deux cas, **aucun secret n'est jamais envoyé au navigateur du visiteur** : la signature se fait côté serveur du site.

## 1. Le site envoie une demande de devis (site → CRM)

`POST https://proclean-crm.vercel.app/api/inbound/quote-request`

| En-tête | Valeur |
|---|---|
| `Content-Type` | `application/json` |
| `x-timestamp` | secondes Unix (ex. `1793836000`) |
| `x-signature` | HMAC-SHA256 hexadécimal de `"<x-timestamp>.<corps brut>"`, clé = `INBOUND_SECRET` |

Une requête de plus de 5 minutes (ou datée du futur) est refusée : une requête interceptée ne peut pas être rejouée.
*(Compatibilité : l'ancien en-tête `x-inbound-secret: <INBOUND_SECRET>` est encore accepté, mais **la signature est recommandée**.)*

Corps JSON : `name` (obligatoire), `email` ou `phone` (l'un des deux), `reference` (identifiant côté site : **envoyer deux fois la même référence ne crée jamais de doublon**), `company`, `address`, `postcode`, `city`, `service`, `startDate`, `comments`, `details` (liste de paires `[libellé, valeur]`), `source`.

Réponse `201` (ou `200` si la référence existait déjà) :

```json
{
  "ok": true, "duplicate": false,
  "request_number": "DEM-2611-0004", "status": "nouvelle",
  "tracking_token": "<64 caractères>",
  "tracking_url": "https://proclean-crm.vercel.app/suivi/DEM-2611-0004?t=<jeton>"
}
```

À faire côté site : transmettre `tracking_url` au client (page de confirmation et e-mail d'accusé de réception).

Exemple Node.js (côté serveur uniquement) :

```js
import { createHmac } from "node:crypto";
const body = JSON.stringify({ reference: "WEB-123", name: "Marie Durand", email: "marie@exemple.fr", service: "Ménage bureaux" });
const ts = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", process.env.CRM_INBOUND_SECRET).update(`${ts}.${body}`).digest("hex");
const r = await fetch(process.env.CRM_INBOUND_URL, { method: "POST", headers: { "Content-Type": "application/json", "x-timestamp": ts, "x-signature": signature }, body });
```

## 2. Le client suit sa demande (CRM → site / client)

* **Page prête à l'emploi** : `https://proclean-crm.vercel.app/suivi/<numéro>?t=<jeton>`
* **API JSON** : `GET /api/public/requests/<numéro>` avec le jeton dans l'en-tête `x-tracking-token` (ou `?t=`).
  Navigateur : seules les origines listées dans `PUBLIC_API_ORIGINS` (par défaut procleanempire.com et www) sont autorisées (CORS).

```json
{
  "request_number": "DEM-2611-0004", "status": "planifie", "status_label": "Intervention planifiée",
  "quote": { "number": "DEV-120", "status": "accepte", "total_ttc": 360 },
  "appointments": [{ "date": "2026-11-12", "time": "09:00:00", "label": "Confirmé", "finished": false, "done": 0, "total": 3 }],
  "invoice": { "number": "F2611-000070", "status": "envoye", "total_ttc": 360, "paid": false },
  "links": { "tracking_page": "…", "quote_pdf": "…/documents/devis?t=…", "invoice_pdf": "…/documents/facture?t=…" }
}
```

Codes `status` : `recue`, `en_traitement`, `devis_envoye`, `devis_accepte`, `devis_refuse`, `devis_expire`, `planifie`, `facture`, `clos`.

### Ce que le public ne voit **jamais**
* un devis ou une facture en **brouillon** ;
* le nom de l'agent, les codes d'accès, les notes internes, les photos ;
* **tout détail pour un contact réservé** (statut générique, aucun document) ;
* quoi que ce soit d'autre que **sa** demande : numéro inconnu et mauvais jeton donnent la même réponse `404`.

## Variables d'environnement

| Où | Variable | Rôle |
|---|---|---|
| CRM (Vercel) | `INBOUND_SECRET` | clé de signature partagée avec le site |
| CRM (Vercel) | `PUBLIC_API_ORIGINS` | (optionnel) origines CORS autorisées, séparées par des virgules |
| Site (Vercel) | `CRM_INBOUND_URL` | `https://proclean-crm.vercel.app/api/inbound/quote-request` |
| Site (Vercel) | `CRM_INBOUND_SECRET` | **même valeur** que `INBOUND_SECRET` |

Les webhooks sortants (le CRM qui appelle le site) ne sont pas nécessaires : le site interroge le statut quand il en a besoin.

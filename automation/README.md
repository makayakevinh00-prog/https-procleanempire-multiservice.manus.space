# ProClean Empire — publication automatique

Système autonome de publication quotidienne sur **Instagram, Facebook, LinkedIn
et TikTok**. Chaque matin, il récupère une photo de chantier sur Google Drive,
l'analyse, rédige quatre versions adaptées à chaque réseau, fabrique un visuel
si aucune photo n'est disponible, puis programme les publications.

Aucune intervention humaine n'est requise une fois la configuration faite.

---

## 1. Installation

```bash
cd automation
npm install
cp .env.example .env
```

Node 20 ou plus est requis.

### Vérifier que tout tourne, sans aucune clé

```bash
MOCK_AI=1 npm run daily:dry
```

Cette commande déroule **l'intégralité du pipeline** — choix de l'angle,
rédaction, contrôle anti-répétition, génération du visuel, planification — avec
du contenu factice et sans le moindre appel réseau. Les fichiers produits
arrivent dans `posts/AAAA-MM-JJ/`.

```bash
npm run doctor   # état de la configuration, brique par brique
npm test         # 16 tests : calendrier, anti-répétition, fuseaux, rotation
```

---

## 2. Configuration

Tout passe par `.env` (voir `.env.example`, chaque variable y est commentée).

### 2.1 Modèle de langage — obligatoire

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
```

Le modèle sert à deux choses : analyser les photos et rédiger. `claude-sonnet-5`
suffit très largement ici ; `claude-opus-5` coûte nettement plus cher pour un
gain marginal sur ce type de texte.

**Ordre de grandeur du coût** : une exécution consomme environ 3 000 jetons en
entrée et 2 000 en sortie, soit quelques centimes par jour avec Sonnet.

### 2.2 Google Drive — source des photos

1. Console Google Cloud → créez un projet → activez **Google Drive API**.
2. Créez un **compte de service**, puis une clé au format JSON.
3. Enregistrez le fichier dans `config/google-service-account.json`.
4. **Partagez le dossier Drive avec l'adresse e-mail du compte de service**
   (elle figure dans le JSON, champ `client_email`), en droit *Éditeur*.

> C'est l'étape qu'on oublie systématiquement : sans ce partage, l'API répond
> correctement mais le dossier apparaît vide.

```env
GOOGLE_DRIVE_FOLDER_ID=1AbC...        # visible dans l'URL du dossier
GOOGLE_DRIVE_ARCHIVE_FOLDER_ID=1XyZ...  # facultatif
GOOGLE_SERVICE_ACCOUNT_FILE=./config/google-service-account.json
```

Le compte de service est utilisé plutôt qu'une connexion OAuth utilisateur
parce qu'un jeton OAuth finit par expirer et demande une reconnexion manuelle —
incompatible avec un système censé tourner seul.

Les photos publiées sont déplacées vers le dossier d'archive et, dans tous les
cas, leur identifiant est mémorisé : une même photo ne ressort jamais deux fois.

### 2.3 Buffer — publication

```env
BUFFER_ACCESS_TOKEN=1/...
BUFFER_PROFILE_INSTAGRAM=...
BUFFER_PROFILE_FACEBOOK=...
BUFFER_PROFILE_LINKEDIN=...
BUFFER_PROFILE_TIKTOK=...
```

Les identifiants de profil s'obtiennent avec :

```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=VOTRE_JETON"
```

Deux conditions côté réseaux, indépendantes de ce projet :

- **Instagram** : publication directe possible uniquement pour un compte
  *professionnel* ou *créateur* relié à une page Facebook.
- **TikTok** : la publication directe dépend de l'offre Buffer souscrite. Si
  elle n'est pas disponible, la publication est déposée en brouillon et il reste
  une validation manuelle à faire dans l'application.

Sans `BUFFER_ACCESS_TOKEN`, le système fonctionne quand même : il produit les
textes et les visuels dans `posts/`, sans rien envoyer en ligne.

### 2.4 Visuels

```env
IMAGE_PROVIDER=brand-card   # ou "openai"
```

- **`brand-card`** (défaut) : un gabarit HTML aux couleurs de la marque — bleu
  marine, doré, blanc — rendu par un navigateur sans interface. Gratuit,
  instantané, strictement conforme à la charte.
- **`openai`** : génération par IA, si vous préférez une image d'ambiance.
  Nécessite `OPENAI_API_KEY`.

La carte de marque est le défaut délibérément : un générateur d'images IA écrit
mal le français et ne respecte pas de façon fiable des couleurs imposées. En cas
d'échec d'OpenAI, le système retombe automatiquement sur la carte.

Le rendu a besoin d'un Chrome/Chromium. Il est détecté automatiquement ; sinon,
indiquez-le avec `CHROMIUM_EXECUTABLE`, ou installez-en un :

```bash
npx playwright install chromium
```

### 2.5 Notifications

```env
NOTIFY_WEBHOOK_URL=https://votre-n8n/webhook/proclean-alerte
```

Un webhook plutôt qu'un envoi d'e-mail direct : la même URL fonctionne pour
n8n, Slack et Discord, et le workflow `proclean-alertes.json` sait la
transformer en e-mail.

---

## 3. Lancement

```bash
npm run daily          # exécution réelle
npm run daily:dry      # tout sauf l'envoi en ligne
npm run preview        # comme dry-run, sans toucher à l'historique
npm run history        # les 20 dernières publications
npm run doctor         # état de la configuration
```

Options utiles :

```bash
npm run daily -- --no-photo             # force un contenu sans photo
npm run daily -- --date=2026-12-24      # simule une autre date
```

### Automatisation avec n8n

Deux workflows sont fournis dans `workflows/`, à importer dans n8n
(*Workflows → Import from File*) :

| Fichier | Rôle |
| --- | --- |
| `proclean-publication-quotidienne.json` | Déclenche la publication tous les jours à 08h00, réessaie 3 fois, alerte en cas d'échec |
| `proclean-alertes.json` | Reçoit les alertes par webhook et les envoie par e-mail |

Variables d'environnement à définir **dans n8n** :

```
PROCLEAN_AUTOPOST_DIR=/chemin/vers/automation
PROCLEAN_ALERT_WEBHOOK=https://votre-n8n/webhook/proclean-alerte
PROCLEAN_ALERT_FROM=alertes@procleanempire.com
PROCLEAN_ALERT_TO=contact@procleanempire.com
```

Pensez à régler le fuseau de n8n sur `Europe/Paris` (*Settings → Timezone*),
sinon le déclenchement à 08h00 se fera en UTC.

**Sans n8n**, une ligne de `crontab` suffit :

```cron
0 8 * * * cd /chemin/vers/automation && /usr/bin/npm run daily >> logs/daily.log 2>&1
```

---

## 4. Fonctionnement

```
08h00
  │
  ├─ Nouvelle photo dans Drive ?
  │    ├─ oui → analyse par le modèle : prestation, éléments remarquables,
  │    │        exploitabilité (une photo floue ou montrant une plaque
  │    │        d'immatriculation est écartée)
  │    └─ non → le sujet est généré à partir de l'expertise métier
  │
  ├─ Choix de l'angle du jour
  │    (rotation avec délai de réutilisation, affinité avec le jour de la
  │     semaine, tirage déterministe pour une date donnée)
  │
  ├─ Rédaction des 4 versions
  │    puis comparaison à l'historique : si la ressemblance dépasse le seuil,
  │    le texte est rejeté et réécrit — jusqu'à 3 fois
  │
  ├─ Visuel : la photo réelle, ou une carte de marque générée
  │
  ├─ Programmation via Buffer (3 tentatives par réseau)
  │
  └─ Enregistrement dans posts/ + historique, alerte si échec
```

### Les 13 angles éditoriaux

Avant/après · Résultat obtenu · Conseil de nettoyage · Astuce de professionnel ·
Erreur fréquente · Coulisses · Storytelling · Témoignage · Question fréquente ·
Présentation d'un service · Promotion · Fait intéressant · Motivation
entrepreneuriale.

Chaque angle a un délai de réutilisation propre (4 à 10 jours) et un poids.
Les angles exigeant une photo sont automatiquement écartés les jours sans photo.

### Les 8 cibles commerciales

L'angle décide de la **forme** de la publication, la cible décide **à qui** elle
parle. Les deux tournent indépendamment : c'est ce qui permet de publier quinze
conseils de nettoyage sans jamais s'adresser deux fois de suite aux mêmes
personnes.

| Cible | Poids | Repos |
| --- | --- | --- |
| **Conciergeries et locations courte durée (Airbnb)** | 4 | 3 j |
| Bureaux et locaux professionnels | 3 | 3 j |
| Commerces et restaurants | 2 | 4 j |
| Hôtellerie | 2 | 5 j |
| Automobile | 2 | 4 j |
| Syndics et copropriétés | 2 | 5 j |
| Particuliers | 2 | 5 j |
| Aéronautique | 1 | 8 j |

La **conciergerie Airbnb** a le poids le plus élevé : c'est le segment le plus
porteur en ce moment. Le prompt reçoit ses enjeux propres — rotation entre deux
voyageurs, note et commentaires en jeu à chaque séjour, créneaux serrés le jour
du départ-arrivée — pour que le texte parle vraiment à ces gens-là plutôt que de
rester général.

Deux règles complètent la rotation :

- **Une photo impose sa cible.** Inutile de parler bureaux sous une photo de
  siège de voiture : le type de prestation détecté détermine l'audience.
- **Le week-end** favorise les particuliers, les conciergeries et l'automobile,
  dont l'activité ne s'arrête pas le samedi.

Cibles modifiables dans `config/audiences.ts`.

### Ce qui empêche les publications de se ressembler

Quatre mécanismes se cumulent :

1. **Rotation avec délai** : un angle utilisé ne peut pas revenir avant
   plusieurs jours.
2. **Comparaison à l'historique** : similarité de Jaccard sur les bigrammes de
   mots, mots vides retirés. Au-dessus de 0,30, le texte est réécrit en
   indiquant explicitement au modèle ce qu'il vient de produire.
   Les bigrammes plutôt que les mots isolés : deux textes sur le même service
   partagent forcément beaucoup de mots, mais rarement les mêmes enchaînements.
3. **Hashtags surexploités** signalés au rédacteur pour qu'il varie.
4. **Contexte injecté** : les 12 derniers sujets sont listés dans le prompt avec
   consigne de ne pas y revenir.

### Adaptation au contexte

- **Jour de la semaine** : lundi organisation, mardi technique, mercredi
  coulisses, jeudi preuve, vendredi bilan, samedi grand public, dimanche
  storytelling. Chaque jour privilégie certains angles sans les imposer.
- **Saison** : consignes propres à l'hiver (sel, boue, halls), au printemps
  (grand nettoyage, pollen), à l'été (congés, sites vides) et à l'automne
  (pluie, reprise).
- **Jours fériés** : les 11 jours fériés français, y compris les fériés mobiles
  calculés à partir de Pâques. **Aucune promotion n'est publiée un jour férié ni
  un dimanche.**
- **Moments forts du métier** : rentrée, ménage de printemps, fêtes de fin
  d'année, période de congés.

---

## 5. Architecture

```
automation/
├── config/
│   ├── brand.ts          identité, couleurs, services, règles de ton
│   ├── angles.ts         les 13 angles, délais de réutilisation, poids
│   ├── audiences.ts      les 8 cibles commerciales et leurs enjeux
│   └── platforms.ts      contraintes et registre par réseau
├── prompts/
│   ├── vision.md         analyse des photos
│   └── copywriter.md     rédaction des 4 versions
├── src/
│   ├── index.ts          interface en ligne de commande
│   ├── pipeline.ts       enchaînement complet
│   ├── env.ts            configuration validée par schéma
│   ├── retry.ts          réessais avec attente exponentielle
│   ├── ai/               accès au modèle, analyse photo, rédaction, mode hors ligne
│   ├── planner/          calendrier, choix de l'angle, anti-répétition, créneaux
│   ├── sources/          Google Drive et dossier local
│   ├── image/            gabarit HTML, rendu navigateur, OpenAI
│   ├── publish/          Buffer, écriture des fichiers
│   ├── state/            historique persistant
│   └── notify/           alertes par webhook
├── workflows/            workflows n8n prêts à importer
├── posts/                publications produites + historique
└── assets/               photos téléchargées et visuels générés
```

Les prompts vivent dans des fichiers Markdown plutôt que dans le code : on peut
les relire et les ajuster sans toucher à TypeScript.

### Modifier le contenu

| Vous voulez… | Fichier |
| --- | --- |
| changer le ton, les services, les couleurs | `config/brand.ts` |
| ajouter ou retirer un angle éditorial | `config/angles.ts` |
| ajouter une cible ou changer sa fréquence | `config/audiences.ts` |
| changer la longueur ou le style par réseau | `config/platforms.ts` |
| affiner la rédaction | `prompts/copywriter.md` |
| changer le rythme hebdomadaire ou saisonnier | `src/planner/calendar.ts` |
| redessiner le visuel généré | `src/image/template.ts` |

---

## 6. Fiabilité

- **Réessais** : 3 tentatives par appel réseau, avec attente exponentielle
  (2s, 4s, 8s). Une erreur d'authentification n'est pas réessayée — elle ne se
  résoudra pas toute seule.
- **Panne Drive** : la publication du jour se fait sans photo plutôt que
  d'échouer.
- **Panne OpenAI** : repli automatique sur la carte de marque.
- **Réseau social en échec** : les trois autres sont publiés quand même, et
  l'alerte détaille lequel a échoué.
- **Photo inexploitable** : elle est écartée *et* marquée comme utilisée, sinon
  elle serait reproposée tous les jours et bloquerait la file d'attente.
- **Historique** : écriture atomique (fichier temporaire puis renommage), une
  interruption ne peut pas le corrompre.

---

## 7. Limites connues

À lire avant la mise en production.

- **Les intégrations externes n'ont pas pu être testées en conditions réelles**
  depuis l'environnement de développement, dont l'accès réseau est restreint.
  Google Drive, Buffer, Anthropic et OpenAI sont implémentés d'après leurs API
  respectives, mais la première exécution avec de vraies clés demande une
  vérification. Le pipeline lui-même est vérifié de bout en bout, rendu du
  visuel par un vrai navigateur compris (`MOCK_AI=1`).
- **Canva n'est pas utilisé.** L'API Connect de Canva impose une validation
  d'application côté Canva et n'est pas conçue pour un usage sans interface. Le
  gabarit HTML rendu par navigateur donne un résultat plus fiable, plus rapide
  et gratuit, tout en respectant exactement la charte.
- **8 à 12 hashtags sur LinkedIn** est conforme à votre demande, mais l'usage
  courant sur ce réseau tourne plutôt autour de 3 à 5. Le nombre se règle dans
  `config/platforms.ts`.
- **Aucune modération humaine.** Le modèle a pour consigne de ne jamais inventer
  de chiffre, de client ni de témoignage, mais un système qui publie seul finit
  toujours par produire une formulation malheureuse. Relire `posts/` une fois
  par semaine reste raisonnable — `npm run preview` permet de voir la
  publication du lendemain sans rien envoyer.
- **La détection de tendances** est saisonnière et calendaire. Elle ne consulte
  aucun flux de tendances en direct : cela demanderait une source de données
  externe (API de veille, flux RSS métier) qui reste à choisir.

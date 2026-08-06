# Brand Assets — ProClean Empire

Bibliothèque graphique **permanente** de ProClean Empire.
Toute création — publication Instagram, carrousel, story, présentation Canva, page du site —
pioche ici. Rien ne se réinvente à chaque fois.

> **L'exigence jusque dans les détails.**

---

## La règle en une phrase

> La mascotte officielle est **L'Inspecteur ProClean**, le renard de la planche de référence.
> Son design est **figé**. On n'en crée pas d'autre, on ne le modifie pas, on ne le recolorise pas.
> On réutilise ses poses depuis `mascotte/` et `expressions/`.

---

## Structure

| Dossier | Nom d'origine | Contenu |
|---|---|---|
| [`mascotte/`](mascotte/) | /Mascotte | poses détourées du personnage, PNG transparents |
| [`expressions/`](expressions/) | /Expressions | bustes d'expression : pointe, valide, réfléchit, inspecte, salue… |
| [`composants/`](composants/) | /Composants | icônes, badges, bulles, CTA, fonds — **32 fichiers SVG** |
| [`templates-canva/`](templates-canva/) | /Templates Canva | 8 gabarits, carrousels, publications prêtes |
| [`regles/`](regles/) | /Règles | le guide qui fait autorité |
| [`preview/`](preview/) | — | page de visualisation de la bibliothèque |

*Les noms de dossiers sont en minuscules sans accents ni espaces, pour rester exploitables
par les outils et par le site Next.js. La correspondance avec les noms d'origine est
ci-dessus.*

**Source de vérité machine :** [`brand.tokens.json`](brand.tokens.json) — couleurs, typographie,
formats, règles de placement, rubriques. Tout le reste en découle.

---

## Par où commencer

| Vous voulez… | Lisez |
|---|---|
| Produire une publicité corporate | [`regles/signature-visuelle.md`](regles/signature-visuelle.md) |
| Comprendre les règles de la mascotte | [`regles/charte-mascotte.md`](regles/charte-mascotte.md) |
| Créer une publication | [`templates-canva/formats.md`](templates-canva/formats.md) |
| Créer un carrousel | [`templates-canva/carrousels.md`](templates-canva/carrousels.md) |
| Savoir quoi publier maintenant | [`templates-canva/posts-prets.md`](templates-canva/posts-prets.md) |
| Vérifier avant de publier | [`regles/checklist-publication.md`](regles/checklist-publication.md) |
| Choisir une rubrique | [`regles/rubriques.md`](regles/rubriques.md) |
| Voir la bibliothèque | ouvrir [`preview/index.html`](preview/index.html) dans un navigateur |

---

## Les fondamentaux

**Couleurs** — bleu nuit `#0A1A2F` / `#12294A`, bleu ProClean `#1E6FD8`, gris clair `#E9EEF4`,
blanc. Rien d'autre. Aucun jaune dominant, aucune couleur flashy. Le seul orange autorisé
est celui du pelage du renard.

**Typographie** — Poppins ExtraBold pour les titres, Inter pour le corps. Très grosse,
très lisible. Le texte est un élément graphique, pas une légende.

**Photos** — 60 à 80 % du visuel. Lumière naturelle, blancs propres, beaucoup de vide.
Le renard accompagne la photo, il ne la cache jamais.

**Mascotte** — 10 à 20 % de la surface, jamais le sujet principal, jamais une pose sans
raison, toujours tournée vers l'intérieur du visuel.

**Le test final** — sans le logo, on doit reconnaître ProClean Empire.

---

## ⚠️ État : une action reste à faire

Les dossiers `mascotte/poses/` et `expressions/png/` sont **vides**.

La planche de référence a été transmise en image de conversation ; elle n'existe pas comme
fichier dans le dépôt, et les découpes du personnage ne peuvent donc pas être produites ici.

**À faire, une seule fois :**

1. Déposer la planche source dans `mascotte/PLANCHE-REFERENCE.png`.
2. Produire les PNG détourés listés dans [`mascotte/manifest.json`](mascotte/manifest.json)
   (12 poses) et [`expressions/expressions.json`](expressions/expressions.json) (8 expressions),
   selon les spécifications d'export de [`mascotte/README.md`](mascotte/README.md).
3. Passer les `"statut"` des manifestes de `"à produire"` à `"disponible"`.

Tout le reste de la bibliothèque — règles, tokens, icônes, badges, bulles, CTA, fonds,
gabarits, scripts de publication — est opérationnel dès maintenant.

---

## Point d'arbitrage ouvert

Le site web utilise un accent **doré `#c9a227`** (`tailwind.config.ts`), hors de la palette
définie ici. Deux options : aligner le site sur `#1E6FD8`, ou réserver formellement le doré
au web. En attendant l'arbitrage, **aucun visuel social ni aucune présentation Canva
n'emploie ce doré**.

---

## Faire évoluer la bibliothèque

- Une **nouvelle pose** s'ajoute à `mascotte/manifest.json` avant d'être produite.
- Une **nouvelle couleur** ne s'ajoute pas. La palette est fermée.
- Un **nouveau gabarit** s'ajoute à `templates-canva/gabarits.json` avec ses coordonnées,
  puis à `formats.md`.
- Une **nouvelle icône** respecte la grille 24 / trait 1.75 / arrondi, sinon elle casse le système.
- Toute modification de `brand.tokens.json` implique de mettre à jour `regles/` en conséquence.

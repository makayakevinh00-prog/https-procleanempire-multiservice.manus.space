# /Composants

Briques graphiques réutilisables. **Rien ne se redessine dans Canva** : on importe
depuis ce dossier.

Tous les fichiers sont des **SVG vectoriels**, redimensionnables sans perte,
aux couleurs de la palette.

---

## `icones/` — 15 pictogrammes

Système unique : grille 24, trait seul, épaisseur 1.75, extrémités et jonctions
arrondies, couleur `#1E6FD8`.

| Fichier | Rubrique / usage |
|---|---|
| `inspection.svg` | inspection, mission du jour |
| `validation.svg` | inspection validée, points de contrôle |
| `conseil.svg` | le conseil de l'Inspecteur |
| `proprete.svg` | propreté, résultat |
| `oeil.svg` | l'œil de l'Inspecteur |
| `saviez-vous.svg` | le saviez-vous ? |
| `retour-client.svg` | retour client vérifié, avis |
| `chiffre.svg` | le chiffre de la semaine |
| `vitrerie.svg` | 🪟 Vitrerie |
| `airbnb.svg` | 🛏️ Airbnb |
| `bureau.svg` | 🏢 Bureaux, chez un client |
| `voiture.svg` | 🚘 Detailing |
| `aeronautique.svg` | ✈️ Aéronautique |
| `lumiere.svg` | plus de lumière naturelle |
| `confort.svg` | confort visuel pour vos équipes |

**Règles d'usage**

- Taille minimale d'affichage : **40 px**. En dessous, le trait de 1.75 se casse.
- Couleur : `#1E6FD8` sur fond clair, `#FFFFFF` ou `#4A93F0` sur fond sombre.
- Une icône ne se remplit jamais, ne prend jamais de fond coloré propre,
  ne se combine jamais avec un emoji dans le même visuel.
- **Jamais** d'icône prise dans la bibliothèque Canva : ce sont ces quinze-là
  sur toute la communication.

---

## `badges/` — pastilles

| Fichier | Usage |
|---|---|
| `badge-rubrique-sombre.svg` | surtitre de rubrique sur fond bleu nuit |
| `badge-rubrique-clair.svg` | surtitre de rubrique sur fond clair |
| `badge-avant.svg` / `badge-apres.svg` | mentions sur un avant/après |
| `badge-inspection-validee.svg` | tampon de validation, plein bleu ProClean |
| `badge-numero-slide.svg` | pagination de carrousel `03/07` |

Les badges de rubrique sont livrés avec le libellé « LE CONSEIL DE L'INSPECTEUR » et
l'icône `conseil` : remplacer le texte et le glyphe selon la rubrique
(voir `../regles/rubriques.md`). Hauteur fixe **72 px** à l'échelle 1080.

---

## `bulles/` — prises de parole

| Fichier | Usage |
|---|---|
| `bulle-conseil-gauche.svg` | pointe à droite → l'Inspecteur est **à droite** |
| `bulle-conseil-droite.svg` | pointe à gauche → l'Inspecteur est **à gauche** |
| `bulle-chiffre.svg` | cartouche bleu nuit pour un chiffre isolé |

**La pointe de la bulle vise toujours l'Inspecteur.** Une bulle dont la pointe part
dans le vide est une erreur de montage.

Deux lignes de texte maximum par bulle. La deuxième ligne, en `#7A8BA0`, porte
le renversement (voir le modèle de titre dans `../regles/typographie.md`).

---

## `cta/` — appels à l'action

| Fichier | Usage |
|---|---|
| `cta-primaire.svg` | bouton plein `#1E6FD8` — un seul par visuel |
| `cta-secondaire.svg` | bouton contour blanc, sur fond sombre uniquement |
| `cta-bandeau-final.svg` | bandeau de dernière slide de carrousel, 1080×300 |

**Un seul appel à l'action par publication.** Deux CTA = zéro conversion.
Le CTA n'apparaît jamais sur une slide intérieure de carrousel, seulement sur la dernière.

---

## `fonds/`

| Fichier | Usage |
|---|---|
| `fond-bleu-nuit.svg` | fond principal sombre, halo bleu en haut à droite |
| `fond-clair.svg` | fond clair, dégradé blanc → gris clair |
| `fond-filets.svg` | fond sombre + filets fins, pour les slides de transition |
| `voile-photo.svg` | **à superposer sur une photo** — dégradé de lisibilité |
| `separateur-accent.svg` | filet d'accent, sous un surtitre |

`voile-photo.svg` est le seul traitement de lisibilité autorisé sur photo.
Pas de rectangle noir semi-transparent, pas de flou sous le texte.

---

## Import dans Canva

1. Canva → *Éléments* → *Importer des fichiers* → déposer le dossier `composants/`.
2. Ranger dans un dossier de marque **ProClean Empire — Composants**.
3. Les SVG restent vectoriels : redimensionner sans crainte, mais **ne jamais
   déformer** (toujours redimensionner en conservant les proportions).
4. Les textes intégrés aux SVG (badges, bulles, CTA) ne sont pas éditables après import.
   Pour un texte variable : importer le SVG **sans** son texte et poser un bloc de texte
   Canva par-dessus, réglé selon `../regles/typographie.md`.

## Usage dans le site Next.js

Les icônes sont exploitables directement en composants React. La couleur
`#1E6FD8` est une *attribute* de présentation : elle est surchargeable en CSS
via `stroke: currentColor`.

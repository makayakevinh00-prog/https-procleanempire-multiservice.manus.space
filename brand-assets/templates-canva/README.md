# /Templates Canva

Modèles réutilisables. On ne repart jamais d'une page blanche.

| Fichier | Contenu |
|---|---|
| `formats.md` | les 5 formats et les **8 gabarits**, avec coordonnées exactes |
| `gabarits.json` | les mêmes gabarits en données exploitables |
| `carrousels.md` | structure de carrousel + script complet « 7 erreurs » |
| `posts-prets.md` | 9 publications prêtes à produire, formant une grille cohérente |

## Les 8 gabarits

| | Gabarit | Usage |
|---|---|---|
| **A** | Photo + titre | le plus utilisé — conseil sur photo, rubriques métier |
| **B** | Conseil fond clair | conseil, le saviez-vous |
| **C** | Le chiffre de la semaine | une donnée, seule |
| **D** | Avant / après | validation, detailing, Airbnb |
| **E** | Retour client vérifié | témoignage |
| **F** | Couverture de carrousel | slide 1 |
| **G** | Slide intérieure | slides 2 à n−1 |
| **H** | Slide finale | conclusion + CTA |

## Créer les modèles dans Canva — une seule fois

1. **Kit de marque** → créer *ProClean Empire* → y charger les 8 couleurs de
   `../regles/couleurs.md` et les polices Poppins + Inter.
2. **Importer** le dossier `../composants/` (icônes, badges, bulles, CTA, fonds).
3. **Importer** `../mascotte/poses/` et `../expressions/png/` une fois les PNG produits.
4. Créer **un design par gabarit**, aux dimensions et coordonnées de `formats.md`.
5. Poser des **repères** aux marges (72 px) et sur la zone mascotte.
6. Enregistrer chaque design comme **Modèle de marque**, nommé
   `PCE — Gabarit A — Photo + titre`, etc.
7. Ranger le tout dans un dossier Canva **ProClean Empire — Gabarits**.

## Produire une publication

1. Identifier la **rubrique** (`../regles/rubriques.md`) → elle donne le surtitre,
   l'icône et la pose.
2. Choisir le **gabarit**.
3. Dupliquer le modèle de marque. **Ne jamais modifier le modèle lui-même.**
4. Remplacer photo et texte. Ne pas déplacer les blocs.
5. Poser la mascotte dans son emplacement, à la taille indiquée.
6. Passer `../regles/checklist-publication.md` en entier.

## Ce qu'on ne fait pas dans Canva

- Ajouter une police hors Poppins / Inter
- Prendre une icône dans la bibliothèque Canva
- Ajouter une animation, un effet de texte, une ombre portée sur le texte
- Déplacer un bloc hors de la grille « pour que ça rentre » — si ça ne rentre pas,
  c'est le texte qui est trop long
- Redimensionner la mascotte au-delà de sa taille maximale
- Étirer un élément sans conserver ses proportions

# /Mascotte — L'Inspecteur ProClean

Toutes les **poses détourées** du personnage, en PNG transparent.
C'est la seule source autorisée. On ne génère jamais une nouvelle image du renard
en dehors de ce dossier.

## État actuel

⚠️ **Le dossier `poses/` est vide.** La planche de référence a été transmise en image
de conversation ; elle n'existe pas encore comme fichier dans le dépôt.

**Action requise (une seule fois, par vous) :**

1. Déposer la planche source ici sous le nom **`PLANCHE-REFERENCE.png`**.
2. Produire les découpes listées dans `manifest.json` et les déposer dans `poses/`
   en respectant strictement la convention de nommage.
3. Passer chaque entrée du manifeste de `"statut": "à produire"` à `"statut": "disponible"`.

Tant que ces fichiers ne sont pas là, les gabarits de `templates-canva/` réservent
l'emplacement de la mascotte mais ne peuvent pas l'afficher.

## Convention de nommage

```
inspecteur-{slug}-{cadrage}.png
```

| Cadrage | Signification |
|---|---|
| `silhouette` | corps entier, pieds compris |
| `plan-us` | coupé à mi-cuisse |
| `buste` | poitrine et tête |

Exemples :
```
inspecteur-doigt-pointe-plan-us.png
inspecteur-accroupi-inspection-silhouette.png
inspecteur-gant-blanc-buste.png
```

## Spécifications d'export

| Paramètre | Valeur |
|---|---|
| Format | PNG 32 bits, canal alpha |
| Hauteur source | **2400 px minimum** |
| Espace colorimétrique | sRGB |
| Détourage | net, sans halo, sans liseré blanc |
| Marge transparente | 0 px — le sujet touche les bords du canevas |
| Ombre | aucune ombre incrustée dans le PNG |

L'ombre au sol, quand elle est nécessaire, est ajoutée dans Canva
(`0 20px 40px -20px rgba(10,26,47,.5)`), jamais gravée dans le fichier.

## Contrôle qualité d'un détourage

- [ ] Les poils des oreilles et de la queue ne sont pas rognés au ciseau
- [ ] Aucun pixel blanc résiduel sur le contour du costume bleu nuit
- [ ] Les gants blancs restent distincts du fond transparent
- [ ] Le pin's ProClean au revers est intact
- [ ] Les couleurs officielles sont inchangées (voir `../regles/couleurs.md`)

## Rappel

Le design est **figé**. Ce dossier s'enrichit de nouvelles **poses**,
jamais de nouvelles **versions** du personnage.

Poses interdites : voir `manifest.json` → `poses_interdites`.
Règles complètes : `../regles/charte-mascotte.md`.

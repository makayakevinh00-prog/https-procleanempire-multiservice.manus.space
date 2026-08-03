# Construction des gabarits via l'API Canva

Notes de production issues de la construction réelle du gabarit C.

## Ce qui fonctionne

| Capacité | Détail |
|---|---|
| Pages aux dimensions exactes | 1080 × 1350 respecté |
| Aplats de couleur | rectangle plein-cadre `#0A1A2F`, envoyé à l'arrière-plan |
| Formes vectorielles | tracés SVG posés au pixel près |
| Blocs de texte | position, largeur, taille, couleur, graisse, interlignage, alignement |
| Organisation | dossiers, déplacement des designs |

Un gabarit se reconstruit donc intégralement aux coordonnées de `formats.md`.

## Contraintes à connaître

**1. Les formes en trait seul ne rendent rien.**
Un tracé sans remplissage, même avec `stroke_color` et `stroke_weight`, s'affiche vide.
→ Les icônes doivent exister en **version pleine** pour Canva. Les SVG en trait de
`composants/icones/` restent la référence pour le web et pour l'import manuel.

**2. L'interlettrage n'est pas réglable par l'API.**
Le `+12 %` du surtitre et le `−2 %` des titres doivent être appliqués à la main dans
l'éditeur Canva. Tout le reste de la typographie est automatisable.

**3. Les tracés n'acceptent que `M L H V C S A Z`.**
Pas de `Q` ni de `T`. Les cercles et rectangles doivent être convertis en tracés.

**4. Ordre d'empilement.**
Une forme insérée arrive au premier plan. Un fond plein-cadre doit être suivi
immédiatement d'un `layer_element: back`.

**5. Aucun import de fichier local.**
L'API n'ingère que des URL déjà publiques. Les PNG de la mascotte, les photos et les
SVG des composants se déposent **manuellement** dans Canva.

## Conséquence sur la méthode

L'API construit la **structure** — dimensions, aplats, positions, typographie, formes.
Le dépôt manuel des visuels (mascotte, photos) et le réglage de l'interlettrage se font
dans l'éditeur. C'est un gain réel : la partie fastidieuse et source d'erreurs — les
coordonnées — est automatisée et vérifiable.

## Ce qui a été créé dans le compte

```
ProClean Empire/
├── Gabarits/
│   └── PCE — Gabarit C — Le chiffre de la semaine
├── Mascotte — Inspecteur ProClean/   (à remplir)
├── Composants/                        (à remplir)
└── Photos/                            (à remplir)
```

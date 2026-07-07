# ProClean Empire - Site corporate conversion-first

Site développé avec Next.js, TypeScript, Tailwind CSS et Framer Motion.

## Lancer le projet

```bash
npm install
npm run dev
```

## Objectifs du site

- Positionnement B2B orienté dirigeants, office managers et services généraux.
- Parcours de conversion clair vers la demande de devis.
- SEO technique (metadata, Open Graph, schema.org, sitemap, robots).
- Structure évolutive avec composants réutilisables.

## Gestion des visuels

Le site n'utilise pas encore de photos réelles: chaque emplacement photo affiche
`components/ui/visual-placeholder.tsx`, un encart visuel signalant clairement qu'une
photo doit être ajoutée. Pour remplacer un emplacement par une vraie photo, déposez le
fichier dans `public/media/placeholders/` (ou `public/media/photos/`) et remplacez l'appel
à `<VisualPlaceholder />` par un composant `<Image />` pointant vers ce fichier, dans le
composant ou la page concernée (hero, fiches services, équipe, galerie, réalisations...).

## Données à compléter avant mise en ligne

Les champs suivants contiennent des valeurs placeholder (`[A COMPLETER]`) à remplacer par
les informations réelles de l'entreprise avant publication:

- `lib/content/legal.ts`: capital social, RCS, SIREN, SIRET, EUID, date de début d'activité, directeur de publication.
- `lib/site.ts`: numéro de téléphone et adresse (actuellement des valeurs d'exemple).
- `lib/content/phase1.ts` (`presentationVideo.youtubeUrl`) et `lib/content/phase3.ts` (`videosPageContent.youtubeChannelUrl`): liens YouTube réels.
- `lib/content/phase3.ts` (`socialLinks`): liens vers les réseaux sociaux réels (actuellement `#`).

## Contenu Phase 1 (facilement modifiable)

Toutes les donnees de la homepage conversion (hero, stats, video, avis, engagements, contact)
se trouvent dans:

- `lib/content/phase1.ts`

Composants de rendu Phase 1:

- `components/phase1/home-conversion-phase1.tsx`
- `components/phase1/hero-conversion.tsx`
- `components/phase1/presentation-video-section.tsx`
- `components/phase1/reviews-premium-section.tsx`
- `components/phase1/commitments-section.tsx`
- `components/phase1/contact-phase1-section.tsx`

## Contenu Phase 2 (preuves sociales avancees)

Toutes les donnees des pages realisations / galerie / equipe sont centralisees dans:

- `lib/content/phase2.ts`

Pages:

- `app/realisations/page.tsx`
- `app/galerie/page.tsx`
- `app/equipe/page.tsx`

Composants:

- `components/phase2/case-study-list.tsx`
- `components/phase2/gallery-filter-grid.tsx`
- `components/phase2/team-premium-section.tsx`
- `components/phase2/interactive-process-timeline.tsx`

## Contenu Phase 3 (acquisition long terme)

Donnees centralisees:

- `lib/content/phase3.ts`

Pages:

- `app/videos/page.tsx`
- `app/blog/page.tsx`
- `app/faq/page.tsx` (version recherche + filtres)
- `app/devis/page.tsx` (wizard multi-etapes via composant)

Composants:

- `components/phase3/videos-grid.tsx`
- `components/phase3/social-networks-section.tsx`
- `components/phase3/faq-advanced.tsx`

## Donnees legales (KBIS)

- `lib/content/legal.ts`
- Utilise dans `app/mentions-legales/page.tsx` et `components/layout/footer.tsx`

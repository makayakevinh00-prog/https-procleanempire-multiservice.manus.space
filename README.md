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

Le dossier `public/media/placeholders` contient les emplacements à remplacer par vos photos réelles:

- photo-client
- photo-bureaux
- photo-hotel
- photo-restaurant
- photo-vitrerie
- photo-equipe
- photo-avant-apres

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

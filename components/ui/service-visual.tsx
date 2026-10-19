"use client";

import { useState } from "react";

/**
 * Visuel des pages services : jamais de bloc vide en production.
 * Photo de mission réelle quand elle existe ; sinon illustration clairement légendée.
 * En cas d'échec de chargement, bascule sur l'image de secours.
 */
const FALLBACK = {
  src: "/media/photos/hero-showcase.jpg",
  alt: "Illustration ProClean Empire : espace professionnel entretenu",
  caption: "Illustration"
};

const visuals: Record<string, { src: string; alt: string; caption: string }> = {
  "nettoyage-automobile": {
    src: "/media/photos/interieur-auto-apres.jpeg",
    alt: "Intérieur de véhicule après nettoyage par ProClean Empire",
    caption: "Intervention réelle : intérieur de véhicule après nettoyage"
  },
  "nettoyage-hotels": {
    src: "/media/photos/canape-velours-apres.jpeg",
    alt: "Canapé en velours nettoyé dans un logement d'accueil",
    caption: "Intervention réelle : mobilier textile après nettoyage"
  },
  "nettoyage-commerces": {
    src: "/media/photos/traitement-tapis.jpeg",
    alt: "Traitement d'un tapis professionnel par ProClean Empire",
    caption: "Intervention réelle : traitement d'un tapis"
  },
  "remise-en-etat": {
    src: "/media/photos/traitement-tapis.jpeg",
    alt: "Traitement d'un revêtement textile lors d'une remise en état",
    caption: "Intervention réelle : traitement d'un revêtement textile"
  },
  "apres-chantier": {
    src: "/media/photos/traitement-tapis.jpeg",
    alt: "Nettoyage d'un revêtement textile après chantier",
    caption: "Intervention réelle : traitement d'un revêtement textile"
  },
  "nettoyage-bureaux": {
    src: "/media/photos/hero-showcase.jpg",
    alt: "Illustration : bureaux professionnels entretenus par ProClean Empire",
    caption: "Illustration — photos de missions en bureaux à venir"
  }
};

export function ServiceVisual({ slug }: { slug: string }) {
  const visual = visuals[slug] ?? FALLBACK;
  const [current, setCurrent] = useState(visual);

  return (
    <figure className="overflow-hidden rounded-2xl bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.src}
        alt={current.alt}
        loading="lazy"
        onError={() => current.src !== FALLBACK.src && setCurrent(FALLBACK)}
        className="aspect-[4/5] w-full object-cover"
      />
      <figcaption className="px-4 py-3 text-xs text-slate-500">{current.caption}</figcaption>
    </figure>
  );
}

"use client";

import Image from "next/image";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "@/components/home/reveal";
import { CleanRoomScene } from "@/components/home/clean-room-scene";
import { AirbnbTurnoverScene } from "@/components/home/airbnb-turnover-scene";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import { ReviewsPremiumSection } from "@/components/phase1/reviews-premium-section";
import { siteConfig } from "@/lib/site";

/* ---------- 1. Hero plein écran ---------- */
function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink text-white">
      <motion.div style={{ scale }} className="absolute inset-0">
        {/* Image fixe (plus de vidéo) : l'affiche du hero, plein écran, chargée en priorité. */}
        <Image
          src="/media/photos/hero-showcase.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-5 text-center md:px-8"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-white/80"
        >
          Pontoise · Val-d&apos;Oise · Île-de-France
        </motion.p>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="display-xl max-w-5xl"
          aria-hidden
        >
          Le propre,
          <br />
          version premium.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-6 max-w-3xl"
        >
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            Entreprise de nettoyage à Pontoise et en Île-de-France
          </h1>
          <p className="mt-3 text-lg text-white/85">
            Bureaux, commerces, ménage Airbnb et conciergerie d&apos;entreprise : des espaces prêts à
            accueillir vos équipes, vos clients et vos voyageurs — avec un interlocuteur unique.
          </p>
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link href="/contact#devis" className="btn-pill">
            Recevoir mon devis sous 24 h
          </Link>
          <Link href="#prestations" className="btn-pill-ghost text-white">
            Voir les prestations
          </Link>
        </motion.div>
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mt-5 text-sm text-white/75"
        >
          Sans engagement · Intervention à Pontoise et en Île-de-France
        </motion.p>
      </motion.div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center" aria-hidden>
        <motion.span
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="block h-10 w-6 rounded-full border-2 border-white/60"
        >
          <span className="mx-auto mt-2 block h-2 w-1 rounded-full bg-white/80" />
        </motion.span>
      </div>
    </section>
  );
}

/* ---------- 2. Manifeste ---------- */
function Statement() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1100px] px-5 py-28 md:px-8 md:py-40">
        <Reveal>
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-400 sm:text-4xl md:text-5xl">
            <span className="text-ink">Logements, bureaux, commerces.</span> Chaque espace mérite
            le même soin du détail.{" "}
            <span className="text-[#1d6fe0]">C&apos;est notre métier, depuis Pontoise.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}


/* ---------- 2 bis. Texte de référencement : entreprise de nettoyage ---------- */
function CleaningCompanyText() {
  const linkClass = "font-semibold text-[#1d6fe0] underline-offset-4 hover:underline";
  return (
    <section className="bg-mist" aria-labelledby="entreprise-nettoyage">
      <div className="mx-auto max-w-[900px] px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 id="entreprise-nettoyage" className="display-lg text-ink">
            Votre entreprise de nettoyage dans le Val-d&apos;Oise et à Paris
          </h2>
        </Reveal>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-slate-700">
          <p>
            ProClean Empire est une entreprise de nettoyage installée à Pontoise, au cœur du
            Val-d&apos;Oise. Nous entretenons les bureaux, les commerces, les halls d&apos;immeuble
            et les logements en location courte durée, avec un interlocuteur unique du devis
            jusqu&apos;au suivi des passages. Notre siège est à Pontoise : c&apos;est là que nous
            sommes le plus réactifs, et c&apos;est de là que nous rayonnons sur toute
            l&apos;Île-de-France.
          </p>
          <p>
            Pour les professionnels, nous assurons le{" "}
            <Link href="/nettoyage-bureaux" className={linkClass}>nettoyage de bureaux et de commerces</Link>{" "}
            à la fréquence de votre choix : un passage par semaine, plusieurs passages ou un
            entretien quotidien, tôt le matin ou après la fermeture pour ne pas gêner vos équipes.
            Nous réalisons aussi la remise en état de locaux après travaux, avant une mise en
            location ou à la fin d&apos;un bail, ainsi que l&apos;entretien des vitres et vitrines.
          </p>
          <p>
            Pour les conciergeries et les propriétaires, notre{" "}
            <Link href="/menage-airbnb" className={linkClass}>ménage Airbnb</Link> prépare le
            logement entre deux voyageurs, le jour fixé par vos réservations : lits, salle de bain,
            cuisine, sols, linge et contrôle final avant l&apos;arrivée suivante.
          </p>
          <p>
            Nous intervenons à{" "}
            <Link href="/nettoyage-pontoise" className={linkClass}>Pontoise</Link>, à{" "}
            <Link href="/entreprise-de-nettoyage-cergy" className={linkClass}>Cergy</Link> et dans
            toute l&apos;agglomération (Osny, Saint-Ouen-l&apos;Aumône, Éragny, Herblay), en
            Seine-Saint-Denis et à{" "}
            <Link href="/nettoyage-paris" className={linkClass}>Paris</Link>, dans tous les
            arrondissements. Chaque demande reçoit un devis clair sous 24 heures, sans engagement,
            avant toute intervention. Vous savez ce qui sera fait, quand et à quel prix.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Ménage Airbnb (mis en avant) ---------- */
function AirbnbFeature() {
  const points = [
    "Pour les conciergeries et les propriétaires.",
    "Le jour de ménage, c'est vous qui le fixez.",
    "Passage entre 11h et 14h, entre le départ et l'arrivée.",
    "Chambres, cuisine et salle de bain prêtes pour chaque voyageur."
  ];

  return (
    <section id="prestations" className="scroll-mt-16 overflow-hidden bg-mist">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 px-5 py-28 md:px-8 md:py-36 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fe0]">
              Notre spécialité
            </p>
            <h2 className="display-lg text-ink">Ménage Airbnb.</h2>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              Entre deux voyageurs, un logement qui donne envie de laisser cinq étoiles.
            </p>
          </Reveal>
          <ul className="mt-10 space-y-4">
            {points.map((point, index) => (
              <Reveal as="li" className="flex items-start gap-3 text-lg text-ink" key={point} delay={0.08 * index} y={20}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1d6fe0]" aria-hidden />
                  {point}
                </Reveal>
            ))}
          </ul>
          <Reveal delay={0.3}>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Link href="/menage-airbnb#devis" className="btn-pill">
                Demander un devis pour mon Airbnb
              </Link>
              <Link href="/menage-airbnb" className="btn-pill-ghost text-ink">
                Découvrir le ménage Airbnb
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="relative h-[470px] overflow-hidden rounded-[32px] bg-gradient-to-b from-white to-[#ececf1] ring-1 ring-black/5 shadow-[0_40px_90px_-40px_rgba(10,20,50,0.35)] sm:h-[600px] lg:h-[680px]">
          <AirbnbTurnoverScene />
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Bureaux & commerces + Conciergerie d'entreprise ---------- */
const conciergerieItems = [
  { title: "Entretien", text: "Nettoyage quotidien, équipements, véhicules de société." },
  { title: "Accueil", text: "Livraisons, salles de réunion, petits services." },
  { title: "Logistique", text: "Consommables, réassort et plantes." },
  { title: "Services ponctuels", text: "Décoration des fêtes, remise en état." }
];

function ServicesTiles() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-8 md:py-36">
        <Reveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fe0]">
            Pour les professionnels
          </p>
          <h2 className="display-lg max-w-4xl text-ink">
            Vos locaux propres chaque matin. Le reste, on s&apos;en occupe aussi.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Link
              href="/nettoyage-bureaux"
              className="group relative block h-full min-h-[520px] overflow-hidden rounded-[32px] bg-ink"
            >
              <Image
                src="/media/photos/hero-showcase.webp"
                alt="Espace de bureaux haut de gamme entretenu par ProClean Empire"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover opacity-80 transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-white md:p-10">
                <h3 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Bureaux &amp; commerces.
                </h3>
                <p className="mt-3 max-w-md text-lg text-white/80">
                  Nettoyage quotidien ou hebdomadaire, halls d&apos;immeuble et remises en état,
                  planifiés selon vos horaires.
                </p>
                <span className="mt-5 inline-block text-base font-semibold text-[#8db8ff]">
                  Voir le nettoyage de bureaux &gt;
                </span>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              id="conciergerie-entreprise"
              className="h-full scroll-mt-24 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b1f4d] via-[#123a8a] to-[#1d6fe0] p-8 text-white md:p-12"
            >
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Sur mesure
              </p>
              <h3 className="display-lg">Conciergerie d&apos;entreprise.</h3>
              <p className="mt-5 max-w-2xl text-lg text-white/85 md:text-xl">
                Un seul prestataire pour la gestion complète de vos espaces de travail : vos
                équipes et vos clients trouvent un lieu impeccable, vous n&apos;y pensez plus.
              </p>
              <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                {conciergerieItems.map((item) => (
                  <li key={item.title} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/75">{item.text}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/conciergerie-entreprise"
                  className="inline-flex justify-center rounded-full bg-white px-6 py-3 font-semibold text-[#0b1f4d] transition hover:bg-white/90"
                >
                  Voir tous les services
                </Link>
                <Link href="/conciergerie-entreprise#devis" className="btn-pill-ghost justify-center text-white">
                  Demander un devis conciergerie
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. Galerie (fond sombre) ---------- */
function DetailingStrip() {
  const shots = [
    { src: "/media/photos/airbnb-table-accueil.webp", alt: "Table d'accueil préparée dans un logement Airbnb" },
    { src: "/media/photos/canape-velours-apres.webp", alt: "Canapé en velours après nettoyage" },
    { src: "/media/photos/traitement-tapis.webp", alt: "Traitement d'un tapis professionnel" },
    { src: "/media/photos/interieur-auto-apres.webp", alt: "Véhicule de société après nettoyage intérieur" }
  ];
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-8 md:py-36">
        <Reveal>
          <h2 className="display-lg max-w-3xl">
            Le détail fait <span className="text-[#8db8ff]">toute la différence.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-white/70">
            Logements, locaux, mobilier, véhicules de vos équipes : le même soin partout.
          </p>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {shots.map((shot, index) => (
            <Reveal key={shot.src} delay={0.08 * index}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition duration-700 hover:scale-105"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 5 bis. Notre processus — sticky scroll (inspiré ultra-mastermind) ---------- */
const processStages = [
  {
    number: "01",
    label: "Votre demande",
    title: "Décrivez votre espace\nen 2 minutes.",
    text: "Logement, bureaux ou conciergerie : remplissez le formulaire en ligne. Nous prenons contact dans la journée pour affiner votre besoin.",
    image: "/media/photos/hero-showcase.webp",
    imageAlt: "Espace professionnel lumineux prêt à être entretenu",
  },
  {
    number: "02",
    label: "Devis sous 24 h",
    title: "Un prix clair,\nsans surprise.",
    text: "Vous recevez un devis détaillé, avec visite sur place si nécessaire. Vous validez et nous planifions ensemble chaque passage.",
    image: "/media/photos/airbnb-salon-table-basse.webp",
    imageAlt: "Salon d'un logement Airbnb soigneusement préparé",
  },
  {
    number: "03",
    label: "Notre intervention",
    title: "Nos équipes\nau travail.",
    text: "Produits et matériel professionnels fournis. Intervention selon l'horaire convenu — tôt le matin, le soir ou entre deux voyageurs.",
    image: "/media/photos/traitement-tapis.webp",
    imageAlt: "Traitement professionnel d'un tapis par l'équipe ProClean",
  },
  {
    number: "04",
    label: "Résultat garanti",
    title: "Zéro défaut,\nou on revient.",
    text: "Chaque passage est contrôlé avant que nous partions. Un point à corriger ? Nous revenons sans supplément, sans discussion.",
    image: "/media/photos/airbnb-table-accueil.webp",
    imageAlt: "Table d'accueil impeccablement préparée pour les voyageurs",
  },
];

function ProcessScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [activeIdx, setActiveIdx] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const idx = Math.min(processStages.length - 1, Math.floor(latest * processStages.length));
    setActiveIdx(idx);
  });

  const stage = processStages[activeIdx];

  return (
    <div
      ref={containerRef}
      style={{ height: `${processStages.length * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#06091a] text-white">
        {/* Header bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-7 md:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
            Notre processus
          </p>
          <div className="flex items-center gap-2">
            {processStages.map((_, i) => (
              <motion.span
                key={i}
                className="block h-[3px] rounded-full bg-white"
                animate={{
                  width: i === activeIdx ? 28 : 8,
                  opacity: i === activeIdx ? 1 : 0.25,
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid h-full grid-cols-1 md:grid-cols-2">
          {/* Left: Text */}
          <div className="relative z-10 flex flex-col justify-center px-6 pb-24 pt-20 md:px-12 md:py-24 lg:px-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={reduce ? false : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -20 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-3 font-mono text-5xl font-bold leading-none text-white/[0.07] md:mb-6 md:text-7xl lg:text-8xl">
                  {stage.number}
                </p>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#5b9bff]">
                  {stage.label}
                </p>
                <h2 className="whitespace-pre-line font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl xl:text-6xl">
                  {stage.title}
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55 md:mt-6 md:max-w-md md:text-lg">
                  {stage.text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Mobile : la scène animée */}
            <div className="relative mt-5 h-[252px] overflow-hidden rounded-2xl bg-[#080d22] md:hidden">
              <CleanRoomScene stage={activeIdx} />
            </div>
          </div>

          {/* Droite : scène animée (ordinateur) */}
          <div className="relative hidden overflow-hidden md:block">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,#13224d_0%,#06091a_70%)]" />
            <div className="absolute inset-0 px-4 py-16 lg:px-8">
              <CleanRoomScene stage={activeIdx} />
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#06091a] to-transparent" />
          </div>
        </div>

        {/* Stage counter — bottom right */}
        <div className="absolute bottom-8 right-6 z-20 md:right-12">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeIdx}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-sm font-semibold text-white/25"
            >
              {String(activeIdx + 1).padStart(2, "0")} / {String(processStages.length).padStart(2, "0")}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- 5 ter. Comment ça se passe + FAQ ---------- */
const homeFaq = [
  { question: "Sous quel délai répondez-vous ?", answer: siteConfig.promise },
  { question: "Combien coûte une prestation ?", answer: "Le prix dépend de la surface, de la fréquence et de la prestation. Vous recevez un devis clair sous 24 h, sans engagement." },
  { question: "Fournissez-vous les produits et le matériel ?", answer: "Oui, nous venons avec nos produits et notre matériel professionnels." },
  { question: "Intervenez-vous le week-end ?", answer: "Oui. Les ménages Airbnb suivent vos réservations, et les locaux professionnels peuvent être entretenus tôt le matin, le soir ou le week-end." },
  { question: "Comment gérez-vous les clés et les accès ?", answer: "Boîte à clés, badge, digicode ou remise en main propre : nous nous adaptons à votre organisation." },
  { question: "Quelles zones couvrez-vous ?", answer: "Pontoise, Cergy, Saint-Ouen-l'Aumône et le Val-d'Oise, Paris et l'Île-de-France." },
  { question: "Recevez-vous une facture professionnelle ?", answer: "Oui, avec TVA, et une facture mensuelle unique pour les contrats réguliers." }
];

function HowItWorks() {
  return (
    <section className="bg-mist">
      <div className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
        <div className="mx-auto max-w-[900px]">
          <Reveal>
            <h2 className="display-lg text-ink">Questions fréquentes</h2>
          </Reveal>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {homeFaq.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink">
                  {item.question}
                  <span aria-hidden className="text-2xl text-[#1d6fe0] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Appel final ---------- */
function FinalCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1100px] px-5 py-28 text-center md:px-8 md:py-40">
        <Reveal>
          <h2 className="display-xl text-ink">Parlons de vos espaces.</h2>
          <p className="mx-auto mt-6 max-w-xl text-xl text-slate-600">
            Devis rapide, intervention à Pontoise, dans le Val-d&apos;Oise et partout en
            Île-de-France.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact#devis" className="btn-pill">
              Recevoir mon devis sous 24 h
            </Link>
            <Link href={siteConfig.bookingUrl} className="btn-pill-ghost text-ink">
              Prendre RDV
            </Link>
            <a href={siteConfig.phoneHref} className="btn-pill-ghost text-ink">
              Appeler le {siteConfig.phone}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ImmersiveHome() {
  return (
    <>
      <Hero />
      <Statement />
      <CleaningCompanyText />
      <AirbnbFeature />
      <ServicesTiles />
      <DetailingStrip />
      <ProcessScroll />
      <PartnersMarquee />
      <ReviewsPremiumSection />
      <HowItWorks />
      <FinalCta />
    </>
  );
}

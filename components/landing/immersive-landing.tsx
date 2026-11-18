import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { QuoteForm } from "@/components/forms/quote-form";
import { CountUp, ParallaxPhoto, Statement } from "@/components/landing/motion";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import { commitments } from "@/lib/content/phase1";
import { siteConfig } from "@/lib/site";

const LABEL = "text-[13px] font-semibold uppercase tracking-[0.2em]";
const LINK =
  "inline-flex min-h-11 items-center gap-2 border-b border-current pb-0.5 text-base font-semibold transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

const P = "/media/photos/landing";
/* Enseignes clientes, sous leur nom commercial. */
const clients = [
  { name: "Nike" },
  { name: "Grand Optical" },
  { name: "The French Optical" },
  { name: "Société d'exploitation IDF Recyclage" },
  { name: "Easy Stay" }
];

/** Chapitre plein écran : la photo reste en place pendant que le texte défile à côté. */
function Chapter({
  index,
  label,
  title,
  lead,
  photo,
  flip,
  dark,
  children,
}: {
  index: string;
  label: string;
  title: ReactNode;
  lead: string;
  photo: { src: string; alt: string };
  flip?: boolean;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={dark ? "bg-[#0b1326] text-white" : "bg-white text-ink"}>
      <div className="grid lg:grid-cols-2">
        <div
          className={`lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)] ${flip ? "lg:order-2" : ""}`}
        >
          <ParallaxPhoto
            src={photo.src}
            alt={photo.alt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/5] w-full lg:aspect-auto lg:h-full"
          />
        </div>
        <div className="px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-32 xl:px-24">
          <Reveal>
            <p
              className={`${LABEL} ${dark ? "text-[#8db8ff]" : "text-[#1559bd]"}`}
            >
              <span className="mr-3 tabular-nums opacity-60">{index}</span>
              {label}
            </p>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.04] tracking-tight [text-wrap:balance] sm:text-5xl xl:text-6xl">
              {title}
            </h2>
            <p
              className={`mt-6 max-w-xl text-lg leading-relaxed sm:text-xl ${dark ? "text-slate-300" : "text-slate-700"}`}
            >
              {lead}
            </p>
          </Reveal>
          {children}
        </div>
      </div>
    </section>
  );
}

/** Ligne de fiche : un repère à gauche, sa description à droite, séparés par un filet. */
function Row({
  mark,
  title,
  text,
  dark,
}: {
  mark: string;
  title: string;
  text: string;
  dark?: boolean;
}) {
  return (
    <Reveal
      as="li"
      y={20}
      className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-t py-6 sm:grid-cols-[8rem_minmax(0,1fr)] ${dark ? "border-white/15" : "border-slate-200"}`}
    >
      <span
        className={`font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${dark ? "text-[#8db8ff]" : "text-[#1559bd]"}`}
      >
        {mark}
      </span>
      <span>
        <span className="block font-display text-xl font-semibold tracking-tight">
          {title}
        </span>
        <span
          className={`mt-1.5 block text-base leading-relaxed ${dark ? "text-slate-300" : "text-slate-700"}`}
        >
          {text}
        </span>
      </span>
    </Reveal>
  );
}

const gallery = [
  {
    src: `${P}/table-fleurs.webp`,
    alt: "Table de salle à manger en verre, bouquet et coupe de chocolats pour l'accueil des voyageurs",
    label: "Accueil des voyageurs",
  },
  {
    src: `${P}/chambre-serviettes.webp`,
    alt: "Chambre préparée : lit fait, serviettes roulées sur la couette",
    label: "Chambre et linge",
  },
  {
    src: `${P}/decoration-salon.webp`,
    alt: "Commode blanche, sculpture et tableau dépoussiérés dans un salon",
    label: "Surfaces et décoration",
  },
  {
    src: `${P}/boutique-salon-attente.webp`,
    alt: "Coin d'attente d'une boutique : fauteuils en cuir, table basse et sol propres",
    label: "Accueil d'une boutique",
  },
  {
    src: `${P}/sol-chambre.webp`,
    alt: "Parquet d'une chambre lavé et brillant",
    label: "Sols lavés",
  },
  {
    src: `${P}/noel-cadeaux.webp`,
    alt: "Paquets cadeaux disposés au pied d'un sapin de Noël dans une boutique",
    label: "Décor de Noël",
  },
];

const steps = [
  {
    title: "Vous décrivez le lieu",
    text: "Type de logement ou de locaux, surface, fréquence : deux minutes avec le formulaire.",
  },
  {
    title: "Nous confirmons le prix",
    text: "Un devis clair sous 24 h, avant toute intervention.",
  },
  {
    title: "Nous intervenons",
    text: "Aux dates et aux horaires convenus, avec un contrôle du résultat avant de partir.",
  },
];

const zones = [
  { label: "Pontoise", href: "/nettoyage-pontoise" },
  { label: "Cergy", href: "/nettoyage-cergy" },
  { label: "Paris", href: "/nettoyage-paris" },
  { label: "Saint-Ouen", href: "/nettoyage-saint-ouen" },
  {
    label: "Seine-Saint-Denis",
    href: "/entreprise-de-nettoyage-seine-saint-denis",
  },
];

const others = [
  { label: "Remise en état", href: "/remise-en-etat" },
  { label: "Après chantier", href: "/apres-chantier" },
  { label: "Vitrerie", href: "/nettoyage-vitrerie" },
  { label: "Restaurants", href: "/nettoyage-restaurants" },
  { label: "Hôtels", href: "/nettoyage-hotels" },
  { label: "Conciergerie d'entreprise", href: "/conciergerie-entreprise" },
];

const faq = [
  {
    q: "Intervenez-vous le week-end et les jours fériés ?",
    a: "Oui. Pour un logement Airbnb, le ménage suit vos réservations, quel que soit le jour. Pour des locaux, nous calons les passages tôt le matin, en soirée ou le week-end.",
  },
  {
    q: "Fournissez-vous les produits et le matériel ?",
    a: "Oui, nous venons avec nos produits et notre matériel professionnels.",
  },
  {
    q: "Comment se passe la remise des clés ?",
    a: "Boîte à clés, digicode ou remise en main propre : nous nous adaptons à votre organisation.",
  },
  { q: "Sous quel délai répondez-vous ?", a: siteConfig.promise },
];

const rating = Number(siteConfig.googleRating.value.replace(",", "."));

/** Page d'atterrissage clients, en chapitres : une grande photo, une promesse, les faits. */
export function ImmersiveLanding() {
  return (
    <div className="bg-white">
      {/* OUVERTURE */}
      <section className="bg-[#0b1326] text-white">
        <div className="grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-between gap-12 px-6 pb-12 pt-12 md:px-12 md:pt-16 lg:px-16 lg:pb-16 xl:px-24">
            <p className={`${LABEL} text-slate-300`}>
              Facility service · Val-d&apos;Oise et Paris
            </p>
            <div>
              <h1 className="font-display text-[2.9rem] font-semibold leading-[1] tracking-tight sm:text-7xl xl:text-[5.25rem]">
                <span className="block">Vous ouvrez la porte.</span>
                <span className="block text-[#8db8ff]">Tout est prêt.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                Logements Airbnb, bureaux, commerces : ProClean Empire prend en
                charge la propreté de vos espaces, du premier devis au contrôle
                final.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href="#devis" className="btn-pill min-h-14 px-9 text-lg">
                  Demander un devis
                </a>
                <Link href={siteConfig.bookingUrl} className={`${LINK} self-start sm:ml-4 sm:self-auto`}>
                  Prendre rendez-vous
                </Link>
              </div>
            </div>
            <a
              href={siteConfig.googleReviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center gap-3 text-sm text-slate-300 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex gap-0.5 text-amber-300" aria-hidden>
                {[0, 1, 2, 3, 4].map((star) => (
                  <svg
                    key={star}
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
                  </svg>
                ))}
              </span>
              {siteConfig.googleRating.value}/5 sur{" "}
              {siteConfig.googleRating.count} avis Google
            </a>
          </div>
          <ParallaxPhoto
            src={`${P}/salon-haussmannien.webp`}
            alt="Salon haussmannien rangé et prêt à accueillir des voyageurs"
            priority
            zoom
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/5] w-full lg:aspect-auto lg:h-full"
          />
        </div>
      </section>

      <PartnersMarquee items={clients} />

      {/* CHIFFRES */}
      <section
        className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-24"
        aria-label="Nos repères"
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {[
            {
              value: (
                <>
                  <CountUp to={24} /> h
                </>
              ),
              label: "pour recevoir votre devis",
            },
            {
              value: (
                <>
                  <CountUp to={7} />
                  j/7
                </>
              ),
              label: "pour nous écrire",
            },
            { value: <>11h–14h</>, label: "le créneau entre deux voyageurs" },
            {
              value: (
                <>
                  <CountUp to={rating} decimals={1} />
                  /5
                </>
              ),
              label: `sur ${siteConfig.googleRating.count} avis Google`,
            },
          ].map((item) => (
            <div key={item.label} className="border-t border-ink pt-5">
              <dd className="font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl xl:text-7xl">
                {item.value}
              </dd>
              <dt className="mt-3 text-base text-slate-700">{item.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* PHRASE */}
      <section className="bg-mist">
        <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-12 md:py-36">
          <Statement text="Un seul interlocuteur. Des horaires tenus. Un résultat contrôlé avant de partir." />
        </div>
      </section>

      {/* SUR LE TERRAIN */}
      <section className="bg-[#0b1326] text-white" aria-labelledby="lp-terrain">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-20">
          <Reveal>
            <p className={`${LABEL} text-[#8db8ff]`}>Sur le terrain</p>
            <h2 id="lp-terrain" className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
              Nos équipes, en tenue, chez vous.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Vitrines, étagères, salles de bain : chaque surface est reprise à la main, dans le détail, par une équipe ProClean Empire identifiable.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <Reveal>
              <figure>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image src={`${P}/equipe-vitrine.webp`} alt="Agent ProClean Empire en tenue nettoyant les étagères en verre d'une boutique" fill sizes="(min-width: 1024px) 28vw, 45vw" className="object-cover" />
                </div>
                <figcaption className={`${LABEL} mt-4 text-slate-400`}>Boutique · présentoirs</figcaption>
              </figure>
            </Reveal>
            <Reveal>
              <figure className="lg:mt-16">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image src={`${P}/equipe-salle-de-bain.webp`} alt="Agent ProClean Empire en tenue nettoyant une douche dans un logement" fill sizes="(min-width: 1024px) 28vw, 45vw" className="object-cover object-[50%_35%]" />
                </div>
                <figcaption className={`${LABEL} mt-4 text-slate-400`}>Logement · salle de bain</figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CHAPITRE 1 : AIRBNB */}
      <Chapter
        index="01"
        label="Ménage Airbnb"
        title={<>11h, vos voyageurs partent. 14h, le logement est prêt.</>}
        lead="Pour les propriétaires et les conciergeries : nous préparons le logement entre un départ et une arrivée, avec la même exigence à chaque passage."
        photo={{
          src: `${P}/chambre-serviettes.webp`,
          alt: "Chambre préparée pour l'arrivée des voyageurs : lit fait, serviettes roulées sur la couette",
        }}
      >
        <ul className="mt-12">
          <Row
            mark="Le jour"
            title="C'est vous qui le fixez"
            text="Votre calendrier de réservations fait foi : nous ne déplaçons jamais un ménage, même un lundi ou un week-end."
          />
          <Row
            mark="11h"
            title="Nous entrons dans le logement"
            text="Lits refaits, draps changés, salle de bain désinfectée, cuisine et vaisselle vérifiées."
          />
          <Row
            mark="Puis"
            title="Le détail qui se voit"
            text="Sols aspirés et lavés, consommables contrôlés, coussins et décoration remis en place."
          />
          <Row
            mark="14h"
            title="Tour complet avant de partir"
            text="Vous êtes prévenu au moindre imprévu. Linge de lit et serviettes en option."
          />
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href="#devis" className="btn-pill min-h-12">
            Demander un devis
          </a>
          <Link href="/menage-airbnb" className={`${LINK} text-[#1559bd]`}>
            Tout sur le ménage Airbnb
          </Link>
        </div>
      </Chapter>

      {/* CHAPITRE 2 : BUREAUX ET COMMERCES */}
      <Chapter
        flip
        dark
        index="02"
        label="Bureaux et commerces"
        title={<>Vos équipes arrivent. Nous sommes déjà passés.</>}
        lead="Entretien régulier ou passage ponctuel : nous intervenons en dehors de vos heures d'ouverture pour ne déranger ni vos équipes ni vos clients."
        photo={{
          src: `${P}/boutique-presentoirs.webp`,
          alt: "Présentoirs de lunettes d'une boutique, étagères et vitres nettoyées",
        }}
      >
        <ul className="mt-12">
          <Row
            dark
            mark="Quand"
            title="En dehors de vos horaires"
            text="Tôt le matin, en soirée ou le week-end, selon votre activité."
          />
          <Row
            dark
            mark="Rythme"
            title="La fréquence qui vous convient"
            text="Quotidien, plusieurs fois par semaine, hebdomadaire ou ponctuel."
          />
          <Row
            dark
            mark="Quoi"
            title="Tout ce que vos clients voient"
            text="Sols, surfaces, sanitaires, présentoirs, et la vitrerie si vous le souhaitez."
          />
          <Row
            dark
            mark="Qui"
            title="Un seul interlocuteur"
            text="Pour tous vos sites, de la première visite au suivi des passages."
          />
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href="#devis" className="btn-pill min-h-12">
            Demander un devis
          </a>
          <Link href="/nettoyage-bureaux" className={`${LINK} text-[#8db8ff]`}>
            Tout sur le nettoyage de bureaux
          </Link>
        </div>
      </Chapter>

      {/* PHOTOS */}
      <section
        className="overflow-hidden py-20 md:py-28"
        aria-labelledby="lp-photos"
      >
        <Reveal className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-6 md:px-12">
          <div>
            <p className={`${LABEL} text-[#1559bd]`}>Sur le terrain</p>
            <h2
              id="lp-photos"
              className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-5xl xl:text-6xl"
            >
              Ce que nous laissons derrière nous.
            </h2>
          </div>
          <Link href="/realisations" className={`${LINK} text-[#1559bd]`}>
            Toutes nos réalisations
          </Link>
        </Reveal>
        <ul
          tabIndex={0}
          aria-label="Photos de nos prestations, à faire défiler"
          className="mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-6 px-6 pb-6 [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d6fe0] md:gap-4 md:scroll-px-12 md:px-12"
        >
          {gallery.map((photo, index) => (
            <li
              key={photo.src}
              className="w-[76vw] shrink-0 snap-start sm:w-[400px]"
            >
              <figure>
                <div className="group relative aspect-[3/4] overflow-hidden bg-mist">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 640px) 400px, 76vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <figcaption className="mt-4 flex items-baseline gap-3 text-base font-semibold text-ink">
                  <span className="text-sm tabular-nums text-slate-500">
                    0{index + 1}
                  </span>
                  {photo.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      {/* ENGAGEMENTS */}
      <section className="bg-mist" aria-labelledby="lp-engagements">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <p className={`${LABEL} text-[#1559bd]`}>Nos engagements</p>
            <h2
              id="lp-engagements"
              className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-tight text-ink [text-wrap:balance] sm:text-5xl xl:text-6xl"
            >
              Une organisation, pas une promesse.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-700">
              Derrière chaque passage, il y a une méthode : des protocoles, des
              horaires tenus et un contrôle du résultat.
            </p>
          </Reveal>
          <ol className="grid sm:grid-cols-2 sm:gap-x-10">
            {commitments.map((item, index) => (
              <Reveal
                as="li"
                key={item.title}
                y={20}
                delay={(index % 2) * 0.08}
                className="border-t border-slate-300 py-6"
              >
                <span className="text-sm font-semibold tabular-nums text-[#1559bd]">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-base leading-relaxed text-slate-700">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* CHAPITRE 3 : NOËL */}
      <Chapter
        dark
        index="03"
        label="De saison"
        title={<>Votre boutique en habits de fête.</>}
        lead="Sapin, paquets et mise en scène de votre espace d'accueil : nous construisons le décor avec vous, nous l'installons et nous revenons le retirer après les fêtes."
        photo={{
          src: `${P}/noel-sapin.webp`,
          alt: "Sapin de Noël décoré de boules dorées, bleues et bordeaux à l'entrée d'une boutique, avec des paquets au pied",
        }}
      >
        <ul className="mt-12">
          <Row
            dark
            mark="Nov."
            title="Pose du décor"
            text="Fin novembre ou tout début décembre, sans perturber votre activité."
          />
          <Row
            dark
            mark="Déc."
            title="Un décor qui reste impeccable"
            text="Un contrôle pendant les fêtes."
          />
          <Row
            dark
            mark="Janv."
            title="Dépose et nettoyage"
            text="Nous retirons le décor et remettons les lieux en état."
          />
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href="#devis" className="btn-pill min-h-12">
            Demander un devis
          </a>
          <Link
            href="/blog/decoration-noel-bureaux-commerces-val-doise"
            className={`${LINK} text-[#8db8ff]`}
          >
            Lire notre guide
          </Link>
        </div>
      </Chapter>

      {/* MÉTHODE */}
      <section
        className="mx-auto max-w-[1400px] px-6 py-20 md:px-12 md:py-28"
        aria-labelledby="lp-methode"
      >
        <Reveal>
          <p className={`${LABEL} text-[#1559bd]`}>Comment ça marche</p>
          <h2
            id="lp-methode"
            className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.04] tracking-tight text-ink [text-wrap:balance] sm:text-5xl xl:text-6xl"
          >
            Trois étapes, et vous n&apos;y pensez plus.
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-12">
          {steps.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 0.1}
              y={24}
              className="border-t border-ink pt-6"
            >
              <span
                className="block font-display text-7xl font-semibold tracking-tight text-slate-200 xl:text-8xl"
                aria-hidden
              >
                0{index + 1}
              </span>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-lg leading-relaxed text-slate-700">
                {step.text}
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ZONES ET AUTRES PRESTATIONS */}
      <section className="border-t border-slate-200" aria-labelledby="lp-zones">
        <div className="mx-auto grid max-w-[1400px] gap-14 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className={`${LABEL} text-[#1559bd]`}>Où nous intervenons</p>
            <h2 id="lp-zones" className="sr-only">
              Zones d&apos;intervention
            </h2>
            <ul className="mt-6 font-display text-3xl font-semibold leading-snug tracking-tight text-ink sm:text-4xl">
              {zones.map((zone) => (
                <li key={zone.href} className="border-b border-slate-200">
                  <Link
                    href={zone.href}
                    className="group flex min-h-14 items-center justify-between gap-4 py-3 transition-colors duration-200 hover:text-[#1559bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe0]"
                  >
                    {zone.label}
                    <span
                      aria-hidden
                      className="text-xl text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#1559bd] motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/zones-intervention"
              className={`${LINK} mt-8 text-[#1559bd]`}
            >
              Toutes les zones
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <p className={`${LABEL} text-[#1559bd]`}>Et aussi</p>
            <ul className="mt-6 font-display text-3xl font-semibold leading-snug tracking-tight text-ink sm:text-4xl">
              {others.map((item) => (
                <li key={item.href} className="border-b border-slate-200">
                  <Link
                    href={item.href}
                    className="group flex min-h-14 items-center justify-between gap-4 py-3 transition-colors duration-200 hover:text-[#1559bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe0]"
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className="text-xl text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#1559bd] motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* QUESTIONS */}
      <section className="bg-mist" aria-labelledby="lp-faq">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-20 md:px-12 md:py-28 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <h2
            id="lp-faq"
            className="font-display text-4xl font-semibold leading-[1.04] tracking-tight text-ink sm:text-5xl"
          >
            Questions fréquentes
          </h2>
          <div className="border-b border-slate-300">
            {faq.map((item) => (
              <details key={item.q} className="group border-t border-slate-300">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-xl font-semibold tracking-tight text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 shrink-0 text-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="max-w-2xl pb-6 text-lg leading-relaxed text-slate-700">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* DEVIS */}
      <section id="devis" className="scroll-mt-16" aria-labelledby="lp-devis">
        <div className="bg-[#0b1326] text-white">
          <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-12 md:py-28">
            <Reveal>
              <p className={`${LABEL} text-[#8db8ff]`}>Devis gratuit</p>
              <h2
                id="lp-devis"
                className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-tight [text-wrap:balance] sm:text-7xl"
              >
                Parlons de vos espaces.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                Quelques informations suffisent. {siteConfig.promise}
              </p>
            </Reveal>
          </div>
        </div>
        <div className="mx-auto max-w-[1000px] px-5 py-16 md:px-8 md:py-20">
          <QuoteForm />
        </div>
      </section>
    </div>
  );
}

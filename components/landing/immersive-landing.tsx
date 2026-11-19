import "./landing.css";
import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { QuoteForm } from "@/components/forms/quote-form";
import {
  CountUp,
  FadeIn,
  HorizontalGallery,
  LineRise,
  ParallaxPhoto,
  ScrollBand,
  ScrollProgress,
  Statement,
  TimelineRail,
  type GalleryPhoto
} from "@/components/landing/motion";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import { commitments } from "@/lib/content/phase1";
import { siteConfig } from "@/lib/site";
import { Cta, FOCUS, H2, LABEL, LINK, NAVY, PAPER, SOFT } from "@/components/landing/ui";
import { SeoText } from "@/components/landing/seo-text";
import { ReviewsPremiumSection } from "@/components/phase1/reviews-premium-section";

const P = "/media/photos/landing";
/** En-tête de chapitre : numéro, rubrique, grand titre serif, chapeau. */
function ChapterHead({ index, label, title, lead, dark }: { index: string; label: string; title: ReactNode; lead: string; dark?: boolean }) {
  return (
    <Reveal>
      <p className={`${LABEL} flex items-center gap-4 ${dark ? "text-[#667085]" : "text-slate-600"}`}>
        <span className="lp-serif whitespace-nowrap text-2xl normal-case tracking-normal">
          <em>N° {index}</em>
        </span>
        <span aria-hidden className={`h-px w-10 ${dark ? "bg-[#101828]/30" : "bg-slate-400"}`} />
        {label}
      </p>
      <h2 className={`${H2} mt-8`}>{title}</h2>
      <p className={`mt-8 max-w-xl text-lg leading-relaxed sm:text-xl ${dark ? "text-[#475467]" : "text-slate-700"}`}>{lead}</p>
    </Reveal>
  );
}

/** Étape de frise : l'heure en serif, puis ce qui se passe. */
function Moment({ mark, title, text }: { mark: string; title: string; text: string }) {
  return (
    <Reveal as="li" y={20} className="relative grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-7 pl-8 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:pl-10">
      <span aria-hidden className="absolute left-[-4px] top-[2.6rem] h-[9px] w-[9px] rounded-full bg-[#1e3a6e]" />
      <span className="lp-serif text-3xl sm:text-4xl">
        <em>{mark}</em>
      </span>
      <span>
        <span className="block text-xl font-semibold tracking-tight text-ink">{title}</span>
        <span className="mt-1.5 block text-base leading-relaxed text-slate-700">{text}</span>
      </span>
    </Reveal>
  );
}

/** Fait posé sur fond sombre : un mot-repère en serif, puis l'explication. */
function Fact({ mark, title, text, delay = 0 }: { mark: string; title: string; text: string; delay?: number }) {
  return (
    <Reveal as="li" y={20} delay={delay} className="border-t border-[#101828]/15 py-7">
      <span className="lp-serif block text-3xl text-[#1d6fe0]">
        <em>{mark}</em>
      </span>
      <span className="mt-3 block text-xl font-semibold tracking-tight text-[#101828]">{title}</span>
      <span className="mt-1.5 block text-base leading-relaxed text-[#475467]">{text}</span>
    </Reveal>
  );
}

const gallery: GalleryPhoto[] = [
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
  { label: "Nettoyage automobile", href: "/nettoyage-automobile" },
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

/** Page d'atterrissage clients : une ouverture, trois chapitres, une galerie, un devis. */
export function ImmersiveLanding() {
  return (
    <div className="bg-white text-ink">
      <ScrollProgress />

      {/* OUVERTURE */}
      <section className={`lp-grain ${NAVY} overflow-hidden text-[#101828]`}>
        <div className="mx-auto grid max-w-[1680px] grid-cols-[minmax(0,1fr)] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12">
          <div className="relative z-10 flex flex-col justify-between gap-14 px-6 pb-10 pt-10 md:px-12 lg:col-span-7 lg:row-start-1 lg:pb-12 lg:pt-12">
            <FadeIn className={`${LABEL} flex flex-wrap items-center gap-x-4 gap-y-2 text-[#667085]`}>
              <span>Facility service</span>
              <span aria-hidden className="h-px w-10 bg-[#101828]/30" />
              <span>Val-d&apos;Oise · Paris</span>
            </FadeIn>

            <div>
              <h1 className="lp-serif text-[3.15rem] leading-[0.95] sm:text-7xl lg:whitespace-nowrap lg:text-[clamp(3.25rem,4.7vw,5.75rem)]">
                <LineRise delay={0.1}>Vous ouvrez la porte.</LineRise>
                <LineRise delay={0.24} className="text-[#1d6fe0]">
                  <em>Tout est prêt.</em>
                </LineRise>
              </h1>
              <FadeIn delay={0.55} className="mt-10 grid gap-8 lg:max-w-[34rem]">
                <p className="text-lg leading-relaxed text-[#475467] sm:text-xl">
                  Logements Airbnb, bureaux, commerces : ProClean Empire prend en charge la propreté de vos espaces, du premier devis au contrôle final.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                  <Cta href="#devis">Demander un devis</Cta>
                  <Link href={siteConfig.bookingUrl} className={`${LINK} self-start text-[#101828] focus-visible:outline-[#1e3a6e] sm:self-auto`}>
                    Prendre rendez-vous
                  </Link>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.8} className="flex flex-wrap items-center justify-between gap-4 border-t border-[#101828]/15 pt-6">
              <a
                href={siteConfig.googleReviewsUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex min-h-11 items-center gap-3 text-sm text-[#475467] transition-colors duration-200 hover:text-[#101828] ${FOCUS} focus-visible:outline-[#1e3a6e]`}
              >
                <span className="flex gap-0.5 text-amber-300" aria-hidden>
                  {[0, 1, 2, 3, 4].map((star) => (
                    <svg key={star} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
                    </svg>
                  ))}
                </span>
                {siteConfig.googleRating.value}/5 sur {siteConfig.googleRating.count} avis Google
              </a>
              <span aria-hidden className={`${LABEL} hidden items-center gap-3 text-[#667085] lg:flex`}>
                Défiler
                <span className="h-10 w-px bg-[#101828]/30" />
              </span>
            </FadeIn>
          </div>

          <div className="relative lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <ParallaxPhoto
              src={`${P}/salon-haussmannien.webp`}
              alt="Salon haussmannien rangé et prêt à accueillir des voyageurs"
              priority
              curtain
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="aspect-[4/5] w-full lg:aspect-auto lg:h-full"
            />
          </div>
        </div>
      </section>

      <PartnersMarquee />

      {/* MANIFESTE ET REPÈRES */}
      <section className={PAPER} aria-label="Notre manière de travailler">
        <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-40">
          <div className="grid gap-10 lg:grid-cols-12">
            <p className={`${LABEL} text-slate-600 lg:col-span-3 lg:pt-5`}>Notre manière de travailler</p>
            <Statement
              text="Un seul interlocuteur. Des horaires tenus. Un résultat contrôlé avant de partir."
              className="lp-serif text-[2.5rem] leading-[1.06] text-ink sm:text-6xl lg:col-span-9 xl:text-[5.25rem]"
            />
          </div>
          <dl className="mt-20 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-32 lg:grid-cols-4">
            {[
              { value: <><CountUp to={24} /> h</>, label: "pour recevoir votre devis" },
              { value: <><CountUp to={7} />j/7</>, label: "pour nous écrire" },
              { value: <>11h–14h</>, label: "le créneau entre deux voyageurs" },
              { value: <><CountUp to={rating} decimals={1} />/5</>, label: `sur ${siteConfig.googleRating.count} avis Google` }
            ].map((item) => (
              <div key={item.label} className="border-t border-ink/80 pt-5">
                <dd className="lp-serif text-5xl text-ink sm:text-6xl xl:text-7xl">{item.value}</dd>
                <dt className="mt-3 text-base text-slate-700">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CHAPITRE 1 : AIRBNB */}
      <section className="bg-white">
        <div className="grid lg:grid-cols-2">
          <div className="lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)]">
            <ParallaxPhoto
              curtain
              src={`${P}/chambre-serviettes.webp`}
              alt="Chambre préparée pour l'arrivée des voyageurs : lit fait, serviettes roulées sur la couette"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] w-full lg:aspect-auto lg:h-full"
            />
          </div>
          <div className="px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-36 xl:px-24">
            <ChapterHead
              index="01"
              label="Ménage Airbnb"
              title={<>11h, vos voyageurs partent. <em>14h, le logement est prêt.</em></>}
              lead="Pour les propriétaires et les conciergeries : nous préparons le logement entre un départ et une arrivée, avec la même exigence à chaque passage."
            />
            <TimelineRail className="mt-14">
              <Moment mark="Le jour" title="C'est vous qui le fixez" text="Votre calendrier de réservations fait foi : nous ne déplaçons jamais un ménage, même un lundi ou un week-end." />
              <Moment mark="11h" title="Nous entrons dans le logement" text="Lits refaits, draps changés, salle de bain désinfectée, cuisine et vaisselle vérifiées." />
              <Moment mark="Puis" title="Le détail qui se voit" text="Sols aspirés et lavés, consommables contrôlés, coussins et décoration remis en place." />
              <Moment mark="14h" title="Tour complet avant de partir" text="Vous êtes prévenu au moindre imprévu. Linge de lit et serviettes en option." />
            </TimelineRail>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Cta href="#devis">Demander un devis</Cta>
              <Link href="/menage-airbnb" className={`${LINK} text-ink focus-visible:outline-ink`}>
                Tout sur le ménage Airbnb
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BANDE DE MOTS */}
      <section className={`lp-grain ${SOFT} overflow-hidden py-10 text-[#1e3a6e] md:py-16`} aria-hidden>
        <ScrollBand>
          {[0, 1].map((copy) => (
            <span key={copy} className="lp-serif flex items-center text-[18vw] leading-none lg:text-[11vw]">
              <span className="px-[3vw]">Logements</span>
              <em className="lp-outline px-[3vw]">Bureaux</em>
              <span className="px-[3vw]">Commerces</span>
              <em className="lp-outline px-[3vw]">Vitrines</em>
            </span>
          ))}
        </ScrollBand>
      </section>

      {/* CHAPITRE 2 : BUREAUX ET COMMERCES */}
      <section className={`lp-grain ${NAVY} text-[#101828]`}>
        <div className="mx-auto grid max-w-[1680px] gap-14 px-6 pb-20 pt-10 md:px-12 md:pb-32 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <ChapterHead
              dark
              index="02"
              label="Bureaux et commerces"
              title={<>Vos équipes arrivent. <em>Nous sommes déjà passés.</em></>}
              lead="Entretien régulier ou passage ponctuel : nous intervenons en dehors de vos heures d'ouverture pour ne déranger ni vos équipes ni vos clients."
            />
            <ul className="mt-14 grid sm:grid-cols-2 sm:gap-x-10">
              <Fact mark="Quand" title="En dehors de vos horaires" text="Tôt le matin, en soirée ou le week-end, selon votre activité." />
              <Fact delay={0.08} mark="Rythme" title="La fréquence qui vous convient" text="Quotidien, plusieurs fois par semaine, hebdomadaire ou ponctuel." />
              <Fact mark="Quoi" title="Tout ce que vos clients voient" text="Sols, surfaces, sanitaires, présentoirs, et la vitrerie si vous le souhaitez." />
              <Fact delay={0.08} mark="Qui" title="Un seul interlocuteur" text="Pour tous vos sites, de la première visite au suivi des passages." />
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Cta href="#devis">Demander un devis</Cta>
              <Link href="/nettoyage-bureaux" className={`${LINK} text-[#101828] focus-visible:outline-[#1e3a6e]`}>
                Tout sur le nettoyage de bureaux
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              <ParallaxPhoto
                curtain
                src={`${P}/boutique-presentoirs.webp`}
                alt="Présentoirs de lunettes d'une boutique, étagères et vitres nettoyées"
                sizes="(min-width: 1024px) 32vw, 100vw"
                className="aspect-[3/4] w-full"
              />
              <p className={`${LABEL} mt-4 text-[#667085]`}>Boutique d&apos;optique · présentoirs</p>
            </div>
          </div>
        </div>

        {/* GALERIE */}
        <div className="border-t border-[#101828]/15">
          <HorizontalGallery
            photos={gallery}
            intro={
              <div>
                <p className={`${LABEL} text-[#667085]`}>Sur le terrain</p>
                <h2 className={`${H2} mt-6`}>
                  Ce que nous laissons <em>derrière nous.</em>
                </h2>
                <Link href="/realisations" className={`${LINK} mt-8 text-[#101828] focus-visible:outline-[#1e3a6e]`}>
                  Toutes nos réalisations
                </Link>
              </div>
            }
          />
        </div>
      </section>

      {/* ENGAGEMENTS */}
      <section className={PAPER} aria-labelledby="lp-engagements">
        <div className="mx-auto grid max-w-[1680px] gap-14 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <p className={`${LABEL} text-slate-600`}>Nos engagements</p>
              <h2 id="lp-engagements" className={`${H2} mt-6`}>
                Une organisation, <em>pas une promesse.</em>
              </h2>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-slate-700">
                Derrière chaque passage, il y a une méthode : des protocoles, des horaires tenus et un contrôle du résultat.
              </p>
            </div>
          </Reveal>
          <ol className="lg:col-span-6 lg:col-start-7">
            {commitments.map((item, index) => (
              <Reveal as="li" key={item.title} y={20} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-t border-ink/25 py-8 sm:grid-cols-[5rem_minmax(0,1fr)]">
                <span className="lp-serif text-3xl text-slate-500">
                  <em>{String(index + 1).padStart(2, "0")}</em>
                </span>
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-ink">{item.title}</h3>
                  <p className="mt-2 text-lg leading-relaxed text-slate-700">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* CHAPITRE 3 : NOËL */}
      <section className="bg-white">
        <div className="grid lg:grid-cols-2">
          <div className="px-6 py-16 md:px-12 md:py-24 lg:px-16 lg:py-36 xl:px-24">
            <ChapterHead
              index="03"
              label="De saison"
              title={<>Votre boutique <em>en habits de fête.</em></>}
              lead="Sapin, paquets et mise en scène de votre espace d'accueil : nous construisons le décor avec vous, nous l'installons et nous revenons le retirer après les fêtes."
            />
            <TimelineRail className="mt-14">
              <Moment mark="Nov." title="Pose du décor" text="Fin novembre ou tout début décembre, sans perturber votre activité." />
              <Moment mark="Déc." title="Un décor qui reste impeccable" text="Un contrôle pendant les fêtes." />
              <Moment mark="Janv." title="Dépose et nettoyage" text="Nous retirons le décor et remettons les lieux en état." />
            </TimelineRail>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Cta href="#devis">Demander un devis</Cta>
              <Link href="/blog/decoration-noel-bureaux-commerces-val-doise" className={`${LINK} text-ink focus-visible:outline-ink`}>
                Lire notre guide
              </Link>
            </div>
          </div>
          <div className="max-lg:order-first lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)]">
            <ParallaxPhoto
              curtain
              src={`${P}/noel-sapin.webp`}
              alt="Sapin de Noël décoré de boules dorées, bleues et bordeaux à l'entrée d'une boutique, avec des paquets au pied"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] w-full lg:aspect-auto lg:h-full"
            />
          </div>
        </div>
      </section>

      {/* MÉTHODE */}
      <section className="border-t border-slate-200" aria-labelledby="lp-methode">
        <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-36">
          <Reveal className="grid gap-8 lg:grid-cols-12">
            <p className={`${LABEL} text-slate-600 lg:col-span-3 lg:pt-5`}>Comment ça marche</p>
            <h2 id="lp-methode" className={`${H2} lg:col-span-9`}>
              Trois étapes, <em>et vous n&apos;y pensez plus.</em>
            </h2>
          </Reveal>
          <ol className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-0">
            {steps.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 0.1} y={24} className="border-t border-ink pt-6 lg:border-l lg:border-t-0 lg:border-slate-300 lg:px-10 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
                <span className="lp-serif block text-8xl text-ink xl:text-9xl" aria-hidden>
                  <em>{index + 1}</em>
                </span>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-3 text-lg leading-relaxed text-slate-700">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ZONES ET AUTRES PRESTATIONS */}
      <section className={PAPER} aria-labelledby="lp-zones">
        <div className="mx-auto grid max-w-[1680px] gap-16 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-2 lg:gap-24">
          {[
            { id: "lp-zones", label: "Où nous intervenons", items: zones, more: { href: "/zones-intervention", label: "Toutes les zones" } },
            { id: "lp-autres", label: "Et aussi", items: others, more: null }
          ].map((group, groupIndex) => (
            <Reveal key={group.id} delay={groupIndex * 0.1}>
              <h2 id={group.id} className={`${LABEL} text-slate-600`}>
                {group.label}
              </h2>
              <ul className="lp-serif mt-8 text-4xl leading-tight text-ink sm:text-5xl">
                {group.items.map((item) => (
                  <li key={item.href} className="border-b border-ink/20">
                    <Link
                      href={item.href}
                      className={`group flex min-h-16 items-center justify-between gap-4 py-4 transition-[padding,color] duration-300 hover:pl-3 hover:text-[#1559bd] motion-reduce:transition-none ${FOCUS} focus-visible:outline-[#1d6fe0]`}
                    >
                      {item.label}
                      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#1559bd] motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
              {group.more ? (
                <Link href={group.more.href} className={`${LINK} mt-10 text-ink focus-visible:outline-ink`}>
                  {group.more.label}
                </Link>
              ) : null}
            </Reveal>
          ))}
        </div>
      </section>

      <ReviewsPremiumSection />

      <SeoText />

      {/* QUESTIONS */}
      <section aria-labelledby="lp-faq">
        <div className="mx-auto grid max-w-[1680px] gap-12 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-10">
          <h2 id="lp-faq" className={`${H2} lg:col-span-5`}>
            Questions <em>fréquentes</em>
          </h2>
          <div className="border-b border-ink/25 lg:col-span-6 lg:col-start-7">
            {faq.map((item) => (
              <details key={item.q} className="group border-t border-ink/25">
                <summary className={`flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-6 text-xl font-semibold tracking-tight text-ink sm:text-2xl [&::-webkit-details-marker]:hidden ${FOCUS} focus-visible:outline-[#1d6fe0]`}>
                  {item.q}
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="max-w-2xl pb-8 text-lg leading-relaxed text-slate-700">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* DEVIS */}
      <section id="devis" className="scroll-mt-16" aria-labelledby="lp-devis">
        <div className={`lp-grain ${SOFT} text-[#101828]`}>
          <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-40">
            <Reveal>
              <p className={`${LABEL} text-[#667085]`}>Devis gratuit</p>
              <h2 id="lp-devis" className="lp-serif mt-8 text-[3.4rem] leading-[0.95] sm:text-8xl xl:text-[10rem]">
                Parlons de <em className="text-[#1d6fe0]">vos espaces.</em>
              </h2>
              <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[#475467] sm:text-xl">Quelques informations suffisent. {siteConfig.promise}</p>
            </Reveal>
          </div>
        </div>
        <div className="mx-auto max-w-[1000px] px-5 py-16 md:px-8 md:py-24">
          <QuoteForm />
        </div>
      </section>
    </div>
  );
}

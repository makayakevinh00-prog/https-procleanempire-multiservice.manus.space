import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { CockpitPreview } from "@/components/empire-os/cockpit-preview";
import { WaitlistForm } from "@/components/empire-os/waitlist-form";

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1d6fe0]/10 text-[#1559bd]">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

const flow = [
  { step: "Demande", text: "Le formulaire du site crée la fiche et le suivi." },
  { step: "Devis", text: "Chiffré depuis votre catalogue, envoyé en PDF." },
  { step: "Mission", text: "Planifiée, attribuée, validée après passage." },
  { step: "Facture", text: "Préparée depuis le planning, validée par vous." },
  { step: "Paiement", text: "Rapproché avec la banque, relancé si besoin." },
];

const features = [
  {
    title: "Un cockpit, pas un tableur",
    text: "L'objectif du mois, le programme de la semaine et ce qui demande une action. Vous ouvrez, vous savez où agir.",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 12l4-3M12 7v1.5" />
      </>
    ),
    wide: true,
  },
  {
    title: "Demandes du site, sans ressaisie",
    text: "Chaque demande de devis arrive directement dans l'outil. Le client suit l'avancement avec son lien.",
    icon: (
      <>
        <path d="M4 6h16v10H8l-4 4V6z" />
        <path d="M8 10h8M8 13h5" />
      </>
    ),
  },
  {
    title: "Planning et missions",
    text: "Contrats récurrents, passages ponctuels, équipe : un seul planning, des missions validées en un clic.",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M3.5 10h17M8 14.5l2 2 4-4" />
      </>
    ),
  },
  {
    title: "Aucune facture sans votre validation",
    text: "Les factures naissent du planning et restent en brouillon tant que vous ne les avez pas validées. Numérotation sans trou.",
    icon: (
      <>
        <path d="M7 3.5h10v17l-2.5-1.5L12 20.5 9.5 19 7 20.5v-17z" />
        <path d="M10 8.5h4M10 12h4" />
      </>
    ),
  },
  {
    title: "Paiements rapprochés",
    text: "Les virements certains sont pointés automatiquement avec la banque. Les autres vous sont proposés pour confirmation.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14.5h3" />
      </>
    ),
  },
  {
    title: "Relances avec garde-fous",
    text: "Pas de relance en double, pas de relance sur un client que vous gérez en direct. Vous fixez les règles.",
    icon: (
      <>
        <path d="M12 3.5l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9v-5l7-3z" />
        <path d="M9 12l2.2 2.2L15 10.5" />
      </>
    ),
  },
  {
    title: "Catalogue et marges",
    text: "Vos prestations, leur prix, leur coût et leur marge. Vous voyez ce qui rapporte avant de signer.",
    icon: (
      <>
        <path d="M4 19.5h16M7 16V11M12 16V6M17 16v-7" />
      </>
    ),
    wide: true,
  },
];

const audiences = [
  {
    title: "Entreprises de nettoyage",
    text: "Bureaux, commerces, contrats récurrents : planning, facturation mensuelle et suivi des encaissements au même endroit.",
  },
  {
    title: "Conciergeries",
    text: "Ménages entre deux voyageurs facturés au passage, un suivi par logement et par propriétaire.",
  },
  {
    title: "Indépendants multiservices",
    text: "Devis, missions et factures sans y passer vos soirées. L'outil garde la mémoire, vous gardez la main.",
  },
];

const faq = [
  {
    q: "Quand Empire OS sera-t-il ouvert ?",
    a: "Aucune date n'est annoncée. L'outil fait tourner ProClean Empire au quotidien ; nous l'ouvrons à d'autres entreprises par étapes. Les inscrits à la liste d'attente sont prévenus en premier.",
  },
  {
    q: "Combien ça coûtera ?",
    a: "Les tarifs seront communiqués à l'ouverture. S'inscrire à la liste d'attente ne vous engage à rien.",
  },
  {
    q: "Faut-il changer de banque ou d'outil de facturation ?",
    a: "Empire OS fait les devis et les factures lui-même. Le rapprochement bancaire automatique fonctionne aujourd'hui avec Qonto ; avec une autre banque, les paiements se pointent à la main.",
  },
  {
    q: "Qui développe Empire OS ?",
    a: "ProClean Empire, entreprise de nettoyage à Pontoise. Chaque fonction existe parce qu'elle a servi sur un vrai chantier, un vrai devis ou une vraie facture.",
  },
];

export function EmpireOsLanding() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#0b1326] text-white">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[#1d6fe0]/25 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        </div>
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-slate-100">
              <span
                className="h-2 w-2 rounded-full bg-emerald-400"
                aria-hidden
              />
              Empire OS · Accès anticipé
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight [text-wrap:balance] sm:text-5xl lg:text-6xl">
              Votre entreprise de nettoyage, pilotée depuis un seul écran.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-200">
              Demandes, devis, planning, factures et paiements dans un même
              outil. Conçu sur le terrain par ProClean Empire, qui s&apos;en
              sert tous les jours.
            </p>
            <div
              id="liste-attente"
              className="mt-8 max-w-xl scroll-mt-24 rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-xl sm:p-6"
            >
              <WaitlistForm source="hero" />
            </div>
          </div>
          <CockpitPreview />
        </div>
      </section>

      {/* FLUX */}
      <section className="section" aria-labelledby="eos-flux">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#1559bd]">
            Une seule chaîne
          </p>
          <h2
            id="eos-flux"
            className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl md:text-5xl"
          >
            De la demande au paiement, sans rien ressaisir.
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {flow.map((item, index) => (
            <Reveal
              as="li"
              key={item.step}
              delay={index * 0.06}
              y={24}
              className="relative rounded-2xl border border-slate-200 bg-mist p-5"
            >
              <span className="font-display text-sm font-semibold tabular-nums text-[#1559bd]">
                0{index + 1}
              </span>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                {item.step}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-slate-700">
                {item.text}
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* FONCTIONS */}
      <section className="bg-mist" aria-labelledby="eos-fonctions">
        <div className="section">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#1559bd]">
              Ce que fait l&apos;outil
            </p>
            <h2
              id="eos-fonctions"
              className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl md:text-5xl"
            >
              Tout ce qui vous fait perdre du temps, rangé au même endroit.
            </h2>
          </Reveal>
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal
                as="li"
                key={feature.title}
                delay={(index % 3) * 0.06}
                y={24}
                className={`rounded-3xl border border-white bg-white/80 p-6 shadow-soft backdrop-blur transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                  feature.wide ? "lg:col-span-2" : ""
                }`}
              >
                <Icon>{feature.icon}</Icon>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-700">
                  {feature.text}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ORIGINE */}
      <section className="section" aria-labelledby="eos-origine">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#1559bd]">
              Né sur le terrain
            </p>
            <h2
              id="eos-origine"
              className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl md:text-5xl"
            >
              Construit par une entreprise de nettoyage, pas par un éditeur.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-700">
              Empire OS est l&apos;outil interne de ProClean Empire. Il gère nos
              demandes, nos contrats, nos passages et nos factures. Nous
              l&apos;avons écrit parce que les logiciels généralistes ne parlent
              ni de passages, ni de contrats récurrents, ni de ménages entre
              deux voyageurs.
            </p>
            <Link
              href="/a-propos"
              className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#1559bd] underline-offset-4 hover:underline"
            >
              Découvrir ProClean Empire ›
            </Link>
          </Reveal>
          <ul className="grid gap-4">
            {audiences.map((audience, index) => (
              <Reveal
                as="li"
                key={audience.title}
                delay={index * 0.08}
                y={24}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <h3 className="font-display text-xl font-semibold text-ink">
                  {audience.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">
                  {audience.text}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-mist" aria-labelledby="eos-faq">
        <div className="section max-w-3xl">
          <h2
            id="eos-faq"
            className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Questions fréquentes
          </h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
            {faq.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-base leading-relaxed text-slate-700">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className="relative isolate overflow-hidden bg-[#0b1326] text-white"
        aria-labelledby="eos-cta"
      >
        <div
          aria-hidden
          className="absolute -bottom-40 left-1/2 -z-10 h-[30rem] w-[50rem] -translate-x-1/2 rounded-full bg-[#1d6fe0]/25 blur-[120px]"
        />
        <div className="section grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2
              id="eos-cta"
              className="font-display text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl md:text-5xl"
            >
              Soyez prévenu à l&apos;ouverture.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-200">
              Laissez votre e-mail. Vous recevrez un seul message, le jour où
              les premiers accès ouvrent.
            </p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-xl sm:p-6">
            <WaitlistForm source="bas-de-page" />
          </div>
        </div>
      </section>
    </div>
  );
}

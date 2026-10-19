import { buildMetadata, siteConfig } from "@/lib/site";
import { QuoteForm } from "@/components/forms/quote-form";
import { Reveal } from "@/components/home/reveal";

export const metadata = buildMetadata({
  title: "Contact, rendez-vous et devis — Pontoise et Île-de-France",
  description:
    "Prenez rendez-vous, demandez un devis ou appelez ProClean Empire : ménage Airbnb, nettoyage de bureaux et commerces, conciergerie d'entreprise à Pontoise et en Île-de-France.",
  path: "/contact"
});

// Types de rendez-vous : demande par WhatsApp (message pré-rempli) ou par téléphone.
const appointmentTypes = [
  {
    title: "Appel découverte",
    duration: "20 min",
    place: "Par téléphone",
    text: "Vous nous expliquez votre besoin, nous vous disons comment nous pouvons aider."
  },
  {
    title: "Visite d'évaluation sur place",
    duration: "45 min",
    place: "À votre adresse (Île-de-France)",
    text: "Nous visitons le logement ou les locaux pour chiffrer précisément."
  },
  {
    title: "Devis nettoyage de bureaux",
    duration: "45 min",
    place: "Dans vos locaux (Île-de-France)",
    text: "Surfaces, fréquence, horaires : nous construisons ensemble votre contrat."
  },
  {
    title: "État des lieux – remise en état / fin de chantier",
    duration: "60 min",
    place: "Sur le chantier ou le logement",
    text: "Nous évaluons le travail à prévoir avant une remise en état complète."
  }
];

export default function ContactPage() {
  const quickActions = [
    {
      href: "#devis",
      label: "Je veux un devis",
      text: "Réponse sous 24 h.",
      primary: true,
      external: false
    },
    {
      href: siteConfig.phoneHref,
      label: "Je veux parler à quelqu'un",
      text: `Appelez-nous au ${siteConfig.phone}.`,
      primary: false,
      external: false
    },
    {
      href: siteConfig.whatsappHref,
      label: "Je préfère WhatsApp",
      text: "Réponse pendant les horaires de traitement (7j/7, 8h–18h).",
      primary: false,
      external: true
    }
  ];

  return (
    <>
      {/* 1. Choix immédiat */}
      <section className="bg-mist">
        <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1559bd]">
              Contact
            </p>
            <h1 className="display-xl text-ink">Parlons de votre projet.</h1>
            <p className="mt-6 max-w-2xl text-xl text-slate-600">
              Choisissez ce qui vous convient. Nous intervenons à Pontoise, dans le
              Val-d&apos;Oise et partout en Île-de-France.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {quickActions.map((action, index) => (
              <Reveal key={action.label} delay={0.08 * index} y={20}>
                <a
                  href={action.href}
                  {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={`group flex h-full flex-col justify-between rounded-[28px] p-7 transition hover:-translate-y-1 ${
                    action.primary
                      ? "bg-[#1d6fe0] text-white shadow-[0_20px_40px_-20px_rgba(29,111,224,0.8)]"
                      : "bg-white text-ink shadow-soft"
                  }`}
                >
                  <span className="font-display text-2xl font-semibold tracking-tight">
                    {action.label}
                  </span>
                  <span
                    className={`mt-6 flex items-center justify-between text-base ${
                      action.primary ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {action.text}
                    <span aria-hidden className="text-2xl transition group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Par téléphone :{" "}
            <a href={siteConfig.phoneHref} className="font-semibold text-[#1d6fe0]">
              {siteConfig.phone}
            </a>{" "}
            · {siteConfig.email} · {siteConfig.hours}
          </p>
        </div>
      </section>

      {/* 2. Rendez-vous */}
      <section id="rdv" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="display-lg text-ink">Prendre rendez-vous.</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              {siteConfig.onlineBookingUrl
                ? "Réservez directement un créneau en ligne, ou écrivez-nous sur WhatsApp et nous fixons le créneau ensemble."
                : "Choisissez le type de rendez-vous : écrivez-nous sur WhatsApp ou appelez-nous, et nous fixons le créneau ensemble."}
            </p>
            {siteConfig.onlineBookingUrl ? (
              <a href={siteConfig.onlineBookingUrl} target="_blank" rel="noopener noreferrer" className="btn-pill mt-8 inline-flex">
                Réserver un créneau en ligne
              </a>
            ) : null}
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {appointmentTypes.map((type, index) => (
              <Reveal key={type.title} delay={0.06 * index} y={20}>
                <article className="flex h-full flex-col rounded-[28px] border border-slate-200 p-7">
                  <p className="text-sm font-medium text-[#1d6fe0]">
                    {type.duration} · {type.place}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
                    {type.title}
                  </h3>
                  <p className="mt-3 flex-1 text-slate-600">{type.text}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href={`${siteConfig.whatsappHref}?text=${encodeURIComponent(
                        `Bonjour, je souhaite prendre rendez-vous : ${type.title} (${type.duration}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pill"
                      aria-label={`Demander un rendez-vous « ${type.title} » sur WhatsApp`}
                    >
                      Demander un créneau
                    </a>
                    <a href={siteConfig.phoneHref} className="text-sm font-semibold text-[#1d6fe0]">
                      ou {siteConfig.phone}
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Devis */}
      <section id="devis" className="scroll-mt-16 bg-mist">
        <div className="mx-auto max-w-[1000px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="display-lg text-ink">Demander un devis.</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Quelques informations suffisent. {siteConfig.promise}
            </p>
          </Reveal>
          <div className="mt-10">
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}

import "@/components/landing/landing.css";
import { H2, LABEL } from "@/components/landing/ui";
import { buildMetadata, siteConfig } from "@/lib/site";
import { QuoteForm } from "@/components/forms/quote-form";
import { Reveal } from "@/components/home/reveal";

export const metadata = buildMetadata({
  title: "Contact, rendez-vous et devis — Pontoise et Île-de-France",
  description:
    "Prenez rendez-vous, demandez un devis ou écrivez à ProClean Empire : nettoyage de bureaux et commerces, conciergerie d'entreprise à Pontoise et en Île-de-France, ménage Airbnb à Paris.",
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
      href: siteConfig.bookingUrl,
      label: "Je veux parler à quelqu'un",
      text: "Réservez un échange avec nous.",
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
      <section className="bg-[#f0f4fc]">
        <div className="mx-auto max-w-[1680px] px-6 pb-24 pt-16 md:px-12 md:pb-36 md:pt-28">
          <Reveal>
            <p className={`${LABEL} mb-8 text-slate-600`}>
              Contact
            </p>
            <h1 className="lp-serif text-[3.15rem] leading-[0.95] text-ink sm:text-8xl xl:text-[8.5rem]">
              Parlons de <em>votre projet.</em>
            </h1>
            <p className="mt-10 max-w-2xl text-xl leading-relaxed text-slate-700">
              Choisissez ce qui vous convient. Nous intervenons à Pontoise, dans le
              Val-d&apos;Oise et partout en Île-de-France.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {quickActions.map((action, index) => (
              <Reveal key={action.label} delay={0.08 * index} y={20}>
                <a
                  href={action.href}
                  {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={`group flex h-full min-h-56 flex-col justify-between p-8 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d6fe0] ${
                    action.primary
                      ? "bg-[#1e3a6e] text-white hover:bg-[#17305c]"
                      : "bg-white text-ink hover:bg-[#fbfaf7]"
                  }`}
                >
                  <span className="lp-serif text-4xl leading-tight">
                    {action.label}
                  </span>
                  <span
                    className={`mt-6 flex items-center justify-between text-base ${
                      action.primary ? "text-slate-300" : "text-slate-700"
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
          <p className="mt-8 text-sm text-slate-700">
            {siteConfig.email} · {siteConfig.hours}
          </p>
        </div>
      </section>

      {/* 2. Rendez-vous */}
      <section id="rdv" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-36">
          <Reveal>
            <h2 className={H2}>
              Prendre <em>rendez-vous.</em>
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-700">
              {siteConfig.onlineBookingUrl
                ? "Réservez directement un créneau en ligne, ou écrivez-nous sur WhatsApp et nous fixons le créneau ensemble."
                : "Choisissez le type de rendez-vous : écrivez-nous sur WhatsApp ou par e-mail, et nous fixons le créneau ensemble."}
            </p>
            {siteConfig.onlineBookingUrl ? (
              <a href={siteConfig.onlineBookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-[#1e3a6e] px-6 text-base font-semibold text-white transition-colors hover:bg-[#17305c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a6e] mt-8">
                Réserver un créneau en ligne
              </a>
            ) : null}
          </Reveal>
          <div className="mt-16 grid gap-x-16 md:grid-cols-2">
            {appointmentTypes.map((type, index) => (
              <Reveal key={type.title} delay={0.06 * index} y={20}>
                <article className="flex h-full flex-col border-t border-ink/25 py-9">
                  <p className={`${LABEL} text-slate-600`}>
                    {type.duration} · {type.place}
                  </p>
                  <h3 className="lp-serif mt-4 text-4xl leading-tight text-ink">
                    {type.title}
                  </h3>
                  <p className="mt-4 flex-1 text-lg leading-relaxed text-slate-700">{type.text}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href={`${siteConfig.whatsappHref}?text=${encodeURIComponent(
                        `Bonjour, je souhaite prendre rendez-vous : ${type.title} (${type.duration}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center rounded-full bg-[#1e3a6e] px-6 text-base font-semibold text-white transition-colors hover:bg-[#17305c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a6e]"
                      aria-label={`Demander un rendez-vous « ${type.title} » sur WhatsApp`}
                    >
                      Demander un créneau
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Devis */}
      <section id="devis" className="scroll-mt-16 bg-[#f0f4fc]">
        <div className="mx-auto max-w-[1000px] px-5 py-24 md:px-8 md:py-36">
          <Reveal>
            <h2 className={H2}>
              Demander <em>un devis.</em>
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-700">
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

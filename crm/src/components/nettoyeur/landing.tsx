import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  ChevronDown,
  Clock,
  Home,
  MapPin,
  Search,
  Smartphone,
  User,
  Wallet,
  Zap,
} from "lucide-react";

const CTA =
  "flex min-h-14 items-center justify-center rounded-2xl bg-[var(--a-pri)] px-6 text-lg font-extrabold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--a-pri)]";
const CTA_GHOST =
  "flex min-h-12 items-center justify-center rounded-2xl border border-[var(--a-pri)] px-6 text-base font-extrabold text-[var(--a-pri)] transition-colors duration-200 hover:bg-[var(--a-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--a-pri)]";
const EYEBROW =
  "text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-pri)]";
const H2 =
  "mt-2 text-[28px] font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-[36px]";

const benefits = [
  {
    icon: MapPin,
    title: "Votre rayon, votre choix",
    text: "Vous fixez jusqu'où vous acceptez de vous déplacer. Chaque demande affiche la distance.",
  },
  {
    icon: Zap,
    title: "Le premier qui accepte l'obtient",
    text: "Les demandes arrivent en direct sur votre téléphone. Un geste pour accepter, un autre pour passer.",
  },
  {
    icon: Banknote,
    title: "Votre gain affiché avant",
    text: "Le montant qui vous revient est écrit sur la demande. Vous décidez en connaissant le prix.",
  },
];

const steps = [
  {
    title: "Créez votre compte",
    text: "Quelques minutes suffisent. Votre SIRET est contrôlé automatiquement dans l'annuaire officiel.",
  },
  {
    title: "Passez en ligne",
    text: "Appuyez sur GO. Les ménages Airbnb de votre zone apparaissent, avec le créneau et la durée.",
  },
  {
    title: "Acceptez et intervenez",
    text: "L'adresse exacte et les consignes s'affichent dès que vous avez accepté.",
  },
  {
    title: "Soyez payé par virement",
    text: "Chaque ménage est validé par la direction, puis payé en début de semaine ou en fin de mois.",
  },
];

const profiles = [
  {
    title: "Étudiant(e)",
    text: "Pas encore de statut ? Créez votre compte, nous vous guidons pour ouvrir votre auto-entreprise.",
  },
  {
    title: "Auto-entrepreneur",
    text: "Complétez votre planning avec des ménages proches de chez vous, quand vous le décidez.",
  },
  {
    title: "Entreprise",
    text: "Recevez des demandes supplémentaires dans votre secteur, sans prospection.",
  },
];

const faq = [
  {
    q: "Combien vais-je gagner ?",
    a: "Cela dépend de chaque ménage. Votre part est affichée sur la demande avant que vous acceptiez, et vous retrouvez le total dans l'onglet Gains.",
  },
  {
    q: "Quand suis-je payé ?",
    a: "Par virement, après validation de chaque ménage par la direction : au début de chaque semaine ou en fin de mois. Ajoutez votre IBAN dans votre profil.",
  },
  {
    q: "Je n'ai pas encore de SIRET.",
    a: "Créez votre compte quand même en laissant le champ vide. Nous vous guidons pour créer votre entreprise, et votre compte s'active dès que vous saisissez votre SIRET.",
  },
  {
    q: "Suis-je obligé d'accepter les demandes ?",
    a: "Non. Vous acceptez celles qui vous conviennent et vous passez les autres. Vous vous mettez en ligne quand vous voulez.",
  },
  {
    q: "Faut-il télécharger une application ?",
    a: "Non. Elle s'ouvre dans le navigateur de votre téléphone et peut s'ajouter à l'écran d'accueil comme une application.",
  },
];

/** Aperçu illustratif de l'écran « Aujourd'hui » : mêmes éléments que l'application, valeurs d'exemple. */
function PhonePreview() {
  return (
    <figure className="mx-auto w-full max-w-[320px]">
      <div
        role="img"
        aria-label="Aperçu de l'application : le bouton En ligne, une demande de ménage Airbnb avec la ville, la distance, le créneau et le gain, puis les boutons Passer et J'accepte. Valeurs d'exemple."
        className="rounded-[2.5rem] border border-[var(--a-line)] bg-[var(--a-ink)] p-2.5 shadow-[0_30px_60px_-25px_rgba(16,24,40,0.45)]"
      >
        <div
          aria-hidden
          className="overflow-hidden rounded-[2rem] bg-[var(--a-bg)] px-3.5 pb-3 pt-5"
        >
          <p className="text-[20px] font-extrabold tracking-tight">
            Bonjour, Sarah
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-[var(--a-okbg)] px-3.5 py-3">
            <span className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--a-ok)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--a-ok)] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--a-ok)]" />
              </span>
              En ligne
            </span>
            <span className="text-[12px] font-bold text-[var(--a-mute)]">
              Rayon 15 km
            </span>
          </div>
          <p className="mb-2 mt-4 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]">
            Nouvelle demande
          </p>
          <div className="space-y-3 rounded-3xl bg-[var(--a-card)] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[16px] font-extrabold leading-snug">
                  Ménage Airbnb · T2
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--a-mute)]">
                  <MapPin className="h-3.5 w-3.5" />
                  Cergy 95000 · à 3,2 km
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--a-mute)]">
                  <Clock className="h-3.5 w-3.5" />
                  11h – 14h · environ 2 h
                </div>
              </div>
              <div className="shrink-0 whitespace-nowrap text-right">
                <div className="num text-[22px] font-extrabold leading-none text-[var(--a-ok)]">
                  45 €
                </div>
                <div className="text-[11px] text-[var(--a-mute)]">
                  pour vous
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <span className="flex h-11 items-center justify-center rounded-2xl border border-[var(--a-line)] text-[14px] font-extrabold text-[var(--a-mute)]">
                Passer
              </span>
              <span className="flex h-11 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-[15px] font-extrabold text-white">
                J&apos;accepte
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-full border border-[var(--a-line)] bg-[var(--a-dock)] p-1.5">
            {[
              { label: "Aujourd'hui", icon: Home, on: true },
              { label: "Demandes", icon: Search, on: false },
              { label: "Gains", icon: Wallet, on: false },
              { label: "Profil", icon: User, on: false },
            ].map(({ label, icon: Icon, on }) => (
              <span
                key={label}
                className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[9px] font-bold ${on ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "text-[var(--a-mute)]"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[13px] text-[var(--a-mute)]">
        Aperçu illustratif. Le montant réel s&apos;affiche sur chaque demande.
      </figcaption>
    </figure>
  );
}

/** Page d'accueil publique de l'application nettoyeur : présentation, fonctionnement, questions, puis création de compte. */
export function CleanerLanding() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="rounded-lg bg-white p-1">
            <Image
              src="/logo.png"
              alt=""
              width={187}
              height={344}
              className="h-9 w-auto"
              priority
            />
          </span>
          <span className="text-[16px] font-extrabold tracking-tight">
            ProClean Nettoyeur
          </span>
        </span>
        <Link
          href="/connexion"
          className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-extrabold text-[var(--a-pri)] hover:bg-[var(--a-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--a-pri)]"
        >
          Me connecter
        </Link>
      </header>

      <main className="pb-28 sm:pb-0">
        {/* HERO */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-20 lg:pt-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--a-soft)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--a-pri)]">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Pour les nettoyeurs indépendants
            </p>
            <h1 className="mt-4 text-[38px] font-extrabold leading-[1.05] tracking-tight [text-wrap:balance] sm:text-[52px]">
              Faites des ménages près de chez vous.
            </h1>
            <p className="mt-4 max-w-xl text-[18px] leading-relaxed text-[var(--a-mute)]">
              Les ménages Airbnb autour de vous apparaissent en direct. Vous
              acceptez ceux qui vous conviennent, vous êtes payé par virement.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/nettoyeur/inscription" className={CTA}>
                Créer mon compte
              </Link>
              <Link href="/connexion" className={CTA_GHOST}>
                J&apos;ai déjà un compte
              </Link>
            </div>
            <p className="mt-3 text-[14px] text-[var(--a-mute)]">
              Étudiant, auto-entrepreneur ou entreprise. Sans SIRET, nous vous
              guidons.
            </p>
          </div>
          <PhonePreview />
        </section>

        {/* AVANTAGES */}
        <section className="bg-[var(--a-card)]" aria-labelledby="nl-avantages">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
            <p className={EYEBROW}>Vous gardez la main</p>
            <h2 id="nl-avantages" className={H2}>
              Vous choisissez où, quand et à quel prix.
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-3xl bg-[var(--a-bg)] p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--a-soft)] text-[var(--a-pri)]">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[19px] font-extrabold leading-snug">
                    {title}
                  </h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-[var(--a-mute)]">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ÉTAPES */}
        <section
          className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20"
          aria-labelledby="nl-etapes"
        >
          <p className={EYEBROW}>Comment ça marche</p>
          <h2 id="nl-etapes" className={H2}>
            Du compte au virement, en quatre étapes.
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-3xl border border-[var(--a-line)] p-6"
              >
                <span className="num flex h-10 w-10 items-center justify-center rounded-full bg-[var(--a-pri)] text-[17px] font-extrabold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-[18px] font-extrabold leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2 text-[16px] leading-relaxed text-[var(--a-mute)]">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* PROFILS */}
        <section className="bg-[var(--a-card)]" aria-labelledby="nl-profils">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
            <p className={EYEBROW}>Pour qui</p>
            <h2 id="nl-profils" className={H2}>
              Trois situations, un seul accès.
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {profiles.map((profile) => (
                <li
                  key={profile.title}
                  className="rounded-3xl bg-[var(--a-bg)] p-6"
                >
                  <h3 className="text-[19px] font-extrabold">
                    {profile.title}
                  </h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-[var(--a-mute)]">
                    {profile.text}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-2 text-[15px] text-[var(--a-mute)]">
              <Smartphone
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--a-pri)]"
                aria-hidden
              />
              L&apos;application s&apos;ouvre dans le navigateur de votre
              téléphone. Rien à télécharger.
            </p>
          </div>
        </section>

        {/* QUESTIONS */}
        <section
          className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20"
          aria-labelledby="nl-faq"
        >
          <h2 id="nl-faq" className={H2.replace("mt-2 ", "")}>
            Questions fréquentes
          </h2>
          <div className="mt-6 divide-y divide-[var(--a-line)] rounded-3xl border border-[var(--a-line)]">
            {faq.map((item) => (
              <details key={item.q} className="group px-5">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-extrabold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-[var(--a-mute)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 text-[16px] leading-relaxed text-[var(--a-mute)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* APPEL FINAL */}
        <section
          className="mx-auto max-w-5xl px-4 pb-14 sm:px-6 lg:pb-20"
          aria-labelledby="nl-cta"
        >
          <div className="rounded-[2rem] bg-[var(--a-pri)] px-6 py-10 text-center text-white sm:px-10 sm:py-14">
            <h2
              id="nl-cta"
              className="text-[28px] font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-[36px]"
            >
              Prêt à recevoir vos premières demandes ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-white/85">
              Créez votre compte, puis appuyez sur GO.
            </p>
            <Link
              href="/nettoyeur/inscription"
              className="mx-auto mt-7 flex min-h-14 max-w-xs items-center justify-center rounded-2xl bg-white px-6 text-lg font-extrabold text-[#1e3a6e] transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Créer mon compte
            </Link>
          </div>
          <p className="mt-6 text-center text-[13px] text-[var(--a-mute)]">
            Une application ProClean Empire.
          </p>
        </section>
      </main>

      {/* Téléphone : l'action principale reste à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--a-line)] bg-[var(--a-bg)]/95 px-4 pt-3 backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden">
        <Link href="/nettoyeur/inscription" className={CTA}>
          Créer mon compte
        </Link>
      </div>
    </>
  );
}

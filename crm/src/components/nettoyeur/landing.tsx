import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Bell,
  ChevronDown,
  Clock,
  Flame,
  Home,
  MapPin,
  Search,
  Smartphone,
  Star,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/nettoyeur/reveal";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--a-pri)]";
const CTA = `flex min-h-14 items-center justify-center rounded-2xl bg-[var(--a-pri)] px-7 text-lg font-extrabold text-white shadow-[0_14px_30px_-14px_var(--a-pri)] transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none ${FOCUS}`;
const CTA_GHOST = `flex min-h-14 items-center justify-center rounded-2xl border border-[var(--a-pri)] px-7 text-base font-extrabold text-[var(--a-pri)] transition-colors duration-200 hover:bg-[var(--a-soft)] ${FOCUS}`;
const EYEBROW =
  "text-[13px] font-extrabold uppercase tracking-wider text-[var(--a-pri)]";
const H2 =
  "text-[28px] font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-[38px]";
const LEAD = "mt-3 text-[17px] leading-relaxed text-[var(--a-mute)]";
const SCREEN =
  "rounded-[2rem] border border-[var(--a-line)] bg-[var(--a-bg)] p-4 shadow-[0_30px_60px_-30px_rgba(16,24,40,0.35)]";
const LABEL =
  "px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--a-mute)]";

const trust = [
  { icon: BadgeCheck, text: "SIRET vérifié automatiquement" },
  { icon: Banknote, text: "Payé par virement" },
  { icon: Smartphone, text: "Rien à télécharger" },
];

const steps = [
  {
    title: "Créez votre compte",
    text: "Quelques minutes suffisent. Votre SIRET est contrôlé automatiquement dans l'annuaire officiel.",
  },
  {
    title: "Appuyez sur GO",
    text: "Vous passez en ligne. Les ménages Airbnb de votre zone apparaissent, avec le créneau et la durée.",
  },
  {
    title: "Acceptez et intervenez",
    text: "L'adresse exacte et les consignes s'affichent dès que vous avez accepté.",
  },
  {
    title: "Recevez votre virement",
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
    q: "Comment suis-je prévenu d'un nouveau ménage ?",
    a: "Par une notification sur votre téléphone quand vous êtes en ligne. Si les notifications ne sont pas activées, vous êtes prévenu par e-mail.",
  },
  {
    q: "Faut-il télécharger une application ?",
    a: "Non. Elle s'ouvre dans le navigateur de votre téléphone et peut s'ajouter à l'écran d'accueil comme une application.",
  },
];

/** Carte de demande, identique à celle de l'application (valeurs d'exemple). */
function RequestMock({ badge }: { badge?: "placed" | "favorite" }) {
  return (
    <div className="space-y-3 rounded-3xl bg-[var(--a-card)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold leading-snug">
            Ménage Airbnb · T2
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--a-mute)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            Cergy 95000 · à 3,2 km
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--a-mute)]">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            11h – 14h · environ 2 h
          </div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-right">
          <div className="num text-[22px] font-extrabold leading-none text-[var(--a-ok)]">
            45 €
          </div>
          <div className="text-[11px] text-[var(--a-mute)]">pour vous</div>
        </div>
      </div>
      {badge === "placed" && (
        <div className="inline-flex rounded-full bg-[var(--a-okbg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--a-ok)]">
          Vous êtes le mieux placé
        </div>
      )}
      {badge === "favorite" && (
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--a-warnbg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--a-warn)]">
          <Star className="h-3.5 w-3.5" />
          Le propriétaire vous a choisi comme favori
        </div>
      )}
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <span className="flex h-11 items-center justify-center rounded-2xl border border-[var(--a-line)] text-[14px] font-extrabold text-[var(--a-mute)]">
          Passer
        </span>
        <span className="flex h-11 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-[15px] font-extrabold text-white">
          J&apos;accepte
        </span>
      </div>
    </div>
  );
}

/** Téléphone du haut de page : l'écran « Aujourd'hui » en ligne, avec une demande qui vient d'arriver. */
function PhonePreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[330px]">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full bg-[var(--a-soft)] opacity-80 blur-3xl"
      />
      <div
        role="img"
        aria-label="Aperçu de l'application : le bouton pour se mettre en ligne, puis une demande de ménage Airbnb avec la ville, la distance, le créneau et le gain, et les boutons Passer et J'accepte. Valeurs d'exemple."
        className="rounded-[2.75rem] border border-[var(--a-line)] bg-[var(--a-ink)] p-2.5 shadow-[0_40px_70px_-30px_rgba(16,24,40,0.55)]"
      >
        <div
          aria-hidden
          className="overflow-hidden rounded-[2.2rem] bg-[var(--a-bg)] px-3.5 pb-3 pt-5"
        >
          <p className="text-[20px] font-extrabold tracking-tight">
            Bonjour, Sarah
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-3xl bg-[var(--a-okbg)] p-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--a-ok)] opacity-30 [animation-duration:2s] motion-reduce:hidden" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--a-ok)] text-[13px] font-extrabold text-white">
                STOP
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold">
                Vous êtes en ligne
              </span>
              <span className="block text-[12px] leading-snug text-[var(--a-mute)]">
                Recherche de ménages autour de Cergy
              </span>
            </span>
          </div>
          <p className={`mb-2 mt-4 ${LABEL}`}>Nouvelle demande</p>
          <RequestMock badge="placed" />
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

/** Écran « Où il y a de la demande » (valeurs d'exemple). */
function ZonesMock() {
  const zones = [
    {
      city: "Cergy",
      cp: "95000",
      line: "3 ménages en attente · à 3,2 km",
      level: "Forte demande",
      tone: "bg-[var(--a-badbg)] text-[var(--a-bad)]",
    },
    {
      city: "Pontoise",
      cp: "95300",
      line: "1 ménage en attente · à 5,8 km",
      level: "Demande",
      tone: "bg-[var(--a-warnbg)] text-[var(--a-warn)]",
    },
    {
      city: "Osny",
      cp: "95520",
      line: "2 logements · à 7,1 km",
      level: "À venir",
      tone: "bg-[var(--a-soft)] text-[var(--a-pri)]",
    },
  ];
  return (
    <div
      role="img"
      aria-label="Aperçu de l'écran des zones : trois villes avec leur niveau de demande et la distance. Valeurs d'exemple."
      className={SCREEN}
    >
      <div aria-hidden>
        <p className={`mb-2 flex items-center gap-1.5 ${LABEL}`}>
          <Flame className="h-3.5 w-3.5" />
          Où il y a de la demande
        </p>
        <div className="space-y-2">
          {zones.map((z) => (
            <div
              key={z.cp}
              className="flex items-center gap-3 rounded-2xl bg-[var(--a-card)] p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-extrabold">
                  {z.city}{" "}
                  <span className="font-semibold text-[var(--a-mute)]">
                    {z.cp}
                  </span>
                </div>
                <div className="truncate text-[12px] text-[var(--a-mute)]">
                  {z.line}
                </div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold ${z.tone}`}
                >
                  {z.level}
                </span>
              </div>
              <span className="rounded-xl border border-[var(--a-pri)] px-3 py-2 text-[12px] font-extrabold text-[var(--a-pri)]">
                Y aller
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Écran « Mes gains » (valeurs d'exemple). */
function GainsMock() {
  const tile = "rounded-2xl border border-[var(--a-line)] p-3";
  return (
    <div
      role="img"
      aria-label="Aperçu de l'écran Mes gains : montants à venir, validés à payer et déjà payés, puis un virement dans l'historique. Valeurs d'exemple."
      className={SCREEN}
    >
      <div aria-hidden>
        <p className="mb-3 text-[22px] font-extrabold tracking-tight">
          Mes gains
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className={tile}>
            <div className="text-[12px] font-bold text-[var(--a-mute)]">
              À venir
            </div>
            <div className="num mt-0.5 text-[22px] font-extrabold">90 €</div>
          </div>
          <div className={tile}>
            <div className="text-[12px] font-bold text-[var(--a-mute)]">
              Validé, à payer
            </div>
            <div className="num mt-0.5 text-[22px] font-extrabold text-[var(--a-pri)]">
              135 €
            </div>
          </div>
          <div className={tile}>
            <div className="text-[12px] font-bold text-[var(--a-mute)]">
              Déjà payé
            </div>
            <div className="num mt-0.5 text-[22px] font-extrabold text-[var(--a-ok)]">
              405 €
            </div>
          </div>
          <div className={tile}>
            <div className="text-[12px] font-bold text-[var(--a-mute)]">
              Ménages validés
            </div>
            <div className="num mt-0.5 text-[22px] font-extrabold">12</div>
          </div>
        </div>
        <p className={`mb-2 mt-4 ${LABEL}`}>Historique des virements</p>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--a-card)] p-3">
          <span>
            <b className="block text-[14px]">3 nov. – 9 nov.</b>
            <span className="text-[12px] text-[var(--a-mute)]">
              3 ménages · payé le 10 nov.
            </span>
          </span>
          <b className="num text-[16px]">135 €</b>
        </div>
      </div>
    </div>
  );
}

function Feature({
  eyebrow,
  title,
  text,
  points,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: { icon: typeof MapPin; text: string }[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <Reveal className={flip ? "lg:order-2" : ""}>
        <p className={EYEBROW}>{eyebrow}</p>
        <h3 className={`mt-2 ${H2}`}>{title}</h3>
        <p className={LEAD}>{text}</p>
        <ul className="mt-5 space-y-3">
          {points.map(({ icon: Icon, text: point }) => (
            <li
              key={point}
              className="flex items-start gap-3 text-[16px] leading-relaxed"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--a-soft)] text-[var(--a-pri)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className="mx-auto w-full max-w-[360px]">
        {visual}
      </Reveal>
    </div>
  );
}

/** Page d'accueil publique de l'application nettoyeur : présentation, fonctionnement, questions, puis création de compte. */
export function CleanerLanding() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--a-line)] bg-[var(--a-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white p-1">
              <Image
                src="/logo.png"
                alt=""
                width={187}
                height={344}
                className="h-8 w-auto"
                priority
              />
            </span>
            <span className="text-[16px] font-extrabold tracking-tight">
              ProClean Nettoyeur
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Link
              href="/connexion"
              className={`flex min-h-11 items-center rounded-xl px-3 text-[15px] font-extrabold text-[var(--a-pri)] hover:bg-[var(--a-soft)] ${FOCUS}`}
            >
              Me connecter
            </Link>
            <Link
              href="/nettoyeur/inscription"
              className={`hidden min-h-11 items-center rounded-xl bg-[var(--a-pri)] px-4 text-[15px] font-extrabold text-white hover:opacity-90 sm:flex ${FOCUS}`}
            >
              Créer mon compte
            </Link>
          </span>
        </div>
      </header>

      <main className="pb-28 sm:pb-0">
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[linear-gradient(180deg,var(--a-card),transparent)]"
          />
          <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-24 lg:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[var(--a-soft)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--a-pri)]">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--a-pri)] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--a-pri)]" />
                </span>
                Pour les nettoyeurs indépendants
              </p>
              <h1 className="mt-5 text-[40px] font-extrabold leading-[1.03] tracking-tight [text-wrap:balance] sm:text-[58px]">
                Faites des ménages{" "}
                <span className="text-[var(--a-pri)]">près de chez vous.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-[var(--a-mute)]">
                Les ménages Airbnb autour de vous apparaissent en direct. Vous
                acceptez ceux qui vous conviennent, vous êtes payé par virement.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/nettoyeur/inscription" className={CTA}>
                  Créer mon compte
                </Link>
                <Link href="/connexion" className={CTA_GHOST}>
                  J&apos;ai déjà un compte
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {trust.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-1.5 text-[14px] font-bold text-[var(--a-mute)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--a-ok)]" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <PhonePreview />
          </div>
        </section>

        {/* FONCTIONS, ÉCRAN PAR ÉCRAN */}
        <section className="bg-[var(--a-card)]" aria-labelledby="nl-fonctions">
          <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6 lg:space-y-24 lg:py-24">
            <Reveal>
              <p className={EYEBROW}>Vous gardez la main</p>
              <h2 id="nl-fonctions" className={`mt-2 max-w-2xl ${H2}`}>
                Vous choisissez où, quand et à quel prix.
              </h2>
            </Reveal>
            <Feature
              eyebrow="Les demandes"
              title="Le premier qui accepte obtient le ménage."
              text="Chaque demande arrive sur votre téléphone avec tout ce qu'il faut pour décider en quelques secondes."
              points={[
                {
                  icon: Banknote,
                  text: "Votre gain est affiché avant d'accepter.",
                },
                {
                  icon: MapPin,
                  text: "La ville et la distance depuis chez vous.",
                },
                {
                  icon: Bell,
                  text: "Une notification dès qu'un ménage apparaît près de vous.",
                },
              ]}
              visual={
                <div
                  role="img"
                  aria-label="Aperçu d'une demande choisie par un propriétaire favori. Valeurs d'exemple."
                  className={SCREEN}
                >
                  <div aria-hidden>
                    <p className={`mb-2 ${LABEL}`}>Jeudi 20 novembre</p>
                    <RequestMock badge="favorite" />
                  </div>
                </div>
              }
            />
            <Feature
              flip
              eyebrow="Votre zone"
              title="Voyez où il y a du travail."
              text="Vous fixez votre rayon de déplacement, de 5 à 60 km. L'application vous montre les villes où les ménages attendent."
              points={[
                { icon: Flame, text: "Le niveau de demande, ville par ville." },
                { icon: Zap, text: "Un bouton pour vous placer sur une zone." },
              ]}
              visual={<ZonesMock />}
            />
            <Feature
              eyebrow="Vos gains"
              title="Vous savez toujours où en est votre argent."
              text="Ce qui est à venir, ce qui est validé, ce qui est déjà payé : tout est dans l'onglet Gains, avec l'historique des virements."
              points={[
                {
                  icon: Wallet,
                  text: "Virement en début de semaine ou en fin de mois.",
                },
                {
                  icon: BadgeCheck,
                  text: "Chaque ménage est validé avant paiement.",
                },
              ]}
              visual={<GainsMock />}
            />
            <p className="text-center text-[13px] text-[var(--a-mute)]">
              Écrans illustratifs. Les montants, villes et dates sont des
              exemples.
            </p>
          </div>
        </section>

        {/* ÉTAPES */}
        <section
          className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24"
          aria-labelledby="nl-etapes"
        >
          <Reveal>
            <p className={EYEBROW}>Comment ça marche</p>
            <h2 id="nl-etapes" className={`mt-2 ${H2}`}>
              Du compte au virement, en quatre étapes.
            </h2>
          </Reveal>
          <ol className="relative mt-10 grid gap-8 lg:grid-cols-4 lg:gap-6">
            <span
              aria-hidden
              className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px bg-[var(--a-line)] lg:left-[12.5%] lg:top-5 lg:h-px lg:w-3/4"
            />
            {steps.map((step, index) => (
              <li key={step.title}>
                <Reveal
                  delay={index * 90}
                  className="relative flex gap-4 lg:block"
                >
                  <span className="num relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--a-pri)] text-[17px] font-extrabold text-white ring-8 ring-[var(--a-bg)] lg:mx-auto">
                    {index + 1}
                  </span>
                  <div className="lg:mt-5 lg:text-center">
                    <h3 className="text-[19px] font-extrabold leading-snug">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[16px] leading-relaxed text-[var(--a-mute)]">
                      {step.text}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* PROFILS */}
        <section className="bg-[var(--a-card)]" aria-labelledby="nl-profils">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-24">
            <Reveal>
              <p className={EYEBROW}>Pour qui</p>
              <h2 id="nl-profils" className={`mt-2 ${H2}`}>
                Trois situations, un seul accès.
              </h2>
            </Reveal>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {profiles.map((profile, index) => (
                <li key={profile.title}>
                  <Reveal
                    delay={index * 90}
                    className="h-full rounded-3xl bg-[var(--a-bg)] p-6 transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                  >
                    <h3 className="text-[20px] font-extrabold">
                      {profile.title}
                    </h3>
                    <p className="mt-2 text-[16px] leading-relaxed text-[var(--a-mute)]">
                      {profile.text}
                    </p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* QUESTIONS */}
        <section
          className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24"
          aria-labelledby="nl-faq"
        >
          <h2 id="nl-faq" className={H2}>
            Questions fréquentes
          </h2>
          <div className="mt-6 divide-y divide-[var(--a-line)] rounded-3xl border border-[var(--a-line)]">
            {faq.map((item) => (
              <details key={item.q} className="group px-5">
                <summary
                  className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-4 text-[17px] font-extrabold [&::-webkit-details-marker]:hidden ${FOCUS}`}
                >
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
          className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:pb-24"
          aria-labelledby="nl-cta"
        >
          <Reveal className="relative isolate overflow-hidden rounded-[2rem] bg-[#1e3a6e] px-6 py-12 text-center text-white sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-28 -left-10 -z-10 h-72 w-72 rounded-full bg-[#3f73d6]/40 blur-2xl"
            />
            <h2
              id="nl-cta"
              className="text-[30px] font-extrabold leading-tight tracking-tight [text-wrap:balance] sm:text-[42px]"
            >
              Prêt à recevoir vos premières demandes ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[18px] leading-relaxed text-white/85">
              Créez votre compte, puis appuyez sur GO.
            </p>
            <Link
              href="/nettoyeur/inscription"
              className="mx-auto mt-8 flex min-h-14 max-w-xs items-center justify-center rounded-2xl bg-white px-6 text-lg font-extrabold text-[#1e3a6e] transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Créer mon compte
            </Link>
            <p className="mt-4 text-[14px] text-white/75">
              Étudiant, auto-entrepreneur ou entreprise. Sans SIRET, nous vous
              guidons.
            </p>
          </Reveal>
          <p className="mt-6 text-center text-[13px] text-[var(--a-mute)]">
            Une application ProClean Empire.
          </p>
        </section>
      </main>

      {/* Téléphone : l'action principale reste à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--a-line)] bg-[var(--a-bg)]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <Link href="/nettoyeur/inscription" className={CTA}>
          Créer mon compte
        </Link>
      </div>
    </>
  );
}

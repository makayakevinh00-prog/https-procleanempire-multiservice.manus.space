import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { agentPrefs, isToken } from "@/lib/agent";
import { dict } from "@/lib/field-ui";
import { Invalid } from "@/components/agent/invalid";

export const metadata: Metadata = { title: "Confidentialité — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Ce que l'application traite réellement, en langage simple. */
const TEXT = {
  fr: [
    ["Votre identité", "Nom, et si renseignés e-mail et téléphone : pour vous affecter des missions et vous joindre."],
    ["Votre position", "Relevée une seule fois, au moment où vous touchez « Je suis arrivé(e) » (et « J'ai terminé »), pour vérifier que vous êtes sur le site. Elle n'est jamais suivie en continu. Si vous refusez la localisation, l'arrivée est enregistrée « non vérifiée »."],
    ["Vos photos", "Les photos avant, après et de problème que vous envoyez sont rattachées à la mission, pour la preuve de passage et le contrôle qualité."],
    ["Vos horaires", "Heures d'arrivée et de départ de chaque mission, pour le suivi du temps et la facturation."],
    ["Qui y accède", "Votre responsable chez ProClean Empire uniquement. Aucune donnée n'est vendue ni partagée à des fins publicitaires."],
    ["Vos droits", "Vous pouvez demander l'effacement de vos données depuis Profil › Supprimer mes données. Certaines informations de mission restent conservées sans données personnelles, pour les obligations légales."]
  ],
  en: [
    ["Your identity", "Name and, if provided, email and phone: to assign you missions and reach you."],
    ["Your location", "Read once, when you tap “I've arrived” (and “I'm done”), to check you are on site. It is never tracked continuously. If you refuse location, your arrival is recorded as “not verified”."],
    ["Your photos", "Before, after and problem photos you send are attached to the mission, as proof of visit and for quality control."],
    ["Your hours", "Arrival and departure times for each mission, for time tracking and billing."],
    ["Who can see it", "Your manager at ProClean Empire only. No data is sold or shared for advertising."],
    ["Your rights", "You can ask for your data to be erased from Profile › Delete my data. Some mission records are kept without personal data, for legal obligations."]
  ]
} as const;

export default function PrivacyPage({ params }: { params: { token: string } }) {
  const { lang } = agentPrefs();
  const t = dict(lang);
  if (!isToken(params.token)) return <Invalid t={t} text={t.invalidText} />;
  return (
    <>
      <Link href={`/agent/${params.token}/profil`} className="mb-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--a-pri)]"><ChevronLeft className="h-5 w-5" />{t.back}</Link>
      <h1 className="mb-1 text-[30px] font-extrabold tracking-tight">{t.privacy}</h1>
      <p className="mb-4 text-[15px] text-[var(--a-mute)]">{t.privacySub}</p>
      <div className="space-y-2">{TEXT[lang].map(([h, p]) => <section key={h} className="rounded-2xl bg-[var(--a-card)] p-4"><h2 className="text-[17px] font-extrabold">{h}</h2><p className="mt-1 text-[15px] text-[var(--a-mute)]">{p}</p></section>)}</div>
    </>
  );
}

import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { legalInfo } from "@/lib/content/legal";

export const metadata = buildMetadata({
  title: "Politique de confidentialité",
  description:
    "Données personnelles collectées par le site ProClean Empire : finalités, durée de conservation, destinataires, relances commerciales et droits RGPD.",
  path: "/politique-confidentialite"
});

const sections: { title: string; paragraphs: string[] }[] = [
  {
    title: "Responsable du traitement",
    paragraphs: [
      `${legalInfo.companyName} (${legalInfo.legalForm}, RCS ${legalInfo.rcsCity} ${legalInfo.rcsNumber}), ${legalInfo.headOffice}. Contact : ${siteConfig.email}.`
    ]
  },
  {
    title: "Données collectées",
    paragraphs: [
      "Via le formulaire de devis : nom, société (facultatif), téléphone, e-mail, adresse et ville de l'intervention, prestation demandée et ses caractéristiques (surface, fréquence, etc.), date souhaitée, message libre, ainsi que l'origine de votre visite (moteur de recherche, réseau social, accès direct) et la page d'envoi.",
      "Via une demande de rendez-vous par WhatsApp, par e-mail ou par téléphone : les informations que vous nous communiquez à cette occasion."
    ]
  },
  {
    title: "Finalités et base légale",
    paragraphs: [
      "Établir et suivre votre devis, vous recontacter à ce sujet, planifier l'intervention et gérer la relation commerciale qui en découle. Base légale : mesures précontractuelles prises à votre demande, et votre accord donné en cochant la case du formulaire.",
      "Mesurer l'origine des demandes afin d'améliorer nos services. Base légale : notre intérêt légitime. Cette information est conservée uniquement dans la session de votre navigateur, sans cookie, jusqu'à l'envoi de votre demande."
    ]
  },
  {
    title: "Relances commerciales",
    paragraphs: [
      "Après une demande de devis, nous pouvons vous relancer par téléphone ou par e-mail au sujet de ce devis uniquement, au maximum une fois par semaine.",
      "Nous ne vous envoyons pas d'offres sans rapport avec votre demande sans votre accord préalable (particuliers). Pour les professionnels, toute prospection porte sur une offre liée à votre activité. Chaque e-mail permet de vous y opposer : il suffit de répondre « STOP » ou d'écrire à " + siteConfig.email + "."
    ]
  },
  {
    title: "Durée de conservation",
    paragraphs: [
      "Prospects (demande sans suite) : 3 ans à compter du dernier contact, puis suppression ou anonymisation.",
      "Clients : pendant toute la relation commerciale, puis 3 ans pour les données de contact. Les factures et pièces comptables sont conservées 10 ans, comme l'exige la loi.",
      "Journaux techniques du serveur : conservés par notre hébergeur pour une durée limitée, à des fins de sécurité et de diagnostic."
    ]
  },
  {
    title: "Qui accède à vos données",
    paragraphs: [
      "Uniquement les personnes de ProClean Empire chargées du suivi commercial et de la planification, ainsi que nos sous-traitants techniques, dans la limite de leur mission : nos outils de messagerie (Microsoft 365 pour les e-mails, WhatsApp si vous choisissez ce canal), notre logiciel de facturation (Qonto), Resend (envoi des e-mails liés à votre demande), Upstash (base de données où votre demande est enregistrée), Vercel (hébergement du site et, le cas échéant, statistiques anonymes) et l'Institut national de l'information géographique (IGN), qui reçoit le texte de l'adresse saisie pour proposer des suggestions d'adresse.",
      "Vos données ne sont jamais vendues ni louées."
    ]
  },
  {
    title: "Cookies et traceurs",
    paragraphs: [
      "Le site n'utilise aucun cookie publicitaire. Lorsque la mesure d'audience Vercel Web Analytics est activée, elle fonctionne sans cookie et sans identifier les visiteurs (statistiques de pages vues anonymes).",
      "Tout futur outil qui dépose des cookies ou suit les visiteurs (par exemple Google Analytics ou le pixel Meta) ne sera activé qu'après votre accord, recueilli par un bandeau de consentement."
    ]
  },
  {
    title: "Vos droits",
    paragraphs: [
      `Vous pouvez demander l'accès, la rectification, l'effacement ou la limitation de vos données, vous opposer à leur traitement ou demander leur portabilité en écrivant à ${siteConfig.email}. Nous répondons dans un délai d'un mois.`,
      "Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr)."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Politique de confidentialité"
        description="Comment nous utilisons et protégeons les informations que vous nous confiez."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Politique de confidentialité" }
        ]}
      />
      <section className="section pt-0">
        <article className="card space-y-8 p-6 text-sm leading-relaxed text-slate-700 md:p-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-2">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
          <p className="text-xs text-slate-500">Dernière mise à jour : octobre 2026.</p>
        </article>
      </section>
    </>
  );
}

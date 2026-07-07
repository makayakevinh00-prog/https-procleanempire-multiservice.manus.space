import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { FaqAdvanced } from "@/components/phase3/faq-advanced";

export const metadata = buildMetadata({
  title: "FAQ",
  description:
    "Retrouvez les reponses aux questions frequentes sur nos prestations de proprete pour entreprises.",
  path: "/faq"
});

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="FAQ"
        description="Toutes les informations utiles pour cadrer votre projet de prestations de proprete."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "FAQ" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Demander un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Poser une question
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <FaqAdvanced />
      </section>
    </>
  );
}

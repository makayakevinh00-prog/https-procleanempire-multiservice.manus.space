import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Média" };

/** Rubrique Média : la structure arrive à l'étape 9 (calendrier éditorial, idées de posts, statistiques par réseau, photos avant / après). */
export default function MediaPage() {
  return (
    <>
      <PageHeader title="Média" subtitle="Calendrier éditorial, idées de posts, statistiques par réseau, photos avant / après." />
      <div className="grid gap-4 sm:grid-cols-2">
        {["Calendrier éditorial", "Idées de posts", "Statistiques par réseau", "Photos avant / après"].map((t) => (
          <Card key={t}><CardContent className="py-8 text-center"><div className="text-[15px] font-semibold">{t}</div><div className="mt-1 text-sm text-muted-foreground">Bientôt disponible</div></CardContent></Card>
        ))}
      </div>
    </>
  );
}

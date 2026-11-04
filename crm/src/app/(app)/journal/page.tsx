import { createClient } from "@/lib/supabase/server";
import { PageHeader, Empty } from "@/components/crm/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

const KIND: Record<string, string> = {
  facture: "Facture", relance_facture: "Relance facture", devis: "Devis", relance_devis: "Relance devis", recapitulatif: "Récapitulatif patron", test: "Test"
};
const when = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

export default async function JournalPage() {
  const supabase = createClient();
  const [{ data: runs }, { data: mails }] = await Promise.all([
    supabase.from("automation_runs").select("*").order("ran_at", { ascending: false }).limit(30),
    supabase.from("email_log").select("*").order("sent_at", { ascending: false }).limit(100)
  ]);
  return (
    <>
      <PageHeader title="Journal" subtitle="Chaque passage de l'automatisation et chaque e-mail envoyé, avec le résultat." />
      <Card className="mb-4">
        <CardHeader><CardTitle>Exécutions automatiques</CardTitle></CardHeader>
        {!runs?.length ? <Empty>Aucune exécution pour l&apos;instant : la première a lieu ce soir (18 h UTC).</Empty> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Résultat</Th><Th>Factures</Th><Th>Envoyées</Th><Th>Relances</Th><Th>Planning</Th><Th>Erreurs</Th></tr></thead>
            <tbody>{runs.map((r: any) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap">{when(r.ran_at)}</Td>
                <Td>{r.ok ? <Badge tone="green">OK</Badge> : <Badge tone="red">Erreurs</Badge>}</Td>
                <Td>{r.report?.generated?.length ?? 0}</Td>
                <Td>{r.report?.sent?.length ?? 0}</Td>
                <Td>{(r.report?.reminders?.length ?? 0) + (r.report?.followups?.length ?? 0)}</Td>
                <Td>{r.report?.planning?.created ?? 0} ajouté(s)</Td>
                <Td className="max-w-xs text-xs text-red-800">{(r.errors ?? []).join(" · ") || "—"}</Td>
              </Tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader><CardTitle>E-mails envoyés</CardTitle></CardHeader>
        {!mails?.length ? <Empty>Aucun e-mail envoyé pour l&apos;instant.</Empty> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Type</Th><Th>Destinataire</Th><Th>Objet</Th><Th>Origine</Th><Th>Résultat</Th></tr></thead>
            <tbody>{mails.map((m: any) => (
              <Tr key={m.id}>
                <Td className="whitespace-nowrap">{when(m.sent_at)}</Td>
                <Td>{KIND[m.kind] ?? m.kind}</Td>
                <Td>{m.to_email}</Td>
                <Td className="max-w-xs truncate text-muted-foreground">{m.subject}</Td>
                <Td>{m.origin === "auto" ? <Badge tone="blue">Automatique</Badge> : <Badge>Manuel</Badge>}</Td>
                <Td>{m.ok ? <Badge tone="green">Envoyé</Badge> : <Badge tone="red" title={m.error ?? ""}>Échec : {m.error}</Badge>}</Td>
              </Tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

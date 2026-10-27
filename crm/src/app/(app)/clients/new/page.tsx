import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/crm/client-form";
import { createClientAction } from "@/app/actions/clients";

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Nouveau client" />
      <Card><CardContent><ClientForm action={createClientAction} submitLabel="Créer le client" /></CardContent></Card>
    </>
  );
}

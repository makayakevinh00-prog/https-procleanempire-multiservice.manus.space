import Link from "next/link";
import { ReservedBadge } from "@/components/ui/badge";

export function ClientName({ id, name, reserved, link = true }: { id?: string; name: string; reserved?: boolean | null; link?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {link && id ? <Link href={`/clients/${id}`} className="font-medium hover:underline">{name}</Link> : <span className="font-medium">{name}</span>}
      {reserved && <ReservedBadge />}
    </span>
  );
}

export function ReservedBanner({ name, reason }: { name: string; reason?: string | null }) {
  return (
    <div role="alert" className="mb-4 rounded-md border-2 border-destructive bg-red-50 p-4 text-sm text-red-900">
      <b>🔒 CONTACT RÉSERVÉ — {name}.</b> Aucune action automatique (relances, rapprochement, envoi). Alerte patron uniquement :
      toute action manuelle exige une confirmation explicite. {reason}
    </div>
  );
}

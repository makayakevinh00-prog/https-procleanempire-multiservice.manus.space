import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      gray: "bg-muted text-muted-foreground",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-emerald-100 text-emerald-800",
      orange: "bg-amber-100 text-amber-800",
      red: "bg-red-100 text-red-800",
      solidRed: "bg-destructive text-destructive-foreground"
    }
  },
  defaultVariants: { tone: "gray" }
});

export function Badge({ tone, className, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />;
}

/** Badge rouge « CONTACT RÉSERVÉ » — affiché partout où un client apparaît. */
export function ReservedBadge({ className }: { className?: string }) {
  return <Badge tone="solidRed" className={className}>🔒 CONTACT RÉSERVÉ</Badge>;
}

const STATUS: Record<string, [string, "gray" | "blue" | "green" | "orange" | "red"]> = {
  brouillon: ["Brouillon", "gray"], envoye: ["Envoyé", "blue"], accepte: ["Accepté", "green"], refuse: ["Refusé", "red"],
  paye: ["Payé", "green"], en_retard: ["En retard", "red"], annule: ["Annulé", "gray"],
  actif: ["Actif", "green"], resilie: ["Résilié", "red"], en_cours: ["En cours", "orange"],
  prospect: ["Prospect", "blue"], inactif: ["Inactif", "gray"],
  non_rapproche: ["Non rapproché", "orange"], propose: ["À confirmer", "blue"], rapproche: ["Rapproché", "green"], ignore: ["Ignoré", "gray"]
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
}

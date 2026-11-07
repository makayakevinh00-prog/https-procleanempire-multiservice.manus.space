import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      gray: "bg-muted text-muted-foreground",
      blue: "bg-[#e8edf5] text-[#2b4c7e]",
      green: "bg-[#e6f1ea] text-[#2f7a55]",
      orange: "bg-[#f7ecdb] text-[#8f5a12]",
      red: "bg-[#f6e4e1] text-[#b3382c]",
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
  brouillon: ["Brouillon", "gray"], envoye: ["Envoyé", "blue"], accepte: ["Accepté", "green"], refuse: ["Refusé", "red"], expire: ["Expiré", "gray"],
  paye: ["Payé", "green"], en_retard: ["En retard", "red"], annule: ["Annulé", "gray"],
  actif: ["Actif", "green"], resilie: ["Résilié", "red"], en_cours: ["En cours", "orange"],
  prospect: ["Prospect", "blue"], inactif: ["Inactif", "gray"],
  non_rapproche: ["Non rapproché", "orange"], propose: ["À confirmer", "blue"], rapproche: ["Rapproché", "green"], ignore: ["Ignoré", "gray"]
};

export function StatusBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
}

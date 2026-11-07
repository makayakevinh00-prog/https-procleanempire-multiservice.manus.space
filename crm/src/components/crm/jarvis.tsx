import { Badge } from "@/components/ui/badge";
import { LEVEL_LABEL } from "@/lib/jarvis/policy";
import type { Level, Severity } from "@/lib/jarvis/types";

export const LEVEL_TONE: Record<Level, "green" | "orange" | "red"> = { L1: "green", L2: "orange", L3: "red" };
export const LevelBadge = ({ level }: { level: Level }) => <Badge tone={LEVEL_TONE[level]}>{level} · {LEVEL_LABEL[level]}</Badge>;

const SEV: Record<Severity, ["red" | "orange" | "blue", string]> = { urgent: ["red", "Urgent"], attention: ["orange", "À surveiller"], info: ["blue", "Information"] };
export const SeverityBadge = ({ severity }: { severity: Severity }) => <Badge tone={SEV[severity][0]}>{SEV[severity][1]}</Badge>;
export const SEVERITY_RANK: Record<string, number> = { urgent: 0, attention: 1, info: 2 };

export const EVENT_LABEL: Record<string, string> = {
  "contract.incomplete": "Contrat actif incomplet : à compléter pour pouvoir le planifier et le facturer",
  "invoice.cancelled_after_sent": "Facture annulée après envoi sans avoir : à encadrer"
};

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "jamais";

/** Affiché tant que la migration 0021 n'est pas appliquée : on le dit au lieu d'afficher une page vide trompeuse. */
export function NotInstalled() {
  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
      <b>Le socle JARVIS n&apos;est pas encore installé sur cette base.</b> La migration <code>0021_jarvis_core.sql</code> est écrite et testée, mais elle n&apos;a pas été appliquée : elle attend votre autorisation.
      Les fiches des agents ci-dessous restent consultables ; aucune alerte ni proposition n&apos;existe tant que le socle n&apos;est pas en place.
    </div>
  );
}

export const isMissingTable = (err: { message: string } | null | undefined) => !!err && /jarvis_|does not exist|schema cache|Could not find/i.test(err.message);

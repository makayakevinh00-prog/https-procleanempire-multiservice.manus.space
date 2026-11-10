/** Périodes d'export comptable : un mois (2026-03), un trimestre (2026-T1) ou une année (2026). */
export type Period = { key: string; label: string; months: string[] };

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

export function parsePeriod(raw: string | null | undefined): Period | null {
  const s = (raw ?? "").trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s))) return { key: s, label: `${MONTHS[Number(m[2]) - 1]} ${m[1]}`, months: [s] };
  if ((m = /^(\d{4})-T([1-4])$/.exec(s))) {
    const y = Number(m[1]), q = Number(m[2]);
    return { key: s, label: `${q === 1 ? "1er" : `${q}e`} trimestre ${y}`, months: [1, 2, 3].map((k) => ym(y, (q - 1) * 3 + k)) };
  }
  if ((m = /^(20\d{2})$/.exec(s))) return { key: s, label: `année ${s}`, months: Array.from({ length: 12 }, (_, k) => ym(Number(s), k + 1)) };
  return null;
}

/** Trimestre et année qui contiennent un mois donné (pour proposer les exports au bon endroit). */
export const quarterOf = (month: string) => `${month.slice(0, 4)}-T${Math.ceil(Number(month.slice(5)) / 3)}`;

/** Nom de fichier sûr pour le dossier des justificatifs. */
export const safeFileName = (name: string) => (name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "justificatif");
export const JUSTIF_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const JUSTIF_MAX = 10 * 1024 * 1024;

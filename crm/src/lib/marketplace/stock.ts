import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { aiConfigured, analyzeStock, type Img } from "@/lib/ai-inspect";
import { forecast, leftLabel, nextDue, type StockCount, type StockItem } from "@/lib/domain/stock";
import { mailConfigured, sendMail } from "@/lib/mail";

export type StockResult = { items: StockItem[]; summary: string; unclear: string[]; next_due: string };
const admin = () => process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
const fmt = (n: number) => String(n).replace(".", ",");

/**
 * Analyse le film de stock d'un site, d'un agent ou d'un nettoyeur : inventaire par l'IA, prévision de rupture, puis enregistrement.
 * Pour un site ou un agent ProClean, la direction reçoit la liste de ce qu'il faut racheter.
 */
export async function runStockCount(scope: { kind: "site" | "staff" | "cleaner"; id: string; by: string }): Promise<{ result: StockResult | null; error: string | null }> {
  if (!aiConfigured()) return { result: null, error: "clé d'API absente du serveur (ANTHROPIC_API_KEY)" };
  const a = automationClient(), secret = automationSecret();
  const inp = await a.rpc("automation_stock_input", { p_secret: secret, p_kind: scope.kind, p_id: scope.id });
  if (inp.error) return { result: null, error: "base pas encore à jour pour le stock" };
  const d = inp.data as { label: string | null; per_week: number; previous: StockCount | null; frames: Img[] };
  if (!d.frames.length) return { result: null, error: "aucune image du stock" };
  const r = await analyzeStock(d.frames, Number(d.per_week) || 0, (d.previous?.items ?? []).map((i) => ({ name: i.name, left: i.left, unit: i.unit })));
  if (!r.report) return { result: null, error: r.error };
  if (!r.report.items.length) return { result: null, error: "aucun produit reconnu sur le film : refilmez de plus près, étiquettes visibles" };
  const now = new Date().toISOString(), items = forecast(r.report.items, d.previous, now), due = nextDue(items, now);
  const saved = await a.rpc("automation_stock_save", { p_secret: secret, p_kind: scope.kind, p_id: scope.id, p_by: scope.by, p_items: items, p_summary: r.report.summary, p_next_due: due });
  if (saved.error) return { result: null, error: "comptage non enregistré" };
  const buy = items.filter((i) => i.buy);
  if (scope.kind !== "cleaner" && buy.length && mailConfigured()) {
    await sendMail({
      to: admin(), subject: `Produits à racheter${d.label ? ` — ${d.label}` : ""}`,
      text: `${scope.by} a filmé le stock de produits${d.label ? ` du site « ${d.label} »` : ""}.\n\nÀ racheter :\n${buy.map((i) => `- ${i.name} : reste ${fmt(i.left)} ${i.unit}, ${leftLabel(i)}`).join("\n")}\n\nLe reste du stock tient plus longtemps. Prochain comptage prévu le ${due.split("-").reverse().join("/")}.\n\nL'équipe ProClean Empire`
    }).catch(() => undefined);
  }
  return { result: { items, summary: r.report.summary, unclear: r.report.unclear, next_due: due }, error: null };
}

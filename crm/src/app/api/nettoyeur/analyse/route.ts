import { NextResponse } from "next/server";
import { agentClient, isToken, type CleanerJob } from "@/lib/agent";
import { runBeforeAnalysis } from "@/lib/marketplace/inspect";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Relance (ou lance) le relevé de l'IA pour le ménage du nettoyeur : seulement son ménage, et seulement tant qu'il n'est pas terminé. Renvoie la raison lisible si l'IA échoue. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { token?: string; job?: string } | null;
  const token = String(b?.token ?? ""), job = String(b?.job ?? "");
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(job)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const mine = ((await agentClient().rpc("cleaner_my_jobs", { p_token: token })).data as { jobs: CleanerJob[] } | null)?.jobs ?? [];
  const j = mine.find((x) => x.id === job);
  if (!j || (j.status !== "acceptee" && j.status !== "a_reprendre")) return NextResponse.json({ error: "Ménage introuvable." }, { status: 403 });
  if (j.before_report) return NextResponse.json({ ok: true, error: null });
  let error: string | null;
  try { error = await runBeforeAnalysis(job); } catch (e) { error = `erreur interne : ${(e as Error).message}`; }
  if (error) console.error("[mission] analyse d'arrivée impossible :", error);
  return NextResponse.json({ ok: !error, error });
}

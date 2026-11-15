import { NextResponse } from "next/server";
import { agentClient, isToken } from "@/lib/agent";

export const dynamic = "force-dynamic";

/** Ouvre une fiche de paie : seul l'agent concerné (son lien ou son appareil connecté) peut la lire. */
export async function GET(_: Request, { params }: { params: { token: string; id: string } }) {
  if (!isToken(params.token) || !/^[0-9a-f-]{36}$/.test(params.id)) return new NextResponse("Lien invalide.", { status: 404 });
  const { data, error } = await agentClient().rpc("agent_payslip_file", { p_token: params.token, p_id: params.id });
  const f = data as { file_name: string; mime: string; data: string } | null;
  if (error || !f) return new NextResponse("Fiche introuvable.", { status: 404 });
  return new NextResponse(Buffer.from(f.data, "base64"), { headers: {
    "Content-Type": f.mime === "application/pdf" ? "application/pdf" : "application/octet-stream",
    "Content-Disposition": `inline; filename="${f.file_name.replace(/[^\w. -]/g, "_")}"`,
    "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer"
  } });
}

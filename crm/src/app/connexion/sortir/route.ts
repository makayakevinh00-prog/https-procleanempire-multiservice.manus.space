import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { automationClient, automationSecret } from "@/lib/automation/deps";

export const dynamic = "force-dynamic";
type Space = { kind: string; label: string; path: string };

/** Déconnexion d'un espace depuis l'application (agent, nettoyeur, livreur, conciergerie) : le jeton de cet appareil cesse de fonctionner et l'espace est oublié ici. Le lien personnel envoyé par le responsable n'est pas touché. */
export async function POST(request: NextRequest) {
  const fd = await request.formData().catch(() => null);
  const token = String(fd?.get("t") ?? "");
  const jar = cookies();
  if (/^[0-9a-f]{64}$/.test(token)) {
    try { await automationClient().rpc("automation_revoke_tokens", { p_secret: automationSecret(), p_hashes: [createHash("sha256").update(token).digest("hex")] }); } catch { /* on continue */ }
    try {
      const v = JSON.parse(jar.get("pc_spaces")?.value ?? "null") as { email?: string; spaces?: Space[] } | null;
      const rest = (v?.spaces ?? []).filter((s) => !s.path.endsWith(`/${token}`));
      if (rest.length) jar.set("pc_spaces", JSON.stringify({ email: v?.email ?? "", spaces: rest }), { httpOnly: true, secure: true, sameSite: "lax", path: "/connexion", maxAge: 60 * 86400 });
      else jar.delete({ name: "pc_spaces", path: "/connexion" });
    } catch { jar.delete({ name: "pc_spaces", path: "/connexion" }); }
  }
  return NextResponse.redirect(new URL("/connexion?bye=1", request.url), 303);
}

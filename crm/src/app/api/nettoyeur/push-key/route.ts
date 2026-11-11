import { getVapid } from "@/lib/marketplace/vapid";

export const dynamic = "force-dynamic";
/** Clé publique des notifications (publique par nature) : le téléphone s'abonne avec elle. */
export async function GET() { return Response.json({ key: (await getVapid())?.public ?? null }); }

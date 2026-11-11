import "server-only";
import webpush from "web-push";
import { automationClient, automationSecret } from "@/lib/automation/deps";

/** Clés des notifications : générées une fois par le serveur puis lues en base (secret serveur). */
export async function getVapid(): Promise<{ public: string; private: string } | null> {
  try {
    const fresh = webpush.generateVAPIDKeys();
    const { data, error } = await automationClient().rpc("automation_vapid_keys", { p_secret: automationSecret(), p_pub: fresh.publicKey, p_priv: fresh.privateKey });
    if (error || !data) return null;
    return data as { public: string; private: string };
  } catch { return null; }
}

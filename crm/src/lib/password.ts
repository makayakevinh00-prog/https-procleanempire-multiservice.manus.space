import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Mot de passe de la connexion unique : jamais enregistré en clair, seulement son empreinte (scrypt + sel aléatoire). */
export const passwordOk = (p: string) => p.length >= 8 && p.length <= 200;
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const m = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(stored ?? "");
  if (!m) return false;
  const want = Buffer.from(m[2]!, "hex"), got = scryptSync(password, Buffer.from(m[1]!, "hex"), 64);
  return want.length === got.length && timingSafeEqual(want, got);
}

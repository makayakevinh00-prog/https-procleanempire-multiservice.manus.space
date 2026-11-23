/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "11mb" }, serverComponentsExternalPackages: ["@react-pdf/renderer"] },
  // Application privée : jamais indexée, SAUF les pages publiques destinées à être trouvées dans Google
  // (réservation d'un ménage, présentation et inscription nettoyeur, pages légales). Tout le reste — CRM, espaces
  // personnels à lien privé, API — garde l'en-tête d'exclusion.
  async headers() {
    return [{ source: "/((?!(?:reserver|nettoyeur|nettoyeur/inscription|mentions-legales|cgu|confidentialite)$).*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  }
};

export default nextConfig;

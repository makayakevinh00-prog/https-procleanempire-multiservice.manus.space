import type { NextConfig } from "next";
import { STANDALONE_PAGES } from "./lib/standalone-pages";

const nextConfig: NextConfig = {
  // Une seule page par prestation (audit P0-6) : /services/<slug> renvoie vers la page principale /<slug>.
  async redirects() {
    return [...STANDALONE_PAGES].map((slug) => ({
      source: `/services/${slug}`,
      destination: `/${slug}`,
      permanent: true
    }));
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com"
      }
    ]
  }
};

export default nextConfig;

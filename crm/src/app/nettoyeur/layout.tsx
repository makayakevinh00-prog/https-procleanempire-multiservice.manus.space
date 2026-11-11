import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { manifest: "/nettoyeur/manifest.webmanifest", appleWebApp: { capable: true, title: "Nettoyeur", statusBarStyle: "default" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function CleanerRoot({ children }: { children: React.ReactNode }) { return children; }

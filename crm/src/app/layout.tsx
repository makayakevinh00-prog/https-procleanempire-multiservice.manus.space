import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ProClean CRM",
  description: "CRM interne ProClean Empire",
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ProClean", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

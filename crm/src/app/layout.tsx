import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ProClean CRM",
  description: "CRM interne ProClean Empire",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" }], shortcut: "/favicon.ico", apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ProClean", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Style et couleur choisis : appliqués avant l'affichage (aucun clignotement). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem("pce-theme")||"null");if(t){var h=document.documentElement;if(t.skin)h.dataset.skin=t.skin;if(t.hud)h.dataset.hud="on";if(t.accent)h.dataset.accent=t.accent}}catch(e){}` }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

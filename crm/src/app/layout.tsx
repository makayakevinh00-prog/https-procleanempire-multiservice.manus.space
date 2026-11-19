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

export const viewport: Viewport = { themeColor: "#1e3a6e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Couleur choisie : appliquée avant l'affichage (aucun clignotement). Les anciens styles sombres sont retirés. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem("pce-theme")||"null");if(t){var ok=["vert","bleu","violet","ambre","rose"];if(t.accent&&ok.indexOf(t.accent)>-1)document.documentElement.dataset.accent=t.accent;if(t.skin&&t.skin!=="classique"||t.hud||(t.accent&&ok.indexOf(t.accent)<0))localStorage.setItem("pce-theme",JSON.stringify({skin:"classique",accent:ok.indexOf(t.accent)>-1?t.accent:null}))}}catch(e){}try{if(!sessionStorage.getItem("pce-lit"))document.documentElement.classList.add("lights-on")}catch(e){}` }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

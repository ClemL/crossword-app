import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Crossword — nano, micro, mini and daily puzzles",
  description:
    "Four sizes of crossword — a 3x3 nano, a 5x5 micro, a 7x7 mini and a full 15x15 daily — with a timer, solve stats and full offline play.",
  applicationName: "Crossword",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Crossword" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#12131a" },
  ],
};

// Applies the saved theme before first paint so a dark-mode user never sees a
// white flash on load.
const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('crossword:v1:settings')||'{}');if(s.theme&&s.theme!=='system'){document.documentElement.setAttribute('data-theme',s.theme)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}

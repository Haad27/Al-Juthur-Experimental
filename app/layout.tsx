import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GlobalStateProvider } from "@/lib/providers/GlobalStatesProvider";
import { inter } from "./fonts";
import BottomNav from "@/components/BottomNav";

import NextTopLoader from "nextjs-toploader";

export const metadata = {
  metadataBase: new URL("https://aljuthur.vercel.app"),
  title: {
    default: "Al-Juthur | Classical Arabic Roots, 120+ Tafsirs & AI Scholar",
    template: "%s | Al-Juthur",
  },
  description:
    "A modern Quran study platform featuring clean reading views, Surah contexts, root word analysis, 120+ Tafsirs across 33 languages, 127 translations, 13 historical lexicons, and specialized AI for accurate classical Arabic translation.",
  applicationName: "Al-Juthur",
  keywords: [
    "Quran",
    "Tafsir",
    "Arabic Roots",
    "Morphology",
    "Classical Lexicons",
    "Islamic Scholarship",
    "AI Scholar",
    "Al-Juthur",
  ],
  authors: [{ name: "Al-Juthur Research Team" }],
  creator: "Al-Juthur",
  publisher: "Al-Juthur",
  icons: {
    icon: [
      { url: "/assets/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/assets/favicon/favicon.ico",
    apple: [
      { url: "/assets/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aljuthur.vercel.app",
    siteName: "Al-Juthur",
    title: "Al-Juthur",
    description:
      "A modern Quran study platform featuring clean reading views, Surah contexts, root word analysis, 120+ Tafsirs across 33 languages, 127 translations, 13 historical lexicons, and specialized AI for accurate classical Arabic translation.",
    images: [
      {
        url: "/og-share-icon.png",
        width: 512,
        height: 512,
        alt: "Al-Juthur",
      },
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Al-Juthur",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Al-Juthur",
    description:
      "A modern Quran study platform featuring clean reading views, Surah contexts, root word analysis, 120+ Tafsirs across 33 languages, 127 translations, 13 historical lexicons, and specialized AI for accurate classical Arabic translation.",
    images: ["/og-share-icon.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content" as const,
};

/* This file is used to define the web app manifest for the Al-Juthur PWA.  */
/* It includes metadata such as the app name, description, start URL, display mode, background color, theme color, and icons. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GlobalStateProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`${inter.className} bg-zinc-950 scroll-smooth`} suppressHydrationWarning>
          <NextTopLoader 
            color="#10b981" 
            showSpinner={false} 
            height={2}
            shadow="0 0 10px #10b981,0 0 5px #10b981"
          />
          {children}
          <BottomNav />
          <Toaster />
        </body>
      </html>
    </GlobalStateProvider>
  );
}

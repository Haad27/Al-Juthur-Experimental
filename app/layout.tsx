import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GlobalStateProvider } from "@/lib/providers/GlobalStatesProvider";
import { inter, notoNastaliqUrdu } from "./fonts";
import BottomNav from "@/components/BottomNav";
import AppThemeProvider from "@/components/theme/AppThemeProvider";

import NextTopLoader from "nextjs-toploader";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://aljuthur.com"),
  title: {
    default: "Al-Juthur | 120+ Tafsirs, Classical Roots & Scholarly AI",
    template: "%s | Al-Juthur",
  },
  description:
    "Explore the depths of classical Arabic with 120+ Tafsirs, 13 historical lexicons, word-by-word root analysis, and custom scholarly AI. Traditional knowledge in a modern interface.",
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
      { url: "/assets/favicon/favicon.svg", type: "image/svg+xml" },
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
    url: "https://aljuthur.com",
    siteName: "Al-Juthur",
    title: "Al-Juthur | 120+ Tafsirs, Classical Roots & Scholarly AI",
    description:
      "Explore the depths of classical Arabic with 120+ Tafsirs, 13 historical lexicons, word-by-word root analysis, and custom scholarly AI. Traditional knowledge in a modern interface.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Al-Juthur - 120+ Tafsirs, Classical Roots & Scholarly AI",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Al-Juthur | 120+ Tafsirs, Classical Roots & Scholarly AI",
    description:
      "Explore the depths of classical Arabic with 120+ Tafsirs, 13 historical lexicons, word-by-word root analysis, and custom scholarly AI. Traditional knowledge in a modern interface.",
    images: ["/og-image.png"],
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

import GlobalModals from "@/components/popups/GlobalModals";

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className={`${inter.className} ${notoNastaliqUrdu.variable} bg-background text-foreground`} suppressHydrationWarning>
        <AppThemeProvider>
          <GlobalStateProvider>
            <NextTopLoader
              color="#8B6914"
              showSpinner={false}
              height={2}
              shadow="none"
            />
            {children}
            <BottomNav />
            <GlobalModals />
            <Toaster />
          </GlobalStateProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}

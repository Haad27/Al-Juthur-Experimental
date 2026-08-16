import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GlobalStateProvider } from "@/lib/providers/GlobalStatesProvider";
import { inter } from "./fonts";
import BottomNav from "@/components/BottomNav";

import NextTopLoader from "nextjs-toploader";

export const metadata = {
  title: "Al-Juthur",
  description: "Read and listen to quran for free - forever.",
  icons: {
    icon: "/assets/favicon/apple-touch-icon.png",
    shortcut: "/assets/favicon/apple-touch-icon.png",
    apple: "/assets/favicon/apple-touch-icon.png",
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

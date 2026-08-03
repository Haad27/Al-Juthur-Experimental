import "./globals.css";
import Head from "next/head";
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
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <body className={`${inter.className} bg-zinc-950 scroll-smooth md:pb-0 pb-28`} suppressHydrationWarning>
          <NextTopLoader 
            color="#10b981" 
            showSpinner={true} 
            template='<div class="spinner" role="spinner" style="display: block; position: fixed; z-index: 99999; inset: 0; width: 100vw; height: 100vh; top: 0 !important; right: 0 !important; transform: none !important;"><div style="position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #09090b; color: white; animation: fadeIn 0.3s;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 16rem; height: 16rem; background-color: rgba(16, 185, 129, 0.1); filter: blur(100px); border-radius: 50%; pointer-events: none;"></div><div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;"><div style="position: relative; display: flex; align-items: center; justify-content: center; width: 6rem; height: 6rem;"><img src="/assets/favicon/apple-touch-icon.png" alt="Al Juthur Logo" style="width: 4rem; height: 4rem; object-fit: contain; animation: pulse-scale 2s ease-in-out infinite;" /><div style="position: absolute; inset: 0; border-radius: 9999px; border-top: 2px solid rgba(16, 185, 129, 0.5); border-right: 2px solid transparent; animation: spin 1.5s linear infinite;"></div><div style="position: absolute; inset: 0.5rem; border-radius: 9999px; border-bottom: 2px solid rgba(16, 185, 129, 0.3); border-left: 2px solid transparent; animation: spin 2s linear infinite reverse;"></div></div><div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; margin-top: 0.5rem;"><div style="text-align: center; font-size: 0.625rem; font-weight: 700; color: rgba(16, 185, 129, 0.8); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.25rem;">Al Juthur</div><div style="text-align: center; font-size: 0.75rem; font-weight: 500; color: #a1a1aa; letter-spacing: 0.025em; margin-bottom: 0.5rem;">Preparing your experience...</div><div style="width: 12rem; height: 2px; background-color: rgba(255, 255, 255, 0.05); border-radius: 9999px; overflow: hidden; position: relative;"><div class="bar" role="bar" style="position: absolute !important; left: 0 !important; top: 0 !important; height: 100% !important; background-color: #10b981 !important; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8) !important; z-index: 101 !important;"><div class="peg" style="display: none;"></div></div></div></div></div></div></div>'
          />
          {children}
          <BottomNav />
          <Toaster />
        </body>
      </html>
    </GlobalStateProvider>
  );
}

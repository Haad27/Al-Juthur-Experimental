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
            showSpinner={true} 
            template='<div class="spinner" role="spinner" style="display: block; position: fixed; z-index: 99999; inset: 0; width: 100vw; height: 100vh; top: 0 !important; right: 0 !important; transform: none !important;"><div style="position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #09090b; color: white; animation: fadeIn 0.3s;"><div style="position: absolute; overflow: hidden; pointer-events: none; z-index: 0; inset: 0;"><div style="position: absolute; top: -20%; left: -10%; width: 70%; height: 70%; border-radius: 50%; background-color: rgba(16, 185, 129, 0.1); filter: blur(120px); animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div><div style="position: absolute; bottom: 10%; right: -10%; width: 60%; height: 60%; border-radius: 50%; background-color: rgba(20, 184, 166, 0.1); filter: blur(120px); animation: pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite 2s;"></div></div><div style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;"><div style="position: relative; display: flex; align-items: center; justify-content: center; width: 6rem; height: 6rem;"><div style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(16, 185, 129, 0.4); animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div><div style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(16, 185, 129, 0.3); animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite 1s;"></div><div style="position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(16, 185, 129, 0.2); animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite 2s;"></div><img src="/assets/favicon/apple-touch-icon.png" alt="Al Juthur Logo" style="position: relative; z-index: 10; width: 4rem; height: 4rem; object-fit: contain; filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.8)); animation: pulse-scale 2s ease-in-out infinite;" /></div><div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; margin-top: 0.5rem;"><div style="text-align: center; font-size: 0.625rem; font-weight: 700; color: rgba(16, 185, 129, 0.8); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.25rem;">Al Juthur</div><div style="text-align: center; font-size: 0.75rem; font-weight: 500; color: #a1a1aa; letter-spacing: 0.025em; margin-bottom: 0.5rem;">Preparing your experience...</div><div style="width: 12rem; height: 2px; background-color: rgba(255, 255, 255, 0.05); border-radius: 9999px; overflow: hidden; position: relative;"><div class="bar" role="bar" style="position: absolute !important; left: 0 !important; top: 0 !important; height: 100% !important; background-color: #10b981 !important; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8) !important; z-index: 101 !important;"><div class="peg" style="display: none;"></div></div></div></div></div></div></div>'
          />
          {children}
          <BottomNav />
          <Toaster />
        </body>
      </html>
    </GlobalStateProvider>
  );
}

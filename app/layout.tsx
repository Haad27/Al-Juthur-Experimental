import "./globals.css";
import Head from "next/head";
import { Toaster } from "@/components/ui/sonner";
import { GlobalStateProvider } from "@/lib/providers/GlobalStatesProvider";
import { inter } from "./fonts";
import BottomNav from "@/components/BottomNav";

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
          {children}
          <BottomNav />
          <Toaster />
        </body>
      </html>
    </GlobalStateProvider>
  );
}

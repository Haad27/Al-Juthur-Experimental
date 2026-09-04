"use client";

import { ThemeProvider } from "next-themes";

export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

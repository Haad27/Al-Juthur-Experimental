"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

export const Toaster = (props: ToasterProps) => {
  const { theme = "system", resolvedTheme = "light" } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          // Always produce a color string, never `false`
          "--normal-bg": isDark ? "#242424" : "#EFE6D0",
          "--normal-text": isDark ? "#D4D4D4" : "#5B4636",
          "--normal-border": isDark ? "#3A3A3A" : "#D4C4A8",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

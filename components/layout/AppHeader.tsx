"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import UserNav from "@/components/auth/UserNav";

const NAV = [
  { href: "/home", label: "Home", match: (p: string) => p === "/home" },
  { href: "/tafsir", label: "Tafsir", match: (p: string) => p.startsWith("/tafsir") },
  { href: "/lexicon", label: "Lexicon", match: (p: string) => p.startsWith("/lexicon") },
  { href: "/rag", label: "Juthur AI", match: (p: string) => p.startsWith("/rag") },
  { href: "/saved", label: "Library", match: (p: string) => p.startsWith("/saved") },
];

export default function AppHeader({
  rightSlot,
  subtitle,
  hideNav = false,
  className,
}: {
  rightSlot?: React.ReactNode;
  subtitle?: React.ReactNode;
  hideNav?: boolean;
  className?: string;
}) {
  const pathname = usePathname() || "";

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md", className)}>
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <Link
          href="/home"
          className="group flex min-w-0 items-center gap-2 text-foreground"
          title="Al-Juthur"
        >
          <LogoIcon size={28} className="text-accent group-hover:scale-105 transition-transform shrink-0" />
          <span className="truncate font-bold tracking-tight text-base sm:text-lg">Al-Juthur</span>
          {subtitle}
        </Link>

        {!hideNav && (
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-3.5 lg:gap-5 text-sm text-muted-foreground md:flex">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-foreground",
                    active && "font-medium text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <UserNav />
          <ThemeToggleButton />
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

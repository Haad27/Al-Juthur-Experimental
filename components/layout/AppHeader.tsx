"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", match: (p: string) => p === "/home" || p.startsWith("/surah") },
  { href: "/tafsir", label: "Tafsir", match: (p: string) => p.startsWith("/tafsir") },
  { href: "/lexicon", label: "Lexicon", match: (p: string) => p.startsWith("/lexicon") },
  { href: "/ai", label: "Translator", match: (p: string) => p.startsWith("/ai") },
  { href: "/rag", label: "AI Scholar", match: (p: string) => p.startsWith("/rag") },
];

export default function AppHeader({
  rightSlot,
  subtitle,
  hideNav = false,
}: {
  rightSlot?: React.ReactNode;
  subtitle?: React.ReactNode;
  hideNav?: boolean;
}) {
  const pathname = usePathname() || "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 pr-14 sm:px-6 sm:pr-16">
        <Link href="/home" className="flex min-w-0 items-center gap-2 text-foreground">
          <LogoIcon className="size-7 shrink-0 rounded-[20%]" />
          <span className="truncate font-semibold tracking-tight">Al-Juthur</span>
          {subtitle}
        </Link>

        {!hideNav && (
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 text-sm text-muted-foreground lg:flex">
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

        <div className="flex shrink-0 items-center gap-2">
          {rightSlot}
          <Link
            href="/saved"
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground md:flex"
            title="Saved verses, tafsirs & scholar notes"
          >
            <Bookmark className="size-3.5 text-accent" />
            <span>Saved</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

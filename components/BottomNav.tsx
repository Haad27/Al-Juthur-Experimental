"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Library,
  Languages,
  Bookmark,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { useAudioStore } from "@/lib/stores/audioStore";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const pathname = usePathname();
  const { immersiveMode, setImmersiveMode } = useGlobalState();
  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const checkAudio = () => {
      const isBodyNoScroll = typeof document !== "undefined" && document.body.classList.contains("no-scrollbar");
      setIsAudioActive(isPlayingAudio || isBodyNoScroll);
    };
    checkAudio();
    const interval = setInterval(checkAudio, 300);
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  const { isWordDialogVisible, setIsWordDialogVisible } = useGlobalState();

  React.useEffect(() => {
    setImmersiveMode(false);
    if (setIsWordDialogVisible) {
      setIsWordDialogVisible(false);
    }
  }, [pathname, setImmersiveMode, setIsWordDialogVisible]);

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: <Home className="w-5 h-5" />,
      isActive: pathname === "/home" || pathname === "/",
    },
    {
      label: "Library",
      href: "/tafsir",
      icon: <Library className="w-5 h-5" />,
      isActive: pathname?.startsWith("/tafsir"),
    },
    {
      label: "Lexicon",
      href: "/lexicon",
      icon: <Languages className="w-5 h-5" />,
      isActive: pathname?.startsWith("/lexicon"),
    },
    {
      label: "AI",
      href: "/rag",
      icon: <Sparkles className="w-5 h-5" />,
      isActive: pathname?.startsWith("/rag"),
    },
    {
      label: "Quran",
      href: "/quran",
      icon: <BookOpen className="w-5 h-5" />,
      isActive: pathname?.startsWith("/quran") || pathname?.startsWith("/surah"),
    },
  ];

  if (!mounted || typeof document === "undefined" || pathname === "/" || pathname === "/rag" || pathname?.startsWith("/rag/") || pathname?.startsWith("/rag?") || isAudioActive || isWordDialogVisible || (pathname?.startsWith("/tafsir") && immersiveMode)) return null;

  return createPortal(
    <>

      <div
        suppressHydrationWarning
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[99999] flex w-full justify-center pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          transform: "translate3d(0, 0, 0)",
          WebkitTransform: "translate3d(0, 0, 0)",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
        }}
      >
        <nav className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur-xl">
          <div className="relative flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = item.isActive;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setImmersiveMode(false)}
                  className="relative flex h-12 min-w-[54px] flex-col items-center justify-center rounded-full px-2.5 py-1 sm:px-3"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 z-0 rounded-full border border-border bg-muted"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={cn("relative z-10", isActive ? "text-foreground" : "text-muted-foreground")}>
                    {item.icon}
                  </div>
                  <span className={cn("relative z-10 mt-0.5 text-[9px] tracking-tight", isActive ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>,
    document.body
  );
};

export default BottomNav;

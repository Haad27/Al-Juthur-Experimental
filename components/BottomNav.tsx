"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ScrollText,
  Library,
  Languages,
  Bot,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { useAudioStore } from "@/lib/stores/audioStore";
import { cn } from "@/lib/utils";
import useScrollDirection from "@/hooks/useScrollDirection";

const BottomNav = () => {
  const pathname = usePathname();
  const { immersiveMode, setImmersiveMode } = useGlobalState();
  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const show = useScrollDirection();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setIsAiSheetOpen(false);
  }, [pathname]);

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

  const isAiActive = pathname?.startsWith("/ai") || pathname?.startsWith("/rag");

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: <Home className="w-5 h-5" />,
      isActive: pathname === "/home" || pathname?.startsWith("/surah"),
    },
    {
      label: "Tafsir",
      href: "/tafsir",
      icon: <ScrollText className="w-5 h-5" />,
      isActive: pathname?.startsWith("/tafsir"),
    },
    {
      label: "Lexicon",
      href: "/lexicon",
      icon: <Library className="w-5 h-5" />,
      isActive: pathname?.startsWith("/lexicon"),
    },
    {
      label: "AI Studio",
      isAction: true,
      onClick: () => setIsAiSheetOpen((prev) => !prev),
      icon: <Sparkles className="w-5 h-5" />,
      isActive: isAiActive || isAiSheetOpen,
    },
    {
      label: "Library",
      href: "/saved",
      icon: <Bookmark className="w-5 h-5" />,
      isActive: pathname?.startsWith("/saved"),
    },
  ];

  if (!mounted || typeof document === "undefined" || pathname === "/" || pathname === "/rag" || pathname?.startsWith("/rag/") || pathname?.startsWith("/rag?") || isAudioActive || isWordDialogVisible || (pathname?.startsWith("/tafsir") && immersiveMode)) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isAiSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiSheetOpen(false)}
              className="fixed inset-0 z-[99998] bg-background/60 backdrop-blur-[2px] md:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="pointer-events-auto fixed inset-x-0 bottom-[calc(5.1rem+env(safe-area-inset-bottom,0px))] z-[99999] mx-auto flex w-fit justify-center md:hidden"
              style={{
                position: "fixed",
                transform: "translate3d(0, 0, 0)",
                WebkitTransform: "translate3d(0, 0, 0)",
              }}
            >
              <div className="flex items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-xl">
                <Link
                  href="/ai"
                  onClick={() => {
                    setIsAiSheetOpen(false);
                    setImmersiveMode(false);
                  }}
                  className={cn(
                    "relative flex h-12 min-w-[62px] flex-col items-center justify-center rounded-full px-3.5 py-1 transition-colors",
                    pathname?.startsWith("/ai")
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Languages className="mb-0.5 w-5 h-5" />
                  <span className="text-[9px] tracking-tight">Translator</span>
                </Link>

                <div className="h-6 w-px shrink-0 bg-border" />

                <Link
                  href="/rag"
                  onClick={() => {
                    setIsAiSheetOpen(false);
                    setImmersiveMode(false);
                  }}
                  className={cn(
                    "relative flex h-12 min-w-[62px] flex-col items-center justify-center rounded-full px-3.5 py-1 transition-colors",
                    pathname?.startsWith("/rag")
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Bot className="mb-0.5 w-5 h-5" />
                  <span className="text-[9px] tracking-tight">Juthur AI</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        suppressHydrationWarning
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[99999] flex w-full justify-center pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:hidden transition-transform duration-300 ease-in-out",
          show ? "translate-y-0" : "translate-y-[150%]"
        )}
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

              if (item.isAction) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="relative flex h-12 min-w-[54px] cursor-pointer flex-col items-center justify-center rounded-full px-2.5 py-1 sm:px-3"
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
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href!}
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

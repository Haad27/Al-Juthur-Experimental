"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  ScrollText, 
  Library, 
  Languages, 
  Bot, 
  Bookmark, 
  Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { useAudioStore } from "@/lib/stores/audioStore";

const BottomNav = () => {
  const pathname = usePathname();
  const { immersiveMode, setImmersiveMode } = useGlobalState();
  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close mini AI bar on route change
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

  const isImmersive = immersiveMode && (pathname?.startsWith("/tafsir") || pathname?.startsWith("/lexicon"));

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

  if (!mounted || pathname === "/" || pathname === "/rag" || pathname?.startsWith("/rag/") || pathname?.startsWith("/rag?") || isAudioActive || isWordDialogVisible || (pathname?.startsWith("/tafsir") && immersiveMode)) return null;

  return (
    <>
      {/* Floating Mini AI Studio Bar (Appears vertically directly above bottom nav) */}
      <AnimatePresence>
        {isAiSheetOpen && (
          <>
            {/* Backdrop to tap-outside and dismiss */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiSheetOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            />

            {/* Mini Floating Navbar Pill with 2 AI Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom,0px))] inset-x-0 mx-auto w-fit z-50 md:hidden flex justify-center pointer-events-auto"
            >
              <div className="rounded-full border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.2)] px-2 py-1.5 flex items-center gap-1">
                {/* 1. Translator */}
                <Link
                  href="/ai"
                  onClick={() => {
                    setIsAiSheetOpen(false);
                    setImmersiveMode(false);
                  }}
                  className={`relative flex flex-col items-center justify-center px-3.5 py-1 min-w-[62px] h-12 rounded-full transition-colors duration-200 ${
                    pathname?.startsWith("/ai")
                      ? "text-emerald-400 font-bold bg-white/[0.12] border border-white/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Languages className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] tracking-tight">Translator</span>
                </Link>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-800 shrink-0" />

                {/* 2. AI Scholar */}
                <Link
                  href="/rag"
                  onClick={() => {
                    setIsAiSheetOpen(false);
                    setImmersiveMode(false);
                  }}
                  className={`relative flex flex-col items-center justify-center px-3.5 py-1 min-w-[62px] h-12 rounded-full transition-colors duration-200 ${
                    pathname?.startsWith("/rag")
                      ? "text-emerald-400 font-bold bg-white/[0.12] border border-white/10"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bot className="w-5 h-5 mb-0.5" />
                  <span className="text-[9px] tracking-tight">AI Scholar</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Primary Floating Bottom Nav Bar */}
      <div 
        suppressHydrationWarning 
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] inset-x-0 mx-auto w-fit max-w-[95vw] z-50 md:hidden pointer-events-none flex justify-center"
        style={{ transform: "none", WebkitTransform: "none" }}
      >
        <nav className="pointer-events-auto rounded-full border border-emerald-500/35 bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_15px_rgba(16,185,129,0.15)] px-2 py-1.5 flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 relative">
            {navItems.map((item) => {
              const isActive = item.isActive;

              if (item.isAction) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="relative flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 min-w-[54px] h-12 rounded-full transition-colors duration-300 cursor-pointer"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className={`absolute inset-0 rounded-full z-0 ${
                          isImmersive 
                            ? "bg-amber-500/20 border border-amber-500/40" 
                            : "bg-white/[0.12] border border-white/10"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    
                    <motion.div
                      animate={{
                        y: isActive ? -1 : 0,
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={`relative z-10 flex items-center justify-center transition-colors duration-300 ${
                        isActive ? (isImmersive ? "text-amber-400" : "text-emerald-400") : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {item.icon}
                    </motion.div>
                    
                    <span 
                      className={`relative z-10 text-[9px] tracking-tight mt-0.5 transition-all duration-300 ${
                        isActive 
                          ? (isImmersive ? "text-amber-400 font-bold" : "text-emerald-400 font-bold")
                          : "text-zinc-500 font-medium hover:text-zinc-300"
                      }`}
                    >
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
                  className="relative flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 min-w-[54px] h-12 rounded-full transition-colors duration-300"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className={`absolute inset-0 rounded-full z-0 ${
                        isImmersive 
                          ? "bg-amber-500/20 border border-amber-500/40" 
                          : "bg-white/[0.12] border border-white/10"
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    animate={{
                      y: isActive ? -1 : 0,
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative z-10 flex items-center justify-center transition-colors duration-300 ${
                      isActive ? (isImmersive ? "text-amber-400" : "text-emerald-400") : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {item.icon}
                  </motion.div>
                  
                  <span 
                    className={`relative z-10 text-[9px] tracking-tight mt-0.5 transition-all duration-300 ${
                      isActive 
                        ? (isImmersive ? "text-amber-400 font-bold" : "text-emerald-400 font-bold")
                        : "text-zinc-500 font-medium hover:text-zinc-300"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

export default BottomNav;

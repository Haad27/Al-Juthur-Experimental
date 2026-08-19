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
  Sparkles, 
  X, 
  ArrowRight,
  ChevronRight
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

  // Close AI sheet on route change
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

  if (!mounted || pathname === "/" || pathname?.startsWith("/rag/chat") || isAudioActive || isWordDialogVisible || (pathname?.startsWith("/tafsir") && immersiveMode)) return null;

  return (
    <>
      {/* AI Studio Bottom Sheet Modal */}
      <AnimatePresence>
        {isAiSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiSheetOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-zinc-950 border-t border-emerald-500/30 rounded-t-3xl p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] md:hidden flex flex-col gap-4"
            >
              {/* Header Handle & Title */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">Al-Juthur AI Studio</h3>
                    <p className="text-[11px] text-zinc-400">Select an intelligent research assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiSheetOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Tools Options */}
              <div className="grid grid-cols-1 gap-3">
                {/* 1. AI Translator */}
                <Link
                  href="/ai"
                  onClick={() => setIsAiSheetOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                      <Languages className="size-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        AI Classical Translator
                      </span>
                      <span className="text-[11px] text-zinc-400 leading-tight truncate">
                        Translate complex Arabic tafsirs & texts into structured formats
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                {/* 2. RAG Bot */}
                <Link
                  href="/rag"
                  onClick={() => setIsAiSheetOpen(false)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                      <Bot className="size-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        Academic RAG Bot
                      </span>
                      <span className="text-[11px] text-zinc-400 leading-tight truncate">
                        Multi-modal hybrid retrieval across 6 scholarly modes
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav Bar */}
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

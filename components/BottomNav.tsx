"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ScrollText, Library, Languages, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";

import { useAudioStore } from "@/lib/stores/audioStore";

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

  React.useEffect(() => {
    setImmersiveMode(false);
  }, [pathname, setImmersiveMode]);

  const isImmersive = immersiveMode && (pathname?.startsWith("/tafsir") || pathname?.startsWith("/lexicon"));

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: "Tafsir",
      href: "/tafsir",
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      label: "Lexicon",
      href: "/lexicon",
      icon: <Library className="w-5 h-5" />,
    },
    {
      label: "Translator",
      href: "/ai",
      icon: <Languages className="w-5 h-5" />,
    },
    {
      label: "RAG Bot",
      href: "/rag",
      icon: <Bot className="w-5 h-5" />,
    },
  ];

  if (!mounted || pathname === "/" || isAudioActive) return null;

  return (
    <div suppressHydrationWarning className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 md:hidden">
      <nav className="rounded-full border border-zinc-700/50 border-t-zinc-600/50 bg-zinc-950/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] px-2 py-1.5">
        <div className="flex justify-around items-center h-14 relative">
          {navItems.map((item) => {
            const isActive = 
              (item.label === "Home" && pathname === "/home") ||
              (item.label === "Surah" && pathname?.startsWith("/surah")) ||
              (item.label === "Tafsir" && pathname?.startsWith("/tafsir")) ||
              (item.label === "Lexicon" && pathname?.startsWith("/lexicon")) ||
              (item.label === "Translator" && pathname?.startsWith("/ai")) ||
              (item.label === "AI Translator" && pathname?.startsWith("/ai")) ||
              (item.label === "RAG Bot" && pathname?.startsWith("/rag"));

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setImmersiveMode(false)}
                className="relative flex flex-col items-center justify-center w-full h-full rounded-full transition-colors duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className={`absolute inset-x-1 inset-y-1 rounded-2xl z-0 ${
                      isImmersive 
                        ? "bg-amber-500/15 border border-amber-500/30" 
                        : "bg-white/[0.08] border border-white/[0.04]"
                    }`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <motion.div
                  animate={{
                    y: isActive ? -2 : 0,
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
                  className={`relative z-10 text-[9px] tracking-wide mt-1 transition-all duration-300 ${
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
  );
};

export default BottomNav;

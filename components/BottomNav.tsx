"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ScrollText, Library, Languages, Bot } from "lucide-react";
import { motion } from "framer-motion";

const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
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
      label: "AI Translator",
      href: "/ai",
      icon: <Languages className="w-5 h-5" />,
    },
    {
      label: "RAG Bot",
      href: "/rag",
      icon: <Bot className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 md:hidden">
      <nav className="rounded-full border border-white/[0.08] border-t-white/[0.15] bg-white/[0.07] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] px-2 py-1.5">
        <div className="flex justify-around items-center h-14 relative">
          {navItems.map((item) => {
            const isActive = 
              (item.label === "Home" && pathname === "/") ||
              (item.label === "Surah" && pathname?.startsWith("/surah")) ||
              (item.label === "Tafsir" && pathname?.startsWith("/tafsir")) ||
              (item.label === "Lexicon" && pathname?.startsWith("/lexicon")) ||
              (item.label === "AI Translator" && pathname?.startsWith("/ai")) ||
              (item.label === "RAG Bot" && pathname?.startsWith("/rag"));

            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex flex-col items-center justify-center w-full h-full rounded-full transition-colors duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-x-1 inset-y-1 bg-white/[0.08] border border-white/[0.04] rounded-2xl z-0"
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
                    isActive ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {item.icon}
                </motion.div>
                
                <span 
                  className={`relative z-10 text-[9px] tracking-wide mt-1 transition-all duration-300 ${
                    isActive 
                      ? "text-emerald-400 font-bold" 
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

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAskScholarButtonProps {
  onClick: () => void;
  label?: string;
  isVisible?: boolean;
}

export default function FloatingAskScholarButton({
  onClick,
  label = "Ask Scholar",
  isVisible = true,
}: FloatingAskScholarButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-6 md:bottom-8 md:right-8 z-[90] flex items-center justify-center"
        >
          {/* Calming glow ring that pulses */}
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl animate-pulse scale-150 pointer-events-none" />
          
          <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-full p-4 md:p-4",
              "bg-zinc-950/80 backdrop-blur-md border border-emerald-500/30",
              "shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
              "transition-all duration-300 ease-out group overflow-hidden"
            )}
          >
            {/* Shimmer effect inside the button */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative flex items-center justify-center">
              <Bot className="size-6 text-emerald-400 group-hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-bounce" />
              {/* Little sparkles that appear on hover */}
              <Sparkles className="absolute -top-1 -right-1 size-3 text-teal-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
            </div>

            {/* Desktop: Animated on hover */}
            <motion.div
              initial={false}
              animate={{
                width: isHovered ? "auto" : 0,
                opacity: isHovered ? 1 : 0,
                marginLeft: isHovered ? "0.25rem" : 0
              }}
              className="hidden md:flex overflow-hidden whitespace-nowrap items-center"
            >
              <span className="text-sm font-semibold tracking-wide text-emerald-100 group-hover:text-white pr-2">
                {label}
              </span>
            </motion.div>

            {/* Mobile: Always visible, shorter text */}
            <div className="flex md:hidden overflow-hidden whitespace-nowrap items-center ml-1">
              <span className="text-[13px] font-bold tracking-wide text-emerald-100 pr-1">
                {label.replace(" Tafsir ", " ").replace(" Lexicon ", " ")}
              </span>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

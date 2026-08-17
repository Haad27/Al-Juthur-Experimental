"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAskScholarButtonProps {
  onClick: () => void;
  label?: string;
  isVisible?: boolean;
  className?: string;
}

export default function FloatingAskScholarButton({
  onClick,
  label = "Ask Scholar",
  isVisible = true,
  className,
}: FloatingAskScholarButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "fixed right-4 md:right-6 z-[90] flex items-center justify-center",
            className || "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6"
          )}
        >
          <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label={label}
            title={label}
            className={cn(
              "relative flex items-center justify-center rounded-full border border-emerald-500/50 hover:border-emerald-400 bg-zinc-950/80 hover:bg-zinc-900/90 backdrop-blur-xl shadow-[0_4px_25px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.45)] active:scale-95 transition-all duration-300 ease-out group overflow-hidden cursor-pointer",
              // Mobile: pure circle FAB (size-12) | Desktop: expands padding on hover
              "size-12 md:size-auto md:p-3.5"
            )}
          >
            {/* Ambient emerald blur glow */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-emerald-400/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            {/* Icon */}
            <div className="relative flex items-center justify-center shrink-0">
              <Bot className="size-5 text-emerald-300 group-hover:text-emerald-200 transition-colors animate-bounce" />
              <Sparkles className="absolute -top-1 -right-1 size-3 text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
            </div>

            {/* Desktop: Smoothly expand label on hover */}
            <motion.div
              initial={false}
              animate={{
                width: isHovered ? "auto" : 0,
                opacity: isHovered ? 1 : 0,
                marginLeft: isHovered ? "0.35rem" : 0
              }}
              className="hidden md:flex overflow-hidden whitespace-nowrap items-center"
            >
              <span className="text-sm font-semibold tracking-wide text-white pr-2">
                {label}
              </span>
            </motion.div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

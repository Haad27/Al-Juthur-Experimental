"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, X } from "lucide-react";
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
  const [isCollapsedMobile, setIsCollapsedMobile] = useState(false);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={cn(
            "fixed right-4 md:bottom-6 md:right-6 z-[90] flex items-center justify-center",
            className || "bottom-[calc(6rem+env(safe-area-inset-bottom,0px))]"
          )}
        >
          <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-full p-3.5 md:p-3.5 text-emerald-400 font-medium border border-emerald-500/70 hover:border-emerald-400 opacity-95 hover:opacity-100 transition-all duration-300 ease-out group overflow-hidden cursor-pointer",
              "bg-transparent shadow-none backdrop-blur-none"
            )}
          >
            {/* Shimmer effect inside the button */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative flex items-center justify-center">
              <Bot className="size-5 text-white transition-colors animate-bounce" />
              {/* Little sparkles that appear on hover */}
              <Sparkles className="absolute -top-1 -right-1 size-3 text-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
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
              <span className="text-sm font-semibold tracking-wide text-white pr-2">
                {label}
              </span>
            </motion.div>

            {/* Mobile: Always visible (unless collapsed), shorter text */}
            {!isCollapsedMobile && (
              <div className="flex md:hidden overflow-hidden whitespace-nowrap items-center ml-1">
                <span className="text-[13px] font-bold tracking-wide text-white pr-1">
                  {label.replace(" Tafsir ", " ").replace(" Lexicon ", " ")}
                </span>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsedMobile(true);
                  }}
                  className="p-1 -mr-2 ml-1 text-emerald-300/80 hover:text-emerald-100 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Collapse button"
                >
                  <X className="size-3.5" />
                </div>
              </div>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

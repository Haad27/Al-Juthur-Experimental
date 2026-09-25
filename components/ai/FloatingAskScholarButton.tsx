"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import useScrollDirection from "@/hooks/useScrollDirection";

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
  const showNav = useScrollDirection();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "fixed right-4 md:right-6 z-[90] flex items-center justify-center transition-all duration-300",
            showNav 
              ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6"
              : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6",
            className
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
              "relative flex items-center justify-center rounded-full border border-border bg-card/90 hover:bg-muted backdrop-blur-xl shadow-md active:scale-95 transition-all duration-200 ease-out group overflow-hidden cursor-pointer",
              "size-12 md:size-auto md:p-3.5"
            )}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Bot className="size-5 text-foreground" />
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
              <span className="text-sm font-medium tracking-wide text-foreground pr-2">
                {label}
              </span>
            </motion.div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

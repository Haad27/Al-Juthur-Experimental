"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { amiri, lora, inter } from "@/app/fonts";

export interface TafsirBookCoverProps {
  title: string;
  arabicTitle?: string;
  author: string;
  era?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  coverTheme?: "burgundy" | "emerald" | "navy" | "sepia" | "charcoal" | "amber";
  badge?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showSpineShadow?: boolean;
}

const THEME_STYLES: Record<string, { bg: string; border: string; accent: string; text: string }> = {
  burgundy: {
    bg: "from-[#381119] via-[#280b12] to-[#1a060a]",
    border: "border-[#8a424e]/50",
    accent: "text-[#e8b98a]",
    text: "text-[#f3e6d8]",
  },
  emerald: {
    bg: "from-[#0f2d24] via-[#091e17] to-[#04120e]",
    border: "border-[#2b6d58]/50",
    accent: "text-[#a2dfc8]",
    text: "text-[#e6f4ee]",
  },
  navy: {
    bg: "from-[#12233b] via-[#0b1728] to-[#050c17]",
    border: "border-[#315785]/50",
    accent: "text-[#b2d5ff]",
    text: "text-[#e8f1fc]",
  },
  sepia: {
    bg: "from-[#3f2c1d] via-[#2c1d12] to-[#1c120a]",
    border: "border-[#826042]/50",
    accent: "text-[#dfbe95]",
    text: "text-[#f5ece3]",
  },
  charcoal: {
    bg: "from-[#25282c] via-[#1a1b1e] to-[#101113]",
    border: "border-[#52575f]/50",
    accent: "text-[#d1d5db]",
    text: "text-[#f3f4f6]",
  },
  amber: {
    bg: "from-[#3d2b0e] via-[#2a1c07] to-[#191003]",
    border: "border-[#85632a]/50",
    accent: "text-[#fad58a]",
    text: "text-[#fdf5e7]",
  },
};

export default function TafsirBookCover({
  title,
  arabicTitle,
  author,
  era,
  difficulty,
  coverTheme = "sepia",
  badge,
  size = "md",
  className,
  showSpineShadow = true,
}: TafsirBookCoverProps) {
  const theme = THEME_STYLES[coverTheme] || THEME_STYLES.sepia;

  const sizeDimensions = {
    sm: "w-[120px] h-[175px] text-[10px]",
    md: "w-[160px] h-[235px] text-xs",
    lg: "w-[200px] h-[290px] text-sm",
  }[size];

  return (
    <div
      className={cn(
        "relative select-none shrink-0 rounded-r-md rounded-l-[3px] shadow-xl overflow-hidden group transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl",
        "bg-gradient-to-br",
        theme.bg,
        sizeDimensions,
        className
      )}
      style={{
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Spine 3D Crease & Shadow */}
      {showSpineShadow && (
        <div className="absolute inset-y-0 left-0 w-3.5 z-20 pointer-events-none flex">
          {/* Deep crease groove */}
          <div className="w-[3px] h-full bg-black/40 border-r border-white/10" />
          {/* Highlight sheen along spine ridge */}
          <div className="w-[4px] h-full bg-gradient-to-r from-white/15 to-transparent" />
          <div className="flex-1 h-full bg-gradient-to-r from-black/25 to-transparent" />
        </div>
      )}

      {/* Book Outer Embossed Border Frame */}
      <div className="absolute inset-1.5 sm:inset-2 rounded-sm border border-accent/30 pointer-events-none z-10">
        <div className="absolute inset-0.5 border border-accent/20 rounded-[2px]" />
        
        {/* Subtle corner ornamental squares */}
        <div className="absolute -top-1 -left-1 size-1.5 bg-accent/40 rotate-45" />
        <div className="absolute -top-1 -right-1 size-1.5 bg-accent/40 rotate-45" />
        <div className="absolute -bottom-1 -left-1 size-1.5 bg-accent/40 rotate-45" />
        <div className="absolute -bottom-1 -right-1 size-1.5 bg-accent/40 rotate-45" />
      </div>

      {/* Book Cover Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-3.5 pl-4 sm:p-4 sm:pl-5 text-center">
        {/* Header Badge */}
        <div className="min-h-5 flex items-center justify-center">
          {badge ? (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-black/40 text-[9px] font-semibold text-accent border border-accent/30 tracking-tight uppercase">
              {badge}
            </span>
          ) : difficulty ? (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-black/30 text-[9px] font-medium text-accent border border-accent/20">
              {difficulty}
            </span>
          ) : (
            <div className="w-4 h-0.5 bg-accent/30 rounded-full mx-auto" />
          )}
        </div>

        {/* Center Titles */}
        <div className="flex flex-col items-center justify-center my-auto py-1">
          {arabicTitle && (
            <p
              className={cn(
                amiri.className,
                "text-arabic text-sm sm:text-base leading-snug line-clamp-2 text-accent drop-shadow-sm mb-1 px-1 font-bold"
              )}
              dir="rtl"
            >
              {arabicTitle}
            </p>
          )}
          <h3
            className={cn(
              lora.className,
              "font-serif font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-foreground drop-shadow-sm px-1"
            )}
          >
            {title}
          </h3>
          <div className="w-8 h-px bg-accent/40 my-1.5" />
          <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground line-clamp-1 px-1">
            {author}
          </p>
        </div>

        {/* Footer info */}
        <div className="pt-1 border-t border-accent/15 flex items-center justify-between text-[9px] text-muted-foreground">
          <span className="truncate max-w-[85px]">{era ? era.split("(")[0].trim() : "Classical"}</span>
          <span className="text-accent font-semibold tracking-wider">AL-JUTHUR</span>
        </div>
      </div>

      {/* Subtle paper / cloth sheen on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5 opacity-80 pointer-events-none group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

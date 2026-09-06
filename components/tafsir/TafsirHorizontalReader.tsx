"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurahMeta } from "@/lib/surahsData";

interface TafsirHorizontalReaderProps {
  currentAyahIndex: number;
  totalAyahs: number;
  onAyahChange: (newIndex: number) => void;
  activeSurah: number;
  activeLangName: string;
  currentSurahMeta: SurahMeta;
  children: React.ReactNode;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 32 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 320, damping: 32 },
      opacity: { duration: 0.15 },
    },
  }),
};

export default function TafsirHorizontalReader({
  currentAyahIndex,
  totalAyahs,
  onAyahChange,
  activeSurah,
  activeLangName,
  currentSurahMeta,
  children,
}: TafsirHorizontalReaderProps) {
  const [direction, setDirection] = useState<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // Scroll card content to top whenever ayah changes
  useEffect(() => {
    if (cardScrollRef.current) {
      cardScrollRef.current.scrollTop = 0;
    }
  }, [currentAyahIndex]);

  const canGoPrev = currentAyahIndex > 0;
  const canGoNext = currentAyahIndex < totalAyahs - 1;

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;
    setDirection(-1);
    onAyahChange(currentAyahIndex - 1);
  }, [canGoPrev, currentAyahIndex, onAyahChange]);

  const handleNext = useCallback(() => {
    if (!canGoNext) return;
    setDirection(1);
    onAyahChange(currentAyahIndex + 1);
  }, [canGoNext, currentAyahIndex, onAyahChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Only swipe if horizontal movement is dominant and greater than 45px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const progressPercent = totalAyahs > 0
    ? Math.round(((currentAyahIndex + 1) / totalAyahs) * 100)
    : 0;

  return (
    <div
      className="flex-1 w-full max-w-5xl mx-auto flex flex-col h-full min-h-0 overflow-hidden relative select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Main Reader Card with Slide Animation ── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-1 sm:p-2 md:p-4">
        {/* Floating Desktop Chevrons */}
        <button
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={cn(
            "hidden lg:flex absolute left-0 z-30 size-11 rounded-full items-center justify-center border border-border bg-card/80 backdrop-blur-md shadow-lg transition-all duration-200 cursor-pointer -translate-x-3",
            canGoPrev
              ? "text-foreground hover:bg-accent/15 hover:text-accent hover:border-accent/40 active:scale-95"
              : "opacity-25 text-muted-foreground cursor-not-allowed pointer-events-none"
          )}
          title="Previous Ayah (Arrow Left)"
        >
          <ChevronLeft className="size-5" />
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className={cn(
            "hidden lg:flex absolute right-0 z-30 size-11 rounded-full items-center justify-center border border-border bg-card/80 backdrop-blur-md shadow-lg transition-all duration-200 cursor-pointer translate-x-3",
            canGoNext
              ? "text-foreground hover:bg-accent/15 hover:text-accent hover:border-accent/40 active:scale-95"
              : "opacity-25 text-muted-foreground cursor-not-allowed pointer-events-none"
          )}
          title="Next Ayah (Arrow Right)"
        >
          <ChevronRight className="size-5" />
        </button>

        {/* The Card Viewport */}
        <div
          ref={cardScrollRef}
          className="w-full h-full rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar shadow-sm relative select-text"
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={`reader-ayah-${activeSurah}-${currentAyahIndex}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full min-h-full flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Reader Toolbar / Scrubber ── */}
      <div className="shrink-0 pt-2 pb-1 px-3 sm:px-6 w-full flex flex-col gap-2 border-t border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              canGoPrev
                ? "border-border bg-card hover:bg-accent/10 hover:text-accent hover:border-accent/30 text-foreground active:scale-95"
                : "border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page / Ayah Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground tracking-wide font-mono">
              Ayah {currentAyahIndex + 1}
            </span>
            <span className="text-[11px] text-muted-foreground">of</span>
            <span className="text-xs font-semibold text-muted-foreground font-mono">
              {totalAyahs}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold ml-1">
              {progressPercent}%
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              canGoNext
                ? "border-border bg-card hover:bg-accent/10 hover:text-accent hover:border-accent/30 text-foreground active:scale-95"
                : "border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Progress Bar / Scrubber */}
        <div className="w-full flex items-center gap-2">
          <div
            className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden relative cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const targetAyah = Math.min(totalAyahs - 1, Math.floor(ratio * totalAyahs));
              setDirection(targetAyah > currentAyahIndex ? 1 : -1);
              onAyahChange(targetAyah);
            }}
            title="Click to jump across Surah"
          >
            <div
              className="h-full bg-accent transition-all duration-200 rounded-full group-hover:bg-accent/90"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

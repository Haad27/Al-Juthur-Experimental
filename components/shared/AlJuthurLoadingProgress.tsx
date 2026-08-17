"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { cn } from "@/lib/utils";

interface AlJuthurLoadingProgressProps {
  title?: string;
  subtitle?: string;
  statusMessages?: string[];
  isOverlay?: boolean;
  className?: string;
  minDurationMs?: number;
}

const DEFAULT_STATUS_MESSAGES = [
  "Connecting to Quranic resources...",
  "Retrieving verse linguistics & translations...",
  "Aligning scholarly notes & footnotes...",
  "Finalizing high-precision layout..."
];

export default function AlJuthurLoadingProgress({
  title = "Loading Content",
  subtitle = "Al-Juthur Islamic Knowledge Engine",
  statusMessages = DEFAULT_STATUS_MESSAGES,
  isOverlay = false,
  className,
  minDurationMs = 800,
}: AlJuthurLoadingProgressProps) {
  const [progress, setProgress] = useState(15);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Simulated realistic progress curve: fast initial climb, gradual plateau, smooth completion
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const factor = Math.min(1, elapsed / minDurationMs);

      if (factor < 0.3) {
        setProgress(Math.min(45, Math.floor(15 + factor * 100)));
      } else if (factor < 0.7) {
        setProgress(Math.min(78, Math.floor(45 + (factor - 0.3) * 80)));
      } else if (factor < 0.95) {
        setProgress(Math.min(92, Math.floor(78 + (factor - 0.7) * 55)));
      } else {
        setProgress(96);
      }
    }, 50);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, [minDurationMs, statusMessages.length]);

  const content = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl border border-emerald-500/25 bg-zinc-950/90 dark:bg-zinc-950/90 shadow-[0_0_50px_rgba(16,185,129,0.12)] backdrop-blur-2xl overflow-hidden max-w-md w-full mx-auto text-center transition-all duration-300",
        className
      )}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
      
      {/* Top subtle emerald border shimmer */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      {/* Branded Logo with pulsing ripple rings */}
      <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-5">
        <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-1 rounded-full border border-emerald-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-md animate-pulse" />
        
        <div className="relative z-10 p-3.5 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center">
          <LogoIcon className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
        </div>
      </div>

      {/* Header Titles */}
      <div className="space-y-1 mb-6">
        <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-wide">
          {title}
        </h3>
        <p className="text-[11px] font-medium text-emerald-400/80 uppercase tracking-widest">
          {subtitle}
        </p>
      </div>

      {/* Progress Bar & Percentage */}
      <div className="w-full space-y-2 mb-4">
        <div className="flex items-center justify-between text-[11px] font-mono px-0.5">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Loading
          </span>
          <span className="text-emerald-400 font-bold tracking-wider">
            {progress}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="relative w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shadow-inner">
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            initial={{ width: "10%" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          {/* Shimmer light sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.4s_infinite]" />
        </div>
      </div>

      {/* Dynamic Status message */}
      <div className="h-5 flex items-center justify-center overflow-hidden">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="text-xs text-zinc-400 font-medium truncate"
        >
          {statusMessages[messageIndex]}
        </motion.p>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[99999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return <div className="w-full flex justify-center py-12 px-4">{content}</div>;
}

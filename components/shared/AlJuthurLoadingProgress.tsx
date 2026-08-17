"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AlJuthurLoadingProgressProps {
  title?: string;
  subtitle?: string;
  isOverlay?: boolean;
  className?: string;
  minDurationMs?: number;
}

export default function AlJuthurLoadingProgress({
  title = "Al Juthur",
  subtitle = "Loading Tafsir & Scholarly Commentary...",
  isOverlay = false,
  className,
  minDurationMs = 700,
}: AlJuthurLoadingProgressProps) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
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
    }, 40);

    return () => {
      clearInterval(interval);
    };
  }, [minDurationMs]);

  const content = (
    <div className={cn("relative flex flex-col items-center gap-6 text-center animate-in fade-in duration-300 py-12", className)}>
      {/* Ripple Rings & Logo */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "2s" }} />
        
        <img
          src="/assets/favicon/apple-touch-icon.png"
          alt="Al Juthur Logo"
          className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] relative z-10"
        />
      </div>

      <div className="flex flex-col items-center gap-2 w-full mt-2">
        <div className="text-center text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">
          {title}
        </div>
        <div className="text-center text-[12px] font-medium text-zinc-400 tracking-wide mb-1 max-w-sm">
          {subtitle}
        </div>

        {/* Minimal Progress Bar & Percentage */}
        <div className="flex flex-col items-center gap-1.5 w-48 mt-1">
          <div className="w-full h-[2px] bg-zinc-800 rounded-full overflow-hidden relative">
            <div
              className="absolute top-0 left-0 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-semibold text-emerald-400/90 tracking-wider">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md text-white animate-in fade-in duration-300">
        {content}
      </div>
    );
  }

  return <div className="w-full flex justify-center">{content}</div>;
}

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface AlJuthurLoadingProgressProps {
  title?: string;
  subtitle?: string;
  statusMessages?: string[];
  isOverlay?: boolean;
  className?: string;
  minDurationMs?: number;
}

export default function AlJuthurLoadingProgress({
  title = "Al Juthur",
  subtitle = "Loading Tafsir & Scholarly Commentary...",
  statusMessages,
  isOverlay = false,
  className,
  minDurationMs = 700,
}: AlJuthurLoadingProgressProps) {
  const [progress, setProgress] = useState(15);
  const [messageIndex, setMessageIndex] = useState(0);

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

    let msgInterval: any = null;
    if (statusMessages && statusMessages.length > 1) {
      msgInterval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % statusMessages.length);
      }, 1500);
    }

    return () => {
      clearInterval(interval);
      if (msgInterval) clearInterval(msgInterval);
    };
  }, [minDurationMs, statusMessages]);

  const activeSubtitle = statusMessages && statusMessages.length > 0
    ? statusMessages[messageIndex]
    : subtitle;

  const content = (
    <div className={cn("relative flex flex-col items-center gap-6 text-center animate-in fade-in duration-300 py-12", className)}>
      {/* Ripple Rings & Logo (Identical to homepage loader) */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full border border-zinc-400/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-0 rounded-full border border-zinc-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 rounded-full border border-slate-400/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "2s" }} />
        
        <img
          src="/assets/favicon/apple-touch-icon.png"
          alt="Al Juthur Logo"
          className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_0_20px_rgba(241,245,249,0.45)] relative z-10"
        />
      </div>

      <div className="flex flex-col items-center gap-2 w-full mt-2">
        <div className="text-center text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">
          {title}
        </div>
        <div className="text-center text-[12px] font-medium text-zinc-400 tracking-wide mb-1 max-w-sm">
          {activeSubtitle}
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

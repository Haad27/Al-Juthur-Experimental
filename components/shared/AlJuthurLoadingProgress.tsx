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
    <div className={cn("relative flex flex-col items-center gap-4 text-center py-8", className)}>

      <div className="flex flex-col items-center gap-2 w-full mt-2">
        <div className="text-center text-[10px] font-bold text-accent uppercase tracking-[0.25em] mb-0.5">
          {title}
        </div>
        <div className="text-center text-[12px] font-medium text-reading tracking-wide mb-1 max-w-sm">
          {activeSubtitle}
        </div>

        {/* Clean Luminous Emerald Progress Bar */}
        <div className="flex flex-col gap-1.5 w-60 mt-1">
          <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="text-accent">Loading</span>
            <span className="text-accent font-mono font-bold">{progress}%</span>
          </div>
          <div className="w-full h-[2.5px] bg-accent/10 rounded-full relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent via-accent to-primary rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md text-foreground animate-in fade-in duration-300">
        {content}
      </div>
    );
  }

  return <div className="w-full flex justify-center">{content}</div>;
}

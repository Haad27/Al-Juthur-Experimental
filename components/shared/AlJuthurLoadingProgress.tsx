"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlJuthurLoadingProgressProps {
  title?: string;
  subtitle?: string;
  statusMessages?: string[];
  isOverlay?: boolean;
  className?: string;
  minDurationMs?: number;
  value?: number;
  isOffline?: boolean;
  onRetry?: () => void;
}

export default function AlJuthurLoadingProgress({
  title = "Al Juthur",
  subtitle = "Loading Tafsir & Scholarly Commentary...",
  statusMessages,
  isOverlay = false,
  className,
  minDurationMs = 2000,
  value,
  isOffline: propIsOffline,
  onRetry,
}: AlJuthurLoadingProgressProps) {
  const [internalProgress, setInternalProgress] = useState(12);
  const [messageIndex, setMessageIndex] = useState(0);
  const [localOffline, setLocalOffline] = useState(false);

  // Detect offline status
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setLocalOffline(!navigator.onLine);
    }

    const handleOnline = () => setLocalOffline(false);
    const handleOffline = () => setLocalOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isOffline = propIsOffline ?? localOffline;

  // Realistic human-paced progress animation when not controlled externally
  useEffect(() => {
    if (value !== undefined) return;
    if (isOffline) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;

      // Natural, realistic progress curve:
      // - 0s to 1.8s: 12% -> 50% (50% is genuinely in the middle of typical response)
      // - 1.8s to 4.0s: 50% -> 75%
      // - 4.0s to 8.0s: 75% -> 88%
      // - >8s: asymptotic slow crawl up to max 91%
      if (elapsedSec <= 1.8) {
        setInternalProgress(Math.floor(12 + (38 * elapsedSec) / 1.8));
      } else if (elapsedSec <= 4.0) {
        setInternalProgress(Math.floor(50 + (25 * (elapsedSec - 1.8)) / 2.2));
      } else if (elapsedSec <= 8.0) {
        setInternalProgress(Math.floor(75 + (13 * (elapsedSec - 4.0)) / 4.0));
      } else {
        setInternalProgress(Math.min(91, Math.floor(88 + Math.log(elapsedSec - 7))));
      }
    }, 60);

    return () => clearInterval(interval);
  }, [value, isOffline]);

  // Status message rotation
  useEffect(() => {
    if (!statusMessages || statusMessages.length <= 1) return;
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2200);

    return () => clearInterval(msgInterval);
  }, [statusMessages]);

  const activeProgress = value !== undefined ? Math.min(100, Math.max(5, value)) : internalProgress;

  const activeSubtitle = isOffline
    ? "Internet connection is currently unavailable."
    : statusMessages && statusMessages.length > 0
    ? statusMessages[messageIndex]
    : subtitle;

  const content = (
    <div className={cn("relative flex flex-col items-center gap-4 text-center py-8", className)}>
      {isOffline ? (
        // Offline Error Card with Spinner & Retry Button
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-amber-500/30 shadow-lg max-w-sm mx-auto animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
            <WifiOff className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-foreground">You Are Offline</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your network connection was interrupted. Please check your internet and tap retry.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 mt-1 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      ) : (
        // Normal Accurate Progress View
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <div className="text-center text-[10px] font-bold text-accent uppercase tracking-[0.25em] mb-0.5">
            {title}
          </div>
          <div className="text-center text-[12px] font-medium text-reading tracking-wide mb-1 max-w-sm">
            {activeSubtitle}
          </div>

          {/* Clean Accurate Progress Bar */}
          <div className="flex flex-col gap-1.5 w-60 mt-1">
            <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="text-accent flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin text-accent" />
                <span>Loading</span>
              </span>
              <span className="text-accent font-mono font-bold">{activeProgress}%</span>
            </div>
            <div className="w-full h-[3px] bg-accent/15 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent via-accent to-primary rounded-full transition-all duration-300 ease-out"
                style={{ width: `${activeProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
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

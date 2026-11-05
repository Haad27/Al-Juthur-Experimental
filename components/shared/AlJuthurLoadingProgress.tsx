"use client";

import React, { useState, useEffect, useRef } from "react";
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
  resetKey?: string | number;
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
  resetKey,
}: AlJuthurLoadingProgressProps) {
  const [smoothProgress, setSmoothProgress] = useState<number>(() => {
    return value !== undefined ? Math.max(12, Math.min(100, value)) : 12;
  });
  const [messageIndex, setMessageIndex] = useState(0);
  const [localOffline, setLocalOffline] = useState(false);

  // Keep a ref to the latest target value to prevent stale closures
  const targetValueRef = useRef<number>(value ?? 12);
  useEffect(() => {
    if (value !== undefined) {
      targetValueRef.current = value;
    }
  }, [value]);

  // Reset progress when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined) {
      setSmoothProgress(12);
      targetValueRef.current = value ?? 12;
    }
  }, [resetKey]);

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

  // Ultra-smooth, non-reversing, continuous progress animation engine
  useEffect(() => {
    if (isOffline) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      setSmoothProgress((current) => {
        let target = targetValueRef.current;

        // If no external value provided, use natural time-based target curve
        if (value === undefined) {
          const elapsedSec = (Date.now() - startTime) / 1000;
          if (elapsedSec <= 1.5) {
            target = 12 + (38 * elapsedSec) / 1.5; // reaches 50% at 1.5s
          } else if (elapsedSec <= 3.5) {
            target = 50 + (28 * (elapsedSec - 1.5)) / 2.0; // 50% -> 78%
          } else if (elapsedSec <= 7.0) {
            target = 78 + (14 * (elapsedSec - 3.5)) / 3.5; // 78% -> 92%
          } else {
            target = Math.min(97, 92 + Math.log(elapsedSec - 6));
          }
        }

        // Completion phase
        if (target >= 100) {
          if (current >= 100) return 100;
          const step = Math.max(2, (100 - current) * 0.35);
          return Math.min(100, current + step);
        }

        // Catching up to target
        if (current < target) {
          const step = Math.max(0.4, (target - current) * 0.14);
          return Math.min(target, current + step);
        }

        // NEVER FREEZE: If current caught up to target, gently micro-creep forward
        // so the user sees continuous activity rather than getting stuck at any number
        if (current < 98) {
          return current + 0.12;
        }

        return current;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [value, isOffline, resetKey]);

  // Status message rotation
  useEffect(() => {
    if (!statusMessages || statusMessages.length <= 1) return;
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2200);

    return () => clearInterval(msgInterval);
  }, [statusMessages]);

  const displayPercent = Math.min(100, Math.floor(smoothProgress));

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
        // Normal Ultra-Smooth Progress View
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <div className="text-center text-[10px] font-bold text-accent uppercase tracking-[0.25em] mb-0.5">
            {title}
          </div>
          <div className="text-center text-[12px] font-medium text-reading tracking-wide mb-1 max-w-sm">
            {activeSubtitle}
          </div>

          {/* Clean Accurate Continuous Progress Bar */}
          <div className="flex flex-col gap-1.5 w-60 mt-1">
            <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="text-accent flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin text-accent" />
                <span>Loading</span>
              </span>
              <span className="text-accent font-mono font-bold">{displayPercent}%</span>
            </div>
            <div className="w-full h-[3px] bg-accent/15 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent via-accent to-primary rounded-full transition-all duration-150 ease-out"
                style={{ width: `${displayPercent}%` }}
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

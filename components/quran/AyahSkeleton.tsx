"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AyahSkeletonProps {
  /** Estimated height in px — computed from Arabic text word count so Virtuoso
   *  already knows the approximate size and never needs to scroll-jump to correct it. */
  estimatedHeight: number;
  isSidebarOpen?: boolean;
}

/**
 * Shimmer skeleton placeholder shown while an ayah's data is being fetched.
 * The critical detail: its height matches the estimated real ayah height so
 * Virtuoso never corrects the scroll position when the real content loads.
 */
const AyahSkeleton = React.memo(({ estimatedHeight, isSidebarOpen }: AyahSkeletonProps) => {
  return (
    <div
      style={{ minHeight: estimatedHeight }}
      className={cn(
        "relative flex flex-col rounded-2xl shadow-sm w-full min-w-0 overflow-hidden box-border",
        "border border-accent/15 bg-card/40",
        isSidebarOpen
          ? "p-3 sm:p-4"
          : "p-3.5 sm:p-6 md:p-7"
      )}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />

      <div className={cn("flex w-full", isSidebarOpen ? "sm:gap-6 gap-3" : "sm:gap-12 gap-4")}>
        {/* Left action column */}
        <div className="flex flex-col gap-2 shrink-0 items-center justify-center">
          <div className="w-14 h-7 rounded-lg bg-muted" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-muted/70" />
          ))}
        </div>

        {/* Right content column */}
        <div className="flex flex-col w-full gap-3 items-end">
          {/* Arabic text lines — proportional to estimated content */}
          <div className="w-full flex flex-col items-end gap-3">
            <div className="h-8 rounded-lg bg-muted/80 w-full" />
            <div className="h-8 rounded-lg bg-muted/70 w-5/6" />
            {estimatedHeight > 280 && (
              <div className="h-8 rounded-lg bg-muted/60 w-4/5" />
            )}
            {estimatedHeight > 380 && (
              <div className="h-8 rounded-lg bg-muted/50 w-3/4" />
            )}
          </div>

          {/* Translation lines */}
          <div className="w-full flex flex-col gap-2 mt-4 items-start">
            <div className="h-4 rounded bg-muted/60 w-full" />
            <div className="h-4 rounded bg-muted/50 w-11/12" />
            <div className="h-4 rounded bg-muted/40 w-4/5" />
            {estimatedHeight > 320 && (
              <div className="h-4 rounded bg-muted/40 w-3/4" />
            )}
          </div>

          {/* Actions row */}
          <div className="flex gap-2 mt-4">
            <div className="h-7 w-28 rounded-full bg-muted/60" />
            <div className="h-7 w-20 rounded-full bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  );
});

AyahSkeleton.displayName = "AyahSkeleton";

export default AyahSkeleton;

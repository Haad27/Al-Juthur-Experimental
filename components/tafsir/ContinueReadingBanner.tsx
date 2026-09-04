"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, ArrowRight, Bookmark, Clock } from "lucide-react";
import { getLastReadTafsir, LastReadTafsir } from "@/lib/readerStorage";
import { cn } from "@/lib/utils";

interface ContinueReadingBannerProps {
  onContinue: (item: LastReadTafsir) => void;
  className?: string;
}

export default function ContinueReadingBanner({
  onContinue,
  className,
}: ContinueReadingBannerProps) {
  const [lastRead, setLastRead] = useState<LastReadTafsir | null>(null);

  useEffect(() => {
    const item = getLastReadTafsir();
    if (item && item.surahId && item.ayahNumber) {
      setLastRead(item);
    }
  }, []);

  if (!lastRead) return null;

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-accent/40",
        className
      )}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="size-10 sm:size-11 rounded-xl bg-muted border border-border flex items-center justify-center text-accent shrink-0">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Bookmark className="size-3" />
                Continue Reading
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 lowercase font-normal">
                <Clock className="size-3" />
                {timeAgo(lastRead.timestamp)}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate mt-0.5">
              {lastRead.surahName} : Ayah {lastRead.ayahNumber}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {lastRead.authorName.replace(/\s*\([^)]*\)\s*$/, "").trim()}
              {lastRead.langName && ` (${lastRead.langName})`}
            </p>
          </div>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={() => onContinue(lastRead)}
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium transition-opacity hover:opacity-90 cursor-pointer shrink-0"
        >
          <span>Resume Reading</span>
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

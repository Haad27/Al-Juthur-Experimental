"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, ArrowRight, Bookmark, Clock, Sparkles } from "lucide-react";
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
        "relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-zinc-900/80 to-zinc-950 p-4 sm:p-5 shadow-lg shadow-emerald-950/20 backdrop-blur-md transition-all hover:border-emerald-500/60",
        className
      )}
    >
      <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="size-10 sm:size-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Bookmark className="size-3" />
                Continue Reading
              </span>
              <span>•</span>
              <span className="text-zinc-400 flex items-center gap-1 lowercase font-normal">
                <Clock className="size-3" />
                {timeAgo(lastRead.timestamp)}
              </span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white leading-tight truncate mt-0.5">
              {lastRead.surahName} : Ayah {lastRead.ayahNumber}
            </h4>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {lastRead.authorName.replace(/\s*\([^)]*\)\s*$/, "").trim()}
              {lastRead.langName && ` (${lastRead.langName})`}
            </p>
          </div>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={() => onContinue(lastRead)}
          className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer shrink-0"
        >
          <span>Resume Reading</span>
          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

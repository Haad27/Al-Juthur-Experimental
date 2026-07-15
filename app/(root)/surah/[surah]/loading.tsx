import { Sparkles } from "lucide-react";
import React from "react";

export default function SurahLoading() {
  return (
    <div className="min-h-screen bg-[var(--sephia-primary)] dark:bg-zinc-950 w-full flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-2 border-4 border-emerald-400/40 rounded-full animate-spin"></div>
          <Sparkles className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">
            Loading Surah
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-sm">
            Fetching classical Arabic text and precise morphological mappings from the local database...
          </p>
        </div>
      </div>
      
      {/* Skeleton for Ayahs */}
      <div className="w-full max-w-4xl mt-16 space-y-12 opacity-40 hidden md:block">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-6 w-full border-b border-zinc-200 dark:border-zinc-800 pb-12">
            <div className="flex justify-end w-full">
              <div className="h-12 w-3/4 bg-zinc-300 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
            </div>
            <div className="flex justify-start w-full">
              <div className="h-6 w-1/2 bg-zinc-300 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Sparkles } from "lucide-react";
import React from "react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function SurahLoading() {
  return (
    <div className="min-h-screen bg-[var(--sephia-primary)] dark:bg-zinc-950 w-full flex flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative flex items-center justify-center w-24 h-24">
          <img
            src="/assets/favicon/apple-touch-icon.png"
            alt="Al Juthur Logo"
            className="w-16 h-16 object-contain animate-pulse-scale"
          />
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/50 border-r-2 border-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute inset-2 rounded-full border-b-2 border-emerald-400/30 border-l-2 border-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
        </div>
        
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <div className="text-center text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">
            Loading Surah
          </div>
          <div className="text-center text-[12px] font-medium text-zinc-400 tracking-wide mb-2 max-w-sm">
            Fetching classical Arabic text and precise morphological mappings...
          </div>
          
          <div className="w-48 h-[2px] bg-zinc-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ width: '50%' }} />
          </div>
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

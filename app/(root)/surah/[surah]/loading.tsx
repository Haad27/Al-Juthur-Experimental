import { Sparkles } from "lucide-react";
import React from "react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function SurahLoading() {
  return (
    <div className="min-h-screen bg-[var(--sephia-primary)] dark:bg-zinc-950 w-full flex flex-col items-center justify-center p-6 text-center">
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="flex flex-col items-center gap-6 animate-pulse relative z-10">
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Ripple Rings */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '2s' }} />

          <img
            src="/assets/favicon/apple-touch-icon.png"
            alt="Al Juthur Logo"
            className="w-16 h-16 object-contain animate-pulse-scale drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] relative z-10"
          />
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

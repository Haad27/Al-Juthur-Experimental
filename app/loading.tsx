import React from "react";
import { Loader2 } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 text-white animate-in fade-in duration-300">
      {/* Subtle Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center gap-6">
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
            Al Juthur
          </div>
          <div className="text-center text-[12px] font-medium text-zinc-400 tracking-wide mb-2">
            Loading your digital Quranic experience...
          </div>
          
          <div className="w-48 h-[2px] bg-zinc-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ width: '50%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

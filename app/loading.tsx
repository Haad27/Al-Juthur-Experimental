import React from "react";
import { Loader2 } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 text-white animate-in fade-in duration-300">
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-slate-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-zinc-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-slate-400/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Ripple Rings */}
          <div className="absolute inset-0 rounded-full border border-zinc-400/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-0 rounded-full border border-zinc-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 rounded-full border border-slate-400/15 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '2s' }} />
          
          <img
            src="/assets/favicon/apple-touch-icon.png"
            alt="Al Juthur Logo"
            className="w-16 h-16 object-contain animate-pulse-scale drop-shadow-[0_0_20px_rgba(241,245,249,0.45)] relative z-10"
          />
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

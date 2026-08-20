import React from "react";
import { Loader2 } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 text-white animate-in fade-in duration-300">
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-900/20 blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-teal-900/20 blur-[140px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>
      
      {/* Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Ripple Rings */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/35 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-0 rounded-full border border-teal-500/25 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '2s' }} />
          
          <img
            src="/assets/favicon/apple-touch-icon.png"
            alt="Al Juthur Logo"
            className="w-16 h-16 object-contain animate-pulse-scale drop-shadow-[0_0_25px_rgba(16,185,129,0.55)] relative z-10"
          />
        </div>
        
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <div className="text-center text-[11px] font-bold text-emerald-400 uppercase tracking-[0.25em] mb-0.5">
            Al Juthur
          </div>
          <div className="text-center text-[12px] font-medium text-emerald-100/75 tracking-wide mb-2">
            Loading your digital Quranic experience...
          </div>
          
          <div className="w-56 h-[2.5px] bg-emerald-950/60 rounded-full relative overflow-hidden mt-1">
            <div className="absolute top-0 h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#6df4ce] shadow-[0_0_12px_rgba(16,185,129,0.9)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" style={{ width: '50%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

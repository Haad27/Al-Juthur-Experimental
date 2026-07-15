import React from "react";
import { Loader2 } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 text-white animate-in fade-in duration-300">
      {/* Subtle Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-[20%] animate-pulse blur-xl" />
          <div className="relative z-10 shadow-2xl shadow-emerald-900/50 rounded-[20%] overflow-hidden ring-1 ring-emerald-500/20">
            <LogoIcon className="size-16" />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">Al-Juthur</h2>
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="size-4 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

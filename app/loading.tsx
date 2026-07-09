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
          <div className="absolute inset-0 bg-white/5 rounded-2xl animate-pulse" />
          <div className="bg-white p-4 rounded-2xl shadow-xl shadow-emerald-500/10 ring-1 ring-white/10 relative z-10">
            <LogoIcon className="text-black size-12" />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight">Deeper Dive</h2>
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="size-4 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

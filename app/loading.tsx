import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-center px-4">
        <h2 className="text-sm sm:text-base font-semibold tracking-[0.2em] uppercase text-foreground">
          Al-Juthur
        </h2>
        <p className="text-xs text-muted-foreground tracking-wide font-light">
          Loading...
        </p>
        <div className="w-40 h-[2px] bg-border rounded-full relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 h-full w-1/3 bg-accent rounded-full animate-[loading-bar_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

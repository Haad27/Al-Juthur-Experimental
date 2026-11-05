"use client";

import React, { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  ExternalLink,
  Move,
  Minimize2,
  Maximize2,
  PanelTop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrIsrarPlayer } from "@/lib/providers/DrIsrarPlayerContext";
import { getScholarMedia } from "@/lib/scholarMedia";

export default function DrIsrarGlobalPlayer() {
  const pathname = usePathname();
  const {
    isOpen,
    viewMode,
    isMinimized,
    scholarId,
    surahNumber,
    surahName,
    pipPos,
    setPipPos,
    closePlayer,
    setVideoMode,
    setIsMinimized,
  } = useDrIsrarPlayer();

  const media = getScholarMedia(scholarId, surahNumber, surahName);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 24,
    posY: 80,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: pipPos.x,
      posY: pipPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const maxX = Math.max(20, window.innerWidth - 380);
    const maxY = Math.max(20, window.innerHeight - 250);

    const nextX = Math.min(Math.max(10, dragStartRef.current.posX + dx), maxX);
    const nextY = Math.min(Math.max(10, dragStartRef.current.posY + dy), maxY);

    setPipPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  if (!isOpen) return null;

  // 1. Minimized floating pill (available on ANY page)
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-card border border-accent/40 shadow-2xl text-foreground animate-in zoom-in-95 duration-200 backdrop-blur-md">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
        </span>
        <span className="text-xs font-bold">{media.scholarName} ({surahName})</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-full hover:bg-muted text-accent hover:text-accent-foreground transition-colors cursor-pointer"
          title="Expand Video"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={closePlayer}
          className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Close Video"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  // 2. Floating PiP Mode (shown when viewMode is 'floating', OR when user is browsing other pages like /reader)
  const isFloating = viewMode === "floating" || pathname !== "/tafsir";

  if (isFloating) {
    return (
      <div
        style={{
          position: "fixed",
          left: `${pipPos.x}px`,
          top: `${pipPos.y}px`,
          zIndex: 80,
        }}
        className={cn(
          "w-[90vw] sm:w-[440px] md:w-[480px] rounded-2xl border-2 border-accent/50 bg-card shadow-2xl overflow-hidden select-none transition-shadow",
          isDragging ? "shadow-accent/20 cursor-grabbing ring-2 ring-accent" : "shadow-2xl"
        )}
      >
        {/* Floating Drag Handle Header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b border-border cursor-grab active:cursor-grabbing text-foreground"
          title="Drag to reposition window"
        >
          <div className="flex items-center gap-2 min-w-0 pointer-events-none">
            <Move size={14} className="text-accent shrink-0" />
            <span className="text-xs font-bold truncate">
              {media.scholarName} • Surah {surahName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Dock back to Top if on /tafsir */}
            {pathname === "/tafsir" && (
              <button
                onClick={() => setVideoMode("docked")}
                className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Dock to top split-screen"
              >
                <PanelTop size={14} />
              </button>
            )}

            {/* Minimize to Pill */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </button>

            {/* External YouTube Link */}
            <a
              href={media.youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors inline-flex items-center cursor-pointer"
              title="Open in YouTube"
            >
              <ExternalLink size={13} />
            </a>

            {/* Close */}
            <button
              onClick={closePlayer}
              className="p-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 16:9 Video Embed Viewport */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={media.youtubeEmbedUrl}
            title={`${media.scholarName} ${media.seriesTitle} Surah ${surahName}`}
            className="absolute inset-0 size-full border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        {/* Floating Footer Toolbar */}
        <div className="px-3 py-1.5 bg-card flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">Drag header to move anywhere</span>
          {pathname === "/tafsir" && (
            <button
              onClick={() => setVideoMode("docked")}
              className="text-accent hover:underline font-semibold cursor-pointer shrink-0"
            >
              Dock to Top ↑
            </button>
          )}
        </div>
      </div>
    );
  }

  // If viewMode is 'docked' and we are on /tafsir, the docked version is rendered
  // right inside DrIsrarMediaCard at the top of the tafsir view!
  return null;
}

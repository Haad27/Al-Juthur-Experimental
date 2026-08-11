"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import { cn } from "@/lib/utils";

interface AyahWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tafsirName?: string;
  initialSurah?: number;
  initialAyah?: number;
  onSelectPassage: (surahNumber: number, ayahNumber: number) => void;
}

const ITEM_HEIGHT = 44;

interface WheelColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  ariaLabel: string;
}

function WheelColumn<T>({
  items,
  selectedIndex,
  onSelect,
  renderItem,
  ariaLabel,
}: WheelColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Sync scroll position when selectedIndex changes externally or initially
  useEffect(() => {
    if (containerRef.current && !isDraggingRef.current) {
      const targetScrollTop = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 2) {
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Handle scroll events with index calculation
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    const index = Math.round(currentScrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    if (clampedIndex !== selectedIndex) {
      onSelect(clampedIndex);
    }
  }, [items.length, selectedIndex, onSelect]);

  // Scroll snap end event handler
  const handleScrollEnd = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    containerRef.current.scrollTo({
      top: clampedIndex * ITEM_HEIGHT,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="relative h-[220px] w-full overflow-hidden select-none touch-pan-y"
      aria-label={ariaLabel}
    >
      {/* Top and Bottom Fading Gradient Grates */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-zinc-950 via-zinc-950/70 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-10 pointer-events-none" />

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseUp={handleScrollEnd}
        onTouchEnd={handleScrollEnd}
        className="h-full overflow-y-auto no-scrollbar py-[88px] snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const isSelected = index === selectedIndex;

          // Calculate 3D wheel transformations based on distance from center
          const rotateX = Math.max(-60, Math.min(60, (index - selectedIndex) * -22));
          const scale = isSelected ? 1.05 : Math.max(0.75, 1 - distance * 0.12);
          const opacity = isSelected ? 1 : Math.max(0.2, 1 - distance * 0.35);

          return (
            <div
              key={index}
              onClick={() => onSelect(index)}
              className="h-[44px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150"
              style={{
                transform: `perspective(300px) rotateX(${rotateX}deg) scale(${scale})`,
                opacity: opacity,
                transformOrigin: "center center",
              }}
            >
              {renderItem(item, isSelected)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AyahWheelPickerModal({
  isOpen,
  onClose,
  tafsirName,
  initialSurah = 39,
  initialAyah = 1,
  onSelectPassage,
}: AyahWheelPickerModalProps) {
  const [selectedSurahIndex, setSelectedSurahIndex] = useState<number>(() => {
    const idx = SURAHS_DATA.findIndex((s) => s.number === initialSurah);
    return idx >= 0 ? idx : 38; // Default 39 (Az-Zumar)
  });

  const activeSurahMeta = SURAHS_DATA[selectedSurahIndex] || SURAHS_DATA[0];

  const [selectedAyah, setSelectedAyah] = useState<number>(initialAyah);

  // Sync internal state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const idx = SURAHS_DATA.findIndex((s) => s.number === initialSurah);
      setSelectedSurahIndex(idx >= 0 ? idx : 38);
      setSelectedAyah(initialAyah);
    }
  }, [isOpen, initialSurah, initialAyah]);

  // Ensure Ayah is clamped when Surah changes
  useEffect(() => {
    if (selectedAyah > activeSurahMeta.numberOfAyahs) {
      setSelectedAyah(activeSurahMeta.numberOfAyahs);
    }
  }, [selectedSurahIndex, activeSurahMeta.numberOfAyahs, selectedAyah]);

  if (!isOpen) return null;

  const ayahItems = Array.from(
    { length: activeSurahMeta.numberOfAyahs },
    (_, i) => i + 1
  );

  const handleOpenVerse = () => {
    onSelectPassage(activeSurahMeta.number, selectedAyah);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container Card */}
      <div className="relative w-full max-w-lg bg-zinc-950/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col gap-6">
        
        {/* Subtle Ambient Background Glows */}
        <div className="absolute -top-24 -left-24 size-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase mb-1">
              <Sparkles className="size-3" />
              <span>SELECT A PASSAGE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-200 tracking-tight">
              Ayah Wheel
            </h2>
            {tafsirName && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs sm:max-w-sm">
                Target Tafsir: <span className="text-zinc-200 font-semibold">{tafsirName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/40 hover:bg-zinc-800 transition"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Dual Wheel Picker Section */}
        <div className="relative z-10 grid grid-cols-5 gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4">
          
          {/* Highlight Selection Box Across Both Columns */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[44px] border border-amber-400/50 bg-amber-400/5 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(251,191,36,0.1)] z-20" />

          {/* Surah Wheel Column (3 Cols) */}
          <div className="col-span-3 flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 px-1">
              SURAH
            </span>
            <WheelColumn
              items={SURAHS_DATA}
              selectedIndex={selectedSurahIndex}
              onSelect={setSelectedSurahIndex}
              ariaLabel="Select Surah"
              renderItem={(surah, isSelected) => (
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1 rounded-lg w-full text-left transition-colors",
                    isSelected ? "text-amber-200 font-bold" : "text-zinc-400 font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors shrink-0",
                      isSelected
                        ? "bg-amber-400/10 border-amber-400/40 text-amber-300 font-bold"
                        : "bg-zinc-800/60 border-zinc-700/60 text-zinc-500"
                    )}
                  >
                    {String(surah.number).padStart(3, "0")}
                  </span>
                  <span className="text-sm truncate leading-tight">
                    {surah.englishName}
                  </span>
                </div>
              )}
            />
          </div>

          {/* Verse Wheel Column (2 Cols) */}
          <div className="col-span-2 flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 px-1">
              VERSE
            </span>
            <WheelColumn
              items={ayahItems}
              selectedIndex={selectedAyah - 1}
              onSelect={(idx) => setSelectedAyah(idx + 1)}
              ariaLabel="Select Verse"
              renderItem={(ayahNum, isSelected) => (
                <div
                  className={cn(
                    "text-center text-sm transition-colors w-full",
                    isSelected ? "text-amber-200 font-bold text-base" : "text-zinc-400 font-medium"
                  )}
                >
                  {ayahNum}
                </div>
              )}
            />
          </div>
        </div>

        {/* Selected Summary and Confirm Button Footer */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
              SELECTED
            </span>
            <span className="text-base font-bold text-zinc-100 truncate">
              {activeSurahMeta.englishName} · {activeSurahMeta.number}:{selectedAyah}
            </span>
          </div>

          <button
            onClick={handleOpenVerse}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-zinc-950 font-bold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-amber-400/20 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>Open verse</span>
          </button>
        </div>

      </div>
    </div>
  );
}

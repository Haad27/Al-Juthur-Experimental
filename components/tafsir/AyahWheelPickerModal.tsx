"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, BookOpen, MapPin, Sparkles } from "lucide-react";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import { amiriquran } from "@/app/fonts";
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

  // Sync scroll position when selectedIndex changes externally or on mount
  useEffect(() => {
    if (containerRef.current) {
      const targetScrollTop = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 2) {
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Handle scroll events with clamped index calculation
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    const index = Math.round(currentScrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    if (clampedIndex !== selectedIndex) {
      onSelect(clampedIndex);
    }
  }, [items.length, selectedIndex, onSelect]);

  // Scroll snap end event handler to snap perfectly to center
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
      {/* Top and Bottom Fading Gradient Overlays */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-10 pointer-events-none" />

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

          // Prevent overlapping: clean scale and opacity transitions without wild 3D rotations
          const scale = isSelected ? 1.04 : Math.max(0.82, 1 - distance * 0.1);
          const opacity = isSelected ? 1 : Math.max(0.2, 1 - distance * 0.35);

          return (
            <div
              key={index}
              onClick={() => onSelect(index)}
              className="h-[44px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 overflow-hidden px-2"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
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
  initialSurah = 1,
  initialAyah = 1,
  onSelectPassage,
}: AyahWheelPickerModalProps) {
  const [selectedSurahIndex, setSelectedSurahIndex] = useState<number>(() => {
    const idx = SURAHS_DATA.findIndex((s) => s.number === initialSurah);
    return idx >= 0 ? idx : 0;
  });

  const activeSurahMeta = SURAHS_DATA[selectedSurahIndex] || SURAHS_DATA[0];
  const [selectedAyah, setSelectedAyah] = useState<number>(initialAyah);

  // Sync internal state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const idx = SURAHS_DATA.findIndex((s) => s.number === initialSurah);
      setSelectedSurahIndex(idx >= 0 ? idx : 0);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Modal Container Card - Al-Juthur Signature Dark Glass */}
      <div className="relative w-full max-w-md bg-zinc-950/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/50 overflow-hidden flex flex-col gap-5">
        
        {/* Ambient Emerald Background Glows */}
        <div className="absolute -top-20 -left-20 size-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono tracking-wider font-semibold">
            <BookOpen className="size-3.5" />
            <span>AL-QUR&apos;AN</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/40 hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Dynamic Surah Display Banner */}
        <div className="relative z-10 flex flex-col items-center justify-center py-2 px-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 text-center">
          <h3 className={`${amiriquran.className} text-3xl sm:text-4xl text-emerald-400 font-normal leading-relaxed text-center`}>
            {activeSurahMeta.name}
          </h3>
          <p className="text-sm font-bold text-zinc-100">
            {activeSurahMeta.englishName}{" "}
            <span className="text-zinc-400 font-normal">— {activeSurahMeta.englishNameTranslation}</span>
          </p>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1 pt-0.5">
            <MapPin className="size-3 text-emerald-400" />
            <span>Surah {activeSurahMeta.number} · Ayah {selectedAyah} of {activeSurahMeta.numberOfAyahs}</span>
          </p>
        </div>

        {/* Dual Wheel Picker Container */}
        <div className="relative z-10 grid grid-cols-5 gap-2 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-3">
          
          {/* Highlight Frame Across Selected Row */}
          <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-[44px] border border-emerald-500/50 bg-emerald-500/10 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.15)] z-20" />

          {/* Surah Wheel Column (3 Cols) */}
          <div className="col-span-3 flex flex-col">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 text-center mb-1">
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
                    "flex items-center gap-2 px-2 py-1 rounded-lg w-full text-left transition-colors min-w-0",
                    isSelected ? "text-white font-bold" : "text-zinc-400 font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-mono font-bold px-2 py-0.5 rounded transition-colors shrink-0",
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                        : "text-zinc-500"
                    )}
                  >
                    {surah.number}
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
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 text-center mb-1">
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
                    isSelected ? "text-emerald-300 font-extrabold text-base" : "text-zinc-500 font-medium"
                  )}
                >
                  {ayahNum}
                </div>
              )}
            />
          </div>
        </div>

        {/* Selected Reference & Confirm Button Footer */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
              REFERENCE
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {activeSurahMeta.number}:{selectedAyah}
            </span>
          </div>

          <button
            onClick={handleOpenVerse}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="size-4" />
            <span>Open verse</span>
          </button>
        </div>

      </div>
    </div>
  );
}

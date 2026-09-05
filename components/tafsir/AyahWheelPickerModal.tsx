"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, BookOpen, MapPin, Sparkles, Search, Hash } from "lucide-react";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import { amiriquran } from "@/app/fonts";
import { cn } from "@/lib/utils";
import { isFuzzyMatch, findSurahMatchIndex, convertEasternToWesternDigits, parseSurahVerseReference } from "@/lib/searchUtils";

interface AyahWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tafsirName?: string;
  initialSurah?: number;
  initialAyah?: number;
  onSelectPassage: (surahNumber: number, ayahNumber: number) => void;
}

const ITEM_HEIGHT = 36;

interface WheelColumnProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderItem: (item: T) => React.ReactNode;
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
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const updateStyles = useCallback(() => {
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    
    itemsRef.current.forEach((el, index) => {
      if (!el) return;
      const distance = Math.abs((index * ITEM_HEIGHT) - currentScrollTop) / ITEM_HEIGHT;
      const isSelected = Math.round(currentScrollTop / ITEM_HEIGHT) === index;
      
      const scale = isSelected ? 1.04 : Math.max(0.8, 1 - distance * 0.1);
      const opacity = isSelected ? 1 : Math.max(0.18, 1 - distance * 0.38);

      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${opacity}`;
      el.setAttribute('data-selected', isSelected ? 'true' : 'false');
    });
  }, []);

  useEffect(() => {
    // Initial style update
    updateStyles();
  }, [items.length, updateStyles]);

  useEffect(() => {
    if (containerRef.current) {
      const targetScrollTop = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 2) {
        isProgrammaticScrollRef.current = true;
        containerRef.current.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });

        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 400);
      }
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    updateStyles(); // Update DOM instantly for 60fps visuals
    
    if (isProgrammaticScrollRef.current) return;
    if (!containerRef.current) return;
    
    const currentScrollTop = containerRef.current.scrollTop;
    const index = Math.round(currentScrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    
    // Debounce the React state update to avoid rendering during active scroll
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
    }, 100);
  }, [items.length, selectedIndex, onSelect, updateStyles]);

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
      className="relative h-[144px] sm:h-[180px] w-full overflow-hidden select-none touch-pan-y"
      style={{ touchAction: "pan-y" }}
      aria-label={ariaLabel}
    >
      <div className="absolute top-0 left-0 right-0 h-12 sm:h-14 bg-gradient-to-b from-background via-background/85 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-14 bg-gradient-to-t from-background via-background/85 to-transparent z-10 pointer-events-none" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseUp={handleScrollEnd}
        onTouchEnd={handleScrollEnd}
        className="h-full overflow-y-auto overflow-x-hidden no-scrollbar py-[54px] sm:py-[72px] snap-y snap-mandatory touch-pan-y"
        style={{ scrollSnapType: "y mandatory", touchAction: "pan-y", overscrollBehaviorX: "none" }}
      >
        {items.map((item, index) => {
          return (
            <div
              key={index}
              ref={(el) => {
                itemsRef.current[index] = el;
              }}
              onClick={() => onSelect(index)}
              className="group h-[36px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 overflow-hidden px-2 touch-pan-y select-none"
              style={{
                touchAction: "pan-y",
              }}
            >
              {renderItem(item)}
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

  const [surahSearchQuery, setSurahSearchQuery] = useState("");
  const [verseInputQuery, setVerseInputQuery] = useState(String(initialAyah));

  // Sync internal state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const idx = SURAHS_DATA.findIndex((s) => s.number === initialSurah);
      setSelectedSurahIndex(idx >= 0 ? idx : 0);
      setSelectedAyah(initialAyah);
      setSurahSearchQuery("");
      setVerseInputQuery(String(initialAyah));
    }
  }, [isOpen, initialSurah, initialAyah]);

  // Sync verse input query whenever selectedAyah updates via wheel
  useEffect(() => {
    setVerseInputQuery(String(selectedAyah));
  }, [selectedAyah]);

  // Ensure Ayah is clamped when Surah changes
  useEffect(() => {
    if (selectedAyah > activeSurahMeta.numberOfAyahs) {
      setSelectedAyah(activeSurahMeta.numberOfAyahs);
    }
  }, [selectedSurahIndex, activeSurahMeta.numberOfAyahs, selectedAyah]);

  // Lock body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Modal Container Card - Al-Juthur Glowing Emerald Glass */}
      <div className="relative w-full max-w-[390px] sm:max-w-[420px] bg-popover border border-accent/40 rounded-2xl sm:rounded-3xl p-3 sm:p-5   overflow-hidden flex flex-col gap-2 sm:gap-3">
        
        {/* Ambient Neon Background Glows */}
        <div className="absolute -top-24 -left-24 size-72 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar: Badge, Tafsir Name, Close X */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center w-full pt-1 pb-0.5">
          <button
            onClick={onClose}
            className="absolute right-0 top-0 p-1.5 sm:p-2 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 hover:bg-muted transition cursor-pointer shrink-0 z-20"
            aria-label="Close dialog"
          >
            <X className="size-3.5 sm:size-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-4 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] sm:text-[10px] font-mono tracking-[0.2em] uppercase font-semibold shadow-sm">
            <BookOpen className="size-3 text-accent shrink-0" />
            <span>AL-QUR&apos;AN</span>
          </div>

          {tafsirName && (
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1 truncate max-w-[85%]">
              Target Tafsir: <span className="text-accent font-bold">{tafsirName}</span>
            </p>
          )}
        </div>

        {/* Manual Search & Typing Bar for Surah Name and Verse Number */}
        <div className="relative z-10 flex items-center gap-2">
          {/* Surah Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-accent pointer-events-none" />
            <input
              type="text"
              placeholder="Search Surah name or #..."
              value={surahSearchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSurahSearchQuery(val);

                if (!val.trim()) return;

                const foundIdx = findSurahMatchIndex(val, SURAHS_DATA);
                if (foundIdx !== -1) {
                  setSelectedSurahIndex(foundIdx);
                  const parsed = parseSurahVerseReference(val);
                  if (parsed?.ayahNumber) {
                    const matchedSurah = SURAHS_DATA[foundIdx];
                    if (parsed.ayahNumber <= matchedSurah.numberOfAyahs) {
                      setSelectedAyah(parsed.ayahNumber);
                      setVerseInputQuery(String(parsed.ayahNumber));
                    }
                  }
                }
              }}
              className="w-full bg-card border-2 border-accent/40 hover:border-accent focus:border-accent rounded-xl sm:rounded-2xl pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all "
            />
          </div>

          {/* Verse Number Direct Input */}
          <div className="relative w-28 sm:w-32 shrink-0">
            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-accent pointer-events-none" />
            <input
              type="text"
              inputMode="numeric"
              placeholder={`Verse (1-${activeSurahMeta.numberOfAyahs})`}
              value={verseInputQuery}
              onChange={(e) => {
                const val = e.target.value;
                setVerseInputQuery(val);
                const converted = convertEasternToWesternDigits(val.trim());
                const num = parseInt(converted, 10);
                if (!isNaN(num) && num >= 1 && num <= activeSurahMeta.numberOfAyahs) {
                  setSelectedAyah(num);
                }
              }}
              className="w-full bg-card border-2 border-accent/40 hover:border-accent focus:border-accent rounded-xl sm:rounded-2xl pl-8 pr-2 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono font-bold "
            />
          </div>
        </div>

        {/* Dynamic Surah Display Banner */}
        <div className="relative z-10 flex flex-col items-center justify-center py-1 px-3 sm:py-2 sm:px-4 rounded-xl sm:rounded-2xl bg-card/80 border border-border text-center shadow-inner">
          <h3 className={`${amiriquran.className} text-lg sm:text-2xl text-accent font-normal leading-tight text-center `}>
            {activeSurahMeta.name}
          </h3>
          <p className="text-[11px] sm:text-xs font-bold text-foreground">
            {activeSurahMeta.englishName}{" "}
            <span className="text-muted-foreground font-normal">— {activeSurahMeta.englishNameTranslation}</span>
          </p>
          <p className="text-[9px] sm:text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="size-2.5 sm:size-3 text-accent" />
            <span>Surah {activeSurahMeta.number} · Ayah {selectedAyah} of {activeSurahMeta.numberOfAyahs}</span>
          </p>
        </div>

        {/* Column Headers */}
        <div className="flex w-full justify-between px-4">
          <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground w-1/2 text-center">
            SURAH
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground w-1/2 text-center">
            VERSE
          </span>
        </div>

        {/* 50/50 Equal Dual Wheel Picker Container */}
        <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-4 bg-card/50 border border-accent/30 rounded-xl sm:rounded-2xl p-2 sm:p-3 ">
          
          {/* Highlight Frame Across Selected Row - Glowing Emerald Neon */}
          <div className="absolute top-1/2 left-2 right-2 sm:left-3 sm:right-3 -translate-y-1/2 h-[36px] border-2 border-accent/60 bg-accent/10 rounded-xl pointer-events-none   z-20" />

          {/* Surah Wheel Column (50% Width) */}
          <div className="col-span-1 flex flex-col items-center min-w-0">
            <WheelColumn
              items={SURAHS_DATA}
              selectedIndex={selectedSurahIndex}
              onSelect={setSelectedSurahIndex}
              ariaLabel="Select Surah"
              renderItem={(surah) => (
                <div
                  className="flex flex-col justify-center px-2 sm:px-3 py-0.5 rounded-lg w-full text-center transition-colors min-w-0 max-w-[200px] mx-auto group-data-[selected=true]:text-foreground  group-data-[selected=false]:text-muted-foreground"
                >
                  <span className="text-xs sm:text-sm truncate leading-tight group-data-[selected=true]:font-bold group-data-[selected=false]:font-medium">
                    {surah.englishName}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground font-mono font-semibold uppercase tracking-widest">
                    Surah {surah.number}
                  </span>
                </div>
              )}
            />
          </div>

          {/* Verse Wheel Column (50% Width) */}
          <div className="col-span-1 flex flex-col items-center min-w-0">
            <WheelColumn
              items={ayahItems}
              selectedIndex={selectedAyah - 1}
              onSelect={(idx) => setSelectedAyah(idx + 1)}
              ariaLabel="Select Verse"
              renderItem={(ayahNum) => (
                <div
                  className="flex flex-col justify-center px-2 sm:px-3 py-0.5 rounded-lg w-full text-center transition-colors min-w-0 max-w-[200px] mx-auto group-data-[selected=true]:text-accent  group-data-[selected=false]:text-muted-foreground"
                >
                  <span className="text-xs sm:text-base truncate leading-tight font-mono group-data-[selected=true]:font-extrabold group-data-[selected=false]:font-medium">
                    {ayahNum}
                  </span>
                </div>
              )}
            />
          </div>
        </div>

        {/* Selected Reference & Confirm Button Footer */}
        <div className="relative z-10 flex items-center justify-between pt-1.5 border-t border-border gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              REFERENCE
            </span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-accent tracking-tight ">
              {activeSurahMeta.number}:{selectedAyah}
            </span>
          </div>

          <button
            onClick={handleOpenVerse}
            className="flex items-center gap-1.5 sm:gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs sm:text-sm px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full   hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="size-3.5 sm:size-4" />
            <span>Open verse</span>
          </button>
        </div>

      </div>
    </div>
  );
}

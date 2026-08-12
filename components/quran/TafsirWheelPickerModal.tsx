"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Search, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFuzzyMatch } from "@/lib/searchUtils";

interface Author {
  id: number;
  name: string;
  authorName?: string;
  languageId: number;
  era?: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
  authors: Author[];
}

interface TafsirWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  onSelectTafsir: (authorId: number) => void;
}

const ITEM_HEIGHT = 48;

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
  const selectedIndexRef = useRef(selectedIndex);
  const itemsLengthRef = useRef(items.length);
  const onSelectRef = useRef(onSelect);
  const lastWheelTimeRef = useRef(0);
  const wheelAccumulator = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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

  // Intercept desktop mouse wheel events for exact 1-step scrolling & fast swipe momentum
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      const now = Date.now();
      const dt = now - lastWheelTimeRef.current;
      lastWheelTimeRef.current = now;

      if (dt > 100) {
        wheelAccumulator.current = 0;
      }

      wheelAccumulator.current += e.deltaY;
      const threshold = 40;

      if (Math.abs(wheelAccumulator.current) >= threshold) {
        let steps = Math.trunc(wheelAccumulator.current / threshold);
        
        if (dt > 30 && Math.abs(steps) > 1) {
          steps = steps > 0 ? 1 : -1;
          wheelAccumulator.current = 0;
        } else {
          wheelAccumulator.current -= steps * threshold;
        }

        const nextIndex = Math.max(
          0,
          Math.min(itemsLengthRef.current - 1, selectedIndexRef.current + steps)
        );

        if (nextIndex !== selectedIndexRef.current) {
          onSelectRef.current(nextIndex);
        }
      }
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    if (!containerRef.current) return;
    const currentScrollTop = containerRef.current.scrollTop;
    const index = Math.round(currentScrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    if (clampedIndex !== selectedIndex) {
      onSelect(clampedIndex);
    }
  }, [items.length, selectedIndex, onSelect]);

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
      className="relative h-[250px] w-full overflow-hidden select-none touch-pan-y"
      style={{ touchAction: "pan-y" }}
      aria-label={ariaLabel}
    >
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-zinc-950 via-zinc-950/85 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent z-10 pointer-events-none" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseUp={handleScrollEnd}
        onTouchEnd={handleScrollEnd}
        className="h-full overflow-y-auto overflow-x-hidden no-scrollbar py-[101px] snap-y snap-mandatory touch-pan-y"
        style={{ scrollSnapType: "y mandatory", touchAction: "pan-y", overscrollBehaviorX: "none" }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const isSelected = index === selectedIndex;

          const scale = isSelected ? 1.06 : Math.max(0.8, 1 - distance * 0.1);
          const opacity = isSelected ? 1 : Math.max(0.18, 1 - distance * 0.38);

          return (
            <div
              key={index}
              onClick={() => onSelect(index)}
              className="h-[48px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 overflow-hidden px-2 touch-pan-y select-none"
              style={{
                transform: `scale(${scale})`,
                opacity: opacity,
                touchAction: "pan-y",
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

export default function TafsirWheelPickerModal({
  isOpen,
  onClose,
  surahNumber,
  ayahNumber,
  onSelectTafsir,
}: TafsirWheelPickerModalProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (isOpen && languages.length === 0) {
      fetch("/api/tafsir")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            const sorted = [...data.data].sort((a, b) => {
              const getRank = (name: string) => {
                const lower = name.toLowerCase();
                if (lower === 'arabic') return 1;
                if (lower === 'english') return 2;
                if (lower === 'urdu') return 3;
                return 4;
              };
              return getRank(a.name) - getRank(b.name);
            });
            setLanguages(sorted);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, languages.length]);

  const allAuthors = useMemo(() => {
    const list: { author: Author; langName: string }[] = [];
    languages.forEach((lang) => {
      lang.authors.forEach((author) => {
        list.push({ author, langName: lang.name });
      });
    });
    return list;
  }, [languages]);

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return allAuthors;
    const query = searchQuery.trim();
    return allAuthors.filter(
      (a) =>
        isFuzzyMatch(query, a.author.name) ||
        (a.author.authorName && isFuzzyMatch(query, a.author.authorName)) ||
        isFuzzyMatch(query, a.langName)
    );
  }, [allAuthors, searchQuery]);

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

  const activeItem = filteredAuthors[selectedIdx];

  const handleOpenTafsir = () => {
    if (activeItem) {
      onSelectTafsir(activeItem.author.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950/95 border border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.25)] shadow-emerald-950/60 overflow-hidden flex flex-col gap-5">
        
        {/* Ambient Neon Background Glows */}
        <div className="absolute -top-24 -left-24 size-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono tracking-wider font-semibold w-fit">
              <BookOpen className="size-3.5 text-emerald-400" />
              <span>TAFSIR SELECTOR</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/50 hover:bg-zinc-800 transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Tafsir, author, or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all shadow-sm"
          />
        </div>

        {/* Single Wheel Picker Container */}
        <div className="relative z-10 bg-zinc-900/40 border border-emerald-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[48px] border-2 border-emerald-400/80 bg-emerald-500/15 rounded-2xl pointer-events-none shadow-[0_0_25px_rgba(16,185,129,0.35)] drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] z-20" />

          {filteredAuthors.length > 0 ? (
            <div className="flex flex-col items-center min-w-0">
              <WheelColumn
                items={filteredAuthors}
                selectedIndex={selectedIdx}
                onSelect={setSelectedIdx}
                ariaLabel="Select Tafsir"
                renderItem={(item, isSelected) => (
                  <div
                    className={cn(
                      "flex flex-col justify-center gap-0.5 px-3 py-1 rounded-lg w-full text-center transition-colors min-w-0 max-w-[320px] mx-auto",
                      isSelected ? "text-white drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-zinc-400"
                    )}
                  >
                    <span className={cn("text-sm truncate leading-tight", isSelected ? "font-bold" : "font-medium")}>
                      {item.author.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono font-semibold uppercase tracking-widest">
                      {item.langName} {item.author.authorName ? `• ${item.author.authorName}` : ''}
                    </span>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-500 text-sm">
              No Tafsirs found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
              TARGET AYAH
            </span>
            <span className="text-xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {surahNumber}:{ayahNumber}
            </span>
          </div>

          <button
            onClick={handleOpenTafsir}
            disabled={!activeItem}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="size-4" />
            <span>Open Tafsir</span>
          </button>
        </div>

      </div>
    </div>
  );
}

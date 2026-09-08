"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Search, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFuzzyMatch, isTafsirMatch } from "@/lib/searchUtils";
import { getTafsirFameRank, getLanguagePriority } from "@/lib/tafsirRanking";

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

  const selectedIndexRef = useRef(selectedIndex);
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const itemsLengthRef = useRef(items.length);
  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

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

  // Intercept wheel events on mouse and laptop trackpad to step exactly 1 item at a time without jumping
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let accumulatedDelta = 0;
    let lastStepTime = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      accumulatedDelta += e.deltaY;

      // DELTA THRESHOLD: Standard mouse wheel notch produces ~100px.
      // Trackpad produces continuous small values. 35px threshold triggers 1 step cleanly.
      const THRESHOLD = 35;
      const COOLDOWN_MS = 80;

      if (Math.abs(accumulatedDelta) >= THRESHOLD && now - lastStepTime >= COOLDOWN_MS) {
        const direction = accumulatedDelta > 0 ? 1 : -1;
        accumulatedDelta = 0;
        lastStepTime = now;

        const currentIdx = selectedIndexRef.current;
        const nextIdx = Math.max(0, Math.min(itemsLengthRef.current - 1, currentIdx + direction));
        if (nextIdx !== currentIdx) {
          selectedIndexRef.current = nextIdx;
          onSelect(nextIdx);

          if (containerRef.current) {
            isProgrammaticScrollRef.current = true;
            containerRef.current.scrollTo({
              top: nextIdx * ITEM_HEIGHT,
              behavior: "smooth",
            });
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
              isProgrammaticScrollRef.current = false;
              updateStyles();
            }, 200);
          }
        }
      } else if (now - lastStepTime >= 250) {
        accumulatedDelta = 0;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [onSelect, updateStyles]);

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

    return list.sort((a, b) => {
      const langRankA = getLanguagePriority(a.langName);
      const langRankB = getLanguagePriority(b.langName);
      if (langRankA !== langRankB) return langRankA - langRankB;

      const fameRankA = getTafsirFameRank(a.author.name, a.author.authorName);
      const fameRankB = getTafsirFameRank(b.author.name, b.author.authorName);
      if (fameRankA !== fameRankB) return fameRankA - fameRankB;

      return a.author.name.localeCompare(b.author.name);
    });
  }, [languages]);

  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return allAuthors;
    const query = searchQuery.trim();
    return allAuthors.filter((a) =>
      isTafsirMatch(query, a.author, { name: a.langName })
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-[390px] sm:max-w-[420px] bg-popover border border-accent/40 rounded-2xl sm:rounded-3xl p-3 sm:p-5   overflow-hidden flex flex-col gap-2 sm:gap-3">
        
        {/* Ambient Neon Background Glows */}
        <div className="absolute -top-24 -left-24 size-72 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar: Badge, Close X */}
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
            <span>TAFSIR SELECTOR</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-accent pointer-events-none" />
          <input
            type="text"
            placeholder="Search Tafsir, author, or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border-2 border-accent/40 hover:border-accent focus:border-accent rounded-xl sm:rounded-2xl pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all "
          />
        </div>

        {/* Single Wheel Picker Container */}
        <div className="relative z-10 bg-card/50 border border-accent/30 rounded-xl sm:rounded-2xl p-2 sm:p-3 ">
          
          <div className="absolute top-1/2 left-2 right-2 sm:left-3 sm:right-3 -translate-y-1/2 h-[36px] border-2 border-accent/60 bg-accent/10 rounded-xl pointer-events-none   z-20" />

          {filteredAuthors.length > 0 ? (
            <div className="flex flex-col items-center min-w-0">
              <WheelColumn
                items={filteredAuthors}
                selectedIndex={selectedIdx}
                onSelect={setSelectedIdx}
                ariaLabel="Select Tafsir"
                renderItem={(item) => (
                  <div
                    className="flex flex-col justify-center px-3 py-0.5 rounded-lg w-full text-center transition-colors min-w-0 max-w-[320px] mx-auto group-data-[selected=true]:text-foreground  group-data-[selected=false]:text-muted-foreground"
                  >
                    <span className="text-xs sm:text-sm truncate leading-tight group-data-[selected=true]:font-bold group-data-[selected=false]:font-medium">
                      {item.author.name}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground font-mono font-semibold uppercase tracking-widest">
                      {item.langName} {item.author.authorName ? `• ${item.author.authorName}` : ''}
                    </span>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="h-[152px] sm:h-[190px] flex items-center justify-center text-muted-foreground text-sm">
              No Tafsirs found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between pt-1.5 border-t border-border gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              TARGET AYAH
            </span>
            <span className="text-base sm:text-xl font-extrabold font-mono text-accent tracking-tight">
              {surahNumber}:{ayahNumber}
            </span>
          </div>

          <button
            onClick={handleOpenTafsir}
            disabled={!activeItem}
            className="flex items-center gap-1.5 sm:gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs sm:text-sm px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full   hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="size-3.5 sm:size-4" />
            <span>Open Tafsir</span>
          </button>
        </div>

      </div>
    </div>
  );
}

"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

// =========== Shadcn UI and Components ==============
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Sheet } from "../ui/sheet";
import { Input } from "../ui/input";
import Settings from "../Settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetHeader,
} from "../ui/sheet";

// =========== Icons ==============
import MenuIcon from "../svg/icons/MenuIcon";
import LogoIcon from "../svg/icons/LogoIcon";
import ThemeToggleButton from "@/components/ThemeToggleButton";

// =========== Navigation & Routing ==============
import { useRouter } from "next/navigation";
import Link from "next/link";
import useScrollDirection from "@/hooks/useScrollDirection";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ChevronRight, ChevronDown, ArrowLeft, Compass } from "lucide-react";
import { SURAHS_DATA } from "@/lib/surahsData";
import { useAudioStore } from "@/lib/stores/audioStore";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { filterSurahs, parseSurahVerseReference } from "@/lib/searchUtils";

const MobileSheet = ({
  isOpen,
  setIsOpen,
  searchQuery,
  setSearchQuery,
  surahs,
  surahNumber,
}: MobileSheetProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("search");
  const show = useScrollDirection();
  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const { isWordDialogVisible } = useGlobalState();
  const [currentVisibleAyah, setCurrentVisibleAyah] = useState<number | null>(null);

  useEffect(() => {
    const handleVisibleAyah = (e: any) => {
      const ayah = e.detail?.ayah;
      if (typeof ayah === "number" && ayah > 0) {
        setCurrentVisibleAyah(ayah);
      }
    };
    window.addEventListener("visibleAyahChanged", handleVisibleAyah);
    return () => window.removeEventListener("visibleAyahChanged", handleVisibleAyah);
  }, []);

  useEffect(() => {
    const checkAudio = () => {
      const isBodyNoScroll = typeof document !== "undefined" && document.body.classList.contains("no-scrollbar");
      setIsAudioActive(isPlayingAudio || isBodyNoScroll);
    };
    checkAudio();
    const interval = setInterval(checkAudio, 300);
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  useEffect(() => {
    if (isOpen && activeTab === "search" && typeof surahNumber === "number" && surahNumber > 0 && surahs && surahs.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`mobile-surah-${surahNumber}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [surahNumber, isOpen, activeTab, surahs]);

  const parsedVerseRef = parseSurahVerseReference(searchQuery);
  const targetAyahFromSearch = parsedVerseRef?.ayahNumber;

  const filteredSurahs = filterSurahs(searchQuery, surahs || []);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {surahNumber ? (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 w-full lg:hidden flex flex-col gap-2 transition-all duration-300 ease-out p-2 pl-4 pr-2 dark:bg-card/80 bg-card/80 backdrop-blur-3xl border-b dark:border-border border-border/10 shadow-md min-h-16 z-[99999]",
            (show && !isAudioActive && !isWordDialogVisible)
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "-translate-y-full opacity-0 pointer-events-none"
          )}
        >
          {(() => {
            const currentSurahObj = SURAHS_DATA.find((s) => s.number === surahNumber);
            return (
              <div className="flex flex-col w-full gap-2">
                <div className="flex items-center justify-between w-full min-w-0 pr-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <Link
                      href="/home#start_reading"
                      className="p-1.5 -ml-1 rounded-lg bg-card/90 border border-border text-muted-foreground hover:text-accent hover:border-accent/50 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
                      title="Back to All Surahs"
                    >
                      <ArrowLeft className="size-4" />
                    </Link>

                    <div className="flex flex-col min-w-0 justify-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-accent font-extrabold text-base sm:text-lg tracking-tight truncate ">
                          {currentSurahObj?.englishName}
                        </span>
                        {currentSurahObj?.englishNameTranslation && (
                          <span className="text-muted-foreground text-[11px] font-medium truncate max-w-[140px] hidden sm:inline">
                            ({currentSurahObj.englishNameTranslation})
                          </span>
                        )}
                      </div>
                      {currentSurahObj?.englishNameTranslation && (
                        <span className="text-muted-foreground text-[10px] font-medium truncate sm:hidden">
                          {currentSurahObj.englishNameTranslation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {currentSurahObj?.revelationType && (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-semibold tracking-wider uppercase">
                        {currentSurahObj.revelationType}
                      </span>
                    )}
                    <ThemeToggleButton />
                    <button 
                      onClick={() => setIsOpen(true)} 
                      className="p-1.5 rounded-lg bg-card border border-accent/50 text-accent hover:text-accent transition-all duration-300"
                    >
                      <SlidersHorizontal className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 py-1 border-t border-border/40 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-topic-modal"));
                      }
                    }}
                    className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                    title="Explore Topics in this Surah"
                  >
                    <Compass className="size-3.5" />
                    <span>Surah Topics</span>
                  </button>
                  <div className="w-px h-3 bg-border/60" />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-global-topic-modal"));
                      }
                    }}
                    className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                    title="Explore Topics in the Whole Quran"
                  >
                    <Search className="size-3.5" />
                    <span>Quran Topics</span>
                  </button>
                </div>
              </div>
            );
          })()}
          <div className="flex w-full gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <Select
                value={surahNumber.toString()}
                onValueChange={(value) => {
                  router.push(`/surah/${value}`);
                }}
              >
                <SelectTrigger className="w-full h-[38px] bg-card border-accent/40 rounded-lg text-xs text-reading font-medium focus:ring-0 shadow-sm pr-8">
                  <SelectValue placeholder="Select Surah" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[300px]">
                  {SURAHS_DATA.map((s) => (
                    <SelectItem key={s.number} value={s.number.toString()} className="text-foreground focus:bg-accent focus:text-foreground cursor-pointer transition-colors text-xs">
                      {s.number}. {s.englishName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-28 shrink-0">
              <select
                value={currentVisibleAyah ? currentVisibleAyah.toString() : ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0) {
                    window.dispatchEvent(new CustomEvent('jumpToAyah', { detail: { index: val - 1 } }));
                  }
                }}
                className="w-full h-[38px] bg-card border border-border rounded-lg text-xs text-reading font-medium outline-none cursor-pointer appearance-none pl-3 pr-7 shadow-sm focus:border-accent/60"
                title="Go to Ayah"
              >
                <option value="" disabled className="bg-card text-muted-foreground">Ayah...</option>
                {Array.from(
                  { length: SURAHS_DATA.find((s) => s.number === surahNumber)?.numberOfAyahs || 1 },
                  (_, i) => i + 1
                ).map((num) => (
                  <option key={num} value={num.toString()} className="bg-card text-foreground">
                    Ayah {num}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      ) : null}
      <SheetContent
        side="right"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="z-[99999] bg-card bg-background text-foreground text-foreground px-3 sm:px-4 border-l border-border border-border sm:min-w-[25%] min-w-[90%] w-full max-w-[92vw] sm:max-w-md overflow-x-hidden overflow-y-auto touch-pan-y"
      >
        <VisuallyHidden>
          <SheetTitle>Menu</SheetTitle>
          <SheetHeader>Menu</SheetHeader>
        </VisuallyHidden>

        <div className="pt-2 pb-3 px-1 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-accent shrink-0" />
            <span className="font-bold tracking-tight text-foreground text-base">Settings</span>
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto custom-scrollbar pb-10">
          <Settings />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSheet;

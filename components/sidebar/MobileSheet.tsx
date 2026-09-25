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
import { Search, SlidersHorizontal, ChevronRight, ArrowLeft, Compass } from "lucide-react";
import { SURAHS_DATA } from "@/lib/surahsData";
import { useAudioStore } from "@/lib/stores/audioStore";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { isSurahMatch, parseSurahVerseReference } from "@/lib/searchUtils";

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

  const filteredSurahs = surahs?.filter((surah: Surah) =>
    isSurahMatch(searchQuery, surah)
  );
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
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("open-topic-modal"));
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border/80 bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-all shrink-0 cursor-pointer shadow-xs"
                    title="Explore Topics in this Surah"
                  >
                    <Compass className="size-3 text-accent" />
                    <span>Topics</span>
                  </button>
                  {currentSurahObj?.revelationType && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-semibold tracking-wider uppercase">
                      {currentSurahObj.revelationType}
                    </span>
                  )}
                  <ThemeToggleButton />
                  <button 
                    onClick={() => { setActiveTab("settings"); setIsOpen(true); }} 
                    className="p-1.5 rounded-lg bg-card border border-accent/50  text-accent hover:text-accent  transition-all duration-300"
                  >
                    <SlidersHorizontal className="size-4" />
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
              <Select
                value=""
                onValueChange={(value) => {
                  const val = Number(value);
                  if (val > 0) {
                    window.dispatchEvent(new CustomEvent('jumpToAyah', { detail: { index: val - 1 } }));
                  }
                }}
              >
                <SelectTrigger className="w-full h-[38px] bg-card border-border rounded-lg text-xs text-reading font-medium focus:ring-0 shadow-sm pr-8">
                  <SelectValue placeholder="Ayah..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="bg-card border-border max-h-[300px] z-[9999]"
                >
                  {Array.from({ length: SURAHS_DATA.find((s) => s.number === surahNumber)?.numberOfAyahs || 1 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-foreground focus:bg-accent focus:text-foreground cursor-pointer transition-colors text-xs">
                      Ayah {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
      <SheetContent
        side="right"
        className="z-[99999] bg-card bg-background text-foreground text-foreground px-3 sm:px-4 border-l border-border border-border sm:min-w-[25%] min-w-[90%] w-full max-w-[92vw] sm:max-w-md overflow-x-hidden overflow-y-auto touch-pan-y"
      >
        <VisuallyHidden>
          <SheetTitle>Menu</SheetTitle>
          <SheetHeader>Menu</SheetHeader>
        </VisuallyHidden>

        <div className="pt-2 pb-2 px-1 border-b border-border/60">
          <div className="flex items-center gap-2">
            <LogoIcon size={26} className="text-accent shrink-0" />
            <span className="font-bold tracking-tight text-foreground text-base">Al-Juthur</span>
          </div>
        </div>

        <div className="relative mt-3 mx-1">
          <div className="relative flex items-center p-1 bg-background/90 dark:bg-background/90 border border-border rounded-2xl shadow-xl backdrop-blur-2xl overflow-hidden">
            {[
              { key: "search", label: "Search", icon: <Search className="w-4 h-4" /> },
              { key: "settings", label: "Settings", icon: <SlidersHorizontal className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold transition-all duration-200 cursor-pointer select-none group",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-creative-tab-bg"
                      className="absolute inset-0 bg-gradient-to-r from-accent via-accent to-accent rounded-xl border-t border-accent/40  z-0"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 tracking-wide">
                    <span className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "text-accent-foreground drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]")}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-sm ml-0.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "search" && (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <Input
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                  }} // Update search query on input change
                  placeholder="Search Surah (e.g. Al-Nur, 24)..."
                  className="bg-muted text-foreground border-0"
                />
              </div>
            </div>

            <div className="overflow-y-auto scrollable-container max-h-[calc(100vh-220px)] space-y-2 pb-6">
              {filteredSurahs?.map((surah) => {
                const isActive = surah.number === surahNumber;
                return (
                  <Link
                    key={surah.number}
                    id={`mobile-surah-${surah.number}`}
                    href={
                      targetAyahFromSearch && targetAyahFromSearch <= (surah.numberOfAyahs || 999)
                        ? `/surah/${surah.number}?ayah=${targetAyahFromSearch}`
                        : `/surah/${surah.number}`
                    }
                    title={`${surah.englishName} — ${surah.englishNameTranslation}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer w-full",
                      isActive
                        ? "bg-gradient-to-r from-accent/10 to-card border-accent/40 shadow-lg "
                        : "bg-card/50 hover:bg-muted/80 border-border hover:border-accent/30"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-all duration-200 border",
                          isActive
                            ? "bg-accent text-foreground border-accent shadow-md shadow-sm"
                            : "bg-muted text-muted-foreground group-hover:text-accent group-hover:bg-accent/10 border-border"
                        )}
                      >
                        {surah.number}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className={cn(
                            "text-xs font-semibold truncate transition-colors",
                            isActive
                              ? "text-accent font-bold"
                              : "text-foreground group-hover:text-accent"
                          )}
                        >
                          {surah.englishName}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {surah.englishNameTranslation}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="font-sans font-medium text-base text-accent group-hover:text-accent transition-colors">
                        {surah.name}
                      </span>
                      {surah.numberOfAyahs && (
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {surah.numberOfAyahs} ayahs
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "settings" && ( // maybe rename into info
          <Settings />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileSheet;

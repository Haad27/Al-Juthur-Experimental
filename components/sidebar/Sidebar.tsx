"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import SidebarHeader from "./SidebarHeader";
import MobileSheet from "./MobileSheet";
import { fetchAllSurahs } from "@/api/api";
import JuzList from "../JuzList";
import { Input } from "../ui/input";
import { useParams } from "next/navigation";
import Settings from "../Settings";
import { motion } from "framer-motion";
import { BookOpen, SlidersHorizontal, Search, Compass, ChevronRight, ChevronDown } from "lucide-react";
import { useAudioStore } from "@/lib/stores/audioStore";
import { filterSurahs, parseSurahVerseReference } from "@/lib/searchUtils";

type TabKey = "surah" | "settings";
const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "surah", label: "Surah", icon: <BookOpen className="w-4 h-4" /> },
  { key: "settings", label: "Settings", icon: <SlidersHorizontal className="w-4 h-4" /> },
];

const Sidebar = () => {
  // USESTATES START
  const params = useParams();
  const surahNumber = Number(params?.surah);
  // Data States:
  const [surahs, setSurahs] = useState<Surah[]>([]);
  // Active States:
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("surah");
  // Open/Closed States:
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [targetAyahInput, setTargetAyahInput] = useState("");
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

  // USESTATES END

  useEffect(() => {
    const load = async () => {
      const res = await fetchAllSurahs();
      setSurahs(res.data);
    };
    load();
    
    if (typeof window !== "undefined") {
      const isDesktopScreen = window.innerWidth >= 1280;
      const initialCollapsed = !isDesktopScreen;
      setIsCollapsed(initialCollapsed);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("left-sidebar-toggle", { detail: { isCollapsed: initialCollapsed } }));
      }, 0);
    }

    const handleCloseLeftSidebar = () => {
      setIsCollapsed(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("left-sidebar-toggle", { detail: { isCollapsed: true } }));
      }
    };
    window.addEventListener("close-left-sidebar", handleCloseLeftSidebar);
    return () => window.removeEventListener("close-left-sidebar", handleCloseLeftSidebar);
  }, []);

  // Auto-scroll sidebar to the active selected Surah without scrolling the window
  useEffect(() => {
    if (!isCollapsed && activeTab === "surah" && surahNumber > 0 && surahs.length > 0) {
      const timer = setTimeout(() => {
        const container = document.getElementById("sidebar-surah-list");
        const el = document.getElementById(`sidebar-surah-${surahNumber}`);
        if (container && el) {
          const targetTop = el.offsetTop - container.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);
          container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [surahNumber, isCollapsed, activeTab, surahs.length]);

  const toggleSidebar = () => {
    setIsCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("left-sidebar-toggle", { detail: { isCollapsed: next } }));
      }
      return next;
    });
  };
  const parsedVerseRef = parseSurahVerseReference(searchQuery);
  const targetAyahFromSearch = parsedVerseRef?.ayahNumber;

  const filteredSurahs = filterSurahs(searchQuery, surahs);
  // calculate pill position & size (three tabs)
  const idx = tabs.findIndex((t) => t.key === activeTab);
  const pillPct = 100 / tabs.length;
  const pillLeft = `${idx * pillPct}%`;
  const pillW = `${pillPct}%`;

  return (
    <>
      <aside
        className={cn(
          "h-screen h-[100dvh] lg:flex flex-col hidden sticky top-0 z-40 border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0 self-start",
          isAudioActive 
            ? "w-0 opacity-0 overflow-hidden border-none pointer-events-none" 
            : isCollapsed ? "w-16" : "md:w-[350px]"
        )}
      >
        {/* Header with collapse button */}
        <SidebarHeader
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
        />

        {/* Creative Animated Tab Switcher */}
        {!isCollapsed && (
          <div className="relative mt-4 mx-4 shrink-0">
            <div className="relative flex items-center p-1 bg-muted border border-border rounded-2xl overflow-hidden">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold transition-all duration-200 cursor-pointer select-none group",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-creative-tab-bg"
                        className="absolute inset-0 bg-primary rounded-xl z-0"
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
        )}

        {/* Search Input and Verse Selector (Only shown on Surah tab) */}
        {!isCollapsed && activeTab === "surah" && (
          <div className="mt-4 mx-4 flex flex-col gap-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Surah (e.g. Al-Nur, 24)..."
                className="pl-9 pr-3 py-2 bg-card/90 dark:bg-card/90 dark:text-foreground border border-border focus:border-accent/50 rounded-xl text-xs placeholder:text-muted-foreground transition-all shadow-inner"
              />
            </div>

            {surahNumber > 0 && (
              <div className="flex items-center justify-center gap-4 py-1">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-topic-modal"));
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                  title="Explore Topics & Subjects in this Surah"
                >
                  <Compass className="w-3.5 h-3.5" />
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
                  title="Explore Topics & Subjects in the Whole Quran"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Quran Topics</span>
                </button>
              </div>
            )}

            {surahNumber > 0 && surahs.length > 0 && (() => {
              const currentSurahObj = surahs.find((s) => s.number === surahNumber);
              const maxAyahs = currentSurahObj?.numberOfAyahs || 1;
              return (
                <div className="flex items-center justify-between gap-2 bg-card/50 border border-border rounded-xl px-3 py-1.5 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent shrink-0">Go to Ayah:</span>
                  <div className="flex-1 min-w-0 relative">
                    <select
                      value={currentVisibleAyah ? currentVisibleAyah.toString() : ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0) {
                          window.dispatchEvent(new CustomEvent('jumpToAyah', { detail: { index: val - 1 } }));
                        }
                      }}
                      className="w-full h-7 pl-2 pr-6 bg-muted/60 hover:bg-muted border border-border/80 rounded-lg text-foreground font-mono text-xs cursor-pointer outline-none appearance-none transition-colors"
                      title="Select an Ayah from list"
                    >
                      <option value="" disabled className="bg-card text-muted-foreground">Select Ayah...</option>
                      {Array.from({ length: maxAyahs }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num.toString()} className="bg-card text-foreground">
                          Ayah {num}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Surah Panel */}
        {!isCollapsed && activeTab === "surah" && (
          <div id="sidebar-surah-list" className="p-4 pb-12 space-y-2 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            {filteredSurahs.map((surah) => {
              const isActive = surah.number === surahNumber;
              return (
                <Link
                  key={surah.number}
                  id={`sidebar-surah-${surah.number}`}
                  href={
                    targetAyahFromSearch && targetAyahFromSearch <= (surah.numberOfAyahs || 999)
                      ? `/surah/${surah.number}?ayah=${targetAyahFromSearch}`
                      : `/surah/${surah.number}`
                  }
                  title={`${surah.englishName} — ${surah.englishNameTranslation}`}
                  className={cn(
                    "p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer",
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
                    <span className="font-arabic text-base text-accent group-hover:text-accent transition-colors">
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
        )}

        {/* Page Panel */}
        {!isCollapsed && activeTab === "settings" && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
            <Settings />
          </div>
        )}
      </aside>

      {/* Mobile version */}
      <MobileSheet
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        surahs={surahs}
        surahNumber={surahNumber}
      />
    </>
  );
};

export default Sidebar;

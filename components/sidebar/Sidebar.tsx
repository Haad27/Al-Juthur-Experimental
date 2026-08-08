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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { motion } from "framer-motion";
import { BookOpen, SlidersHorizontal, Search } from "lucide-react";

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

  // USESTATES END

  useEffect(() => {
    const load = async () => {
      const res = await fetchAllSurahs();
      setSurahs(res.data);
    };
    load();
    
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("left-sidebar-toggle", { detail: { isCollapsed: true } }));
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

  const toggleSidebar = () => {
    setIsCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("left-sidebar-toggle", { detail: { isCollapsed: next } }));
      }
      return next;
    });
  };
  const filteredSurahs = surahs.filter((surah) =>
    surah.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // calculate pill position & size (three tabs)
  const idx = tabs.findIndex((t) => t.key === activeTab);
  const pillPct = 100 / tabs.length;
  const pillLeft = `${idx * pillPct}%`;
  const pillW = `${pillPct}%`;

  return (
    <div>
      <div
        className={cn(
          "min-h-screen lg:block hidden sticky top-0 z-40 border-r dark:border-[#262629ff] border-[var(--sephia-500)] bg-zinc-900 text-white transition-all duration-300 shadow-sm",
          isCollapsed ? "w-16" : "md:w-[350px]" // fix mobilesheet hiding before MD (yk)
        )}
      >
        {/* Header with collapse button */}
        <SidebarHeader
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
        />

        {/* Creative Animated Tab Switcher */}
        {!isCollapsed && (
          <div className="relative mt-4 mx-4">
            <div className="relative flex items-center p-1 bg-zinc-950/90 dark:bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-2xl overflow-hidden">
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
                        ? "text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-creative-tab-bg"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 rounded-xl border-t border-emerald-300/40 shadow-[0_0_20px_rgba(16,185,129,0.35)] z-0"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2 tracking-wide">
                      <span className={cn("transition-transform duration-200 group-hover:scale-110", isActive && "text-emerald-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]")}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shadow-sm ml-0.5" />
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
          <div className="mt-4 mx-4 flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Surah by name..."
                className="pl-9 pr-3 py-2 bg-zinc-900/80 dark:bg-zinc-900/80 dark:text-zinc-100 border border-zinc-800 focus:border-emerald-500/60 rounded-xl text-xs placeholder:text-zinc-500 transition-all shadow-inner"
              />
            </div>

            {surahNumber > 0 && surahs.length > 0 && (
              <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3 py-1.5 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 shrink-0">Go to Ayah:</span>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const val = Number(value);
                    if (val > 0) {
                      window.dispatchEvent(new CustomEvent('jumpToAyah', { detail: { index: val - 1 } }));
                    }
                  }}
                >
                  <SelectTrigger className="flex-1 h-7 bg-transparent border-0 shadow-none hover:bg-zinc-800/50 rounded-lg dark:text-zinc-200 text-black font-mono text-xs focus:ring-0">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[300px]">
                    {Array.from(
                      { length: surahs.find(s => s.number === surahNumber)?.numberOfAyahs || 1 },
                      (_, i) => i + 1
                    ).map(num => (
                      <SelectItem key={num} value={num.toString()} className="text-zinc-200 focus:bg-emerald-600 focus:text-white cursor-pointer transition-colors">
                        Ayah {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Surah Panel */}
        {!isCollapsed && activeTab === "surah" && (
          <div className="p-4 space-y-2 overflow-y-auto scrollable-container max-h-[calc(100vh-210px)]">
            {filteredSurahs.map((surah) => {
              const isActive = surah.number === surahNumber;
              return (
                <Link
                  key={surah.number}
                  href={`/surah/${surah.number}`}
                  title={`${surah.englishName} — ${surah.englishNameTranslation}`}
                  className={cn(
                    "p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-emerald-950/60 to-zinc-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                      : "bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-800/60 hover:border-emerald-500/30"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-all duration-200 border",
                        isActive
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30"
                          : "bg-zinc-800/80 text-zinc-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/10 border-zinc-700/50"
                      )}
                    >
                      {surah.number}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          "text-xs font-semibold truncate transition-colors",
                          isActive
                            ? "text-emerald-400 font-bold"
                            : "text-zinc-200 group-hover:text-emerald-300"
                        )}
                      >
                        {surah.englishName}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {surah.englishNameTranslation}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <span className="font-arabic text-base text-emerald-400/90 group-hover:text-emerald-300 transition-colors">
                      {surah.name}
                    </span>
                    {surah.numberOfAyahs && (
                      <span className="text-[9px] text-zinc-500 font-mono">
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
        {!isCollapsed && activeTab === "settings" && <Settings />}
        {/* 
        {!isCollapsed && activeTab === "settings" && (
          <div className="px-5 py-4">
            <Link
              href="/support"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl transition"
            >
              Support Us ♥
            </Link>
          </div>
        )} */}
      </div>

      {/* Mobile version */}
      <MobileSheet
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        surahs={surahs}
        surahNumber={surahNumber}
      />
    </div>
  );
};

export default Sidebar;

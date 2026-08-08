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

// =========== Navigation & Routing ==============
import { useRouter } from "next/navigation";
import Link from "next/link";
import useScrollDirection from "@/hooks/useScrollDirection";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ChevronRight } from "lucide-react";
import { SURAHS_DATA } from "@/lib/surahsData";

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

  const filteredSurahs = surahs?.filter((surah: Surah) =>
    surah.englishName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {surahNumber ? (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 w-full lg:hidden flex flex-col gap-2 transition-transform duration-300 ease-out p-2 pl-4 pr-2 dark:bg-zinc-950/60 bg-zinc-950/60 backdrop-blur-3xl border-b dark:border-zinc-800/60 border-black/10 shadow-md min-h-16 z-[99999]",
            show ? "translate-y-0" : "-translate-y-full"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-sm tracking-wide">
                {SURAHS_DATA.find((s) => s.number === surahNumber)?.englishName}
              </span>
            </div>
            <button 
              onClick={() => { setActiveTab("settings"); setIsOpen(true); }} 
              className="p-1.5 rounded-lg bg-zinc-900 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)] text-emerald-400 hover:text-emerald-300 hover:shadow-[0_0_16px_rgba(16,185,129,0.6)] transition-all duration-300"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
          <div className="flex w-full gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <Select
                value={surahNumber.toString()}
                onValueChange={(value) => {
                  router.push(`/surah/${value}`);
                }}
              >
                <SelectTrigger className="w-full h-[38px] bg-zinc-900 border-emerald-500/50 rounded-lg text-xs text-zinc-300 font-medium focus:ring-0 shadow-sm pr-8">
                  <SelectValue placeholder="Select Surah" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[300px]">
                  {SURAHS_DATA.map((s) => (
                    <SelectItem key={s.number} value={s.number.toString()} className="text-zinc-200 focus:bg-emerald-600 focus:text-white cursor-pointer transition-colors text-xs">
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
                  const ayahNumber = value;
                  const element = document.getElementById(`ayah-${ayahNumber}`);
                  if (element) {
                    element.scrollIntoView({ behavior: "auto", block: "center" });
                    const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
                    element.classList.add(...c);
                    setTimeout(() => element.classList.remove(...c), 2000);
                  } else {
                    router.replace(`/surah/${surahNumber}?ayah=${ayahNumber}`);
                  }
                }}
              >
                <SelectTrigger className="w-full h-[38px] bg-zinc-900 border-zinc-800 rounded-lg text-xs text-zinc-300 font-medium focus:ring-0 shadow-sm pr-8">
                  <SelectValue placeholder="Ayah..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[300px]">
                  {Array.from({ length: SURAHS_DATA.find((s) => s.number === surahNumber)?.numberOfAyahs || 1 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-zinc-200 focus:bg-emerald-600 focus:text-white cursor-pointer transition-colors text-xs">
                      Ayah {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : (
        <SheetTrigger
          className={cn(
            "fixed top-0 left-0 right-0 w-full lg:hidden flex justify-between items-center transition-transform duration-300 ease-out p-2 px-4 dark:bg-zinc-950/60 bg-zinc-950/60 backdrop-blur-3xl border-b dark:border-zinc-800/60 border-black/10 shadow-md min-h-16 z-[99999]",
            show ? "translate-y-0" : "-translate-y-full"
          )}
          id="mobile-menu-trigger"
        >
          <LogoIcon
            onClick={() => router.push("/")}
            className="dark:text-white text-black"
          />
          <MenuIcon
            onClick={() => setIsOpen(true)}
            className="dark:text-white text-black"
          />
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        className="z-999999 dark:bg-zinc-900 bg-[var(--sephia-200)] dark:text-white text-black px-4 border-l dark:border-[#262629ff] border-black sm:min-w-[25%] min-w-[90%]" // maybe make transparent and add backdrop MAYBE REVERT BACK TO NOT  bg-transparent backdrop-blur-md
      >
        <VisuallyHidden>
          <SheetTitle>Menu</SheetTitle>
          <SheetHeader>Menu</SheetHeader>
        </VisuallyHidden>

        {/* <div className="mt-2 px-2">
          <p className="text-gray-400 text-xl">Menu</p>
        </div> */}
        <div className="relative mt-4 mx-1">
          <div className="relative flex items-center p-1 bg-zinc-950/90 dark:bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-2xl overflow-hidden">
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
                      ? "text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-creative-tab-bg"
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

        {activeTab === "search" && (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <Input
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                  }} // Update search query on input change
                  placeholder="Search by Surah"
                  className="bg-zinc-800 text-white border-0"
                />
              </div>
            </div>

            <div className="overflow-y-auto scrollable-container max-h-[calc(100vh-220px)] space-y-2 pb-6">
              {filteredSurahs?.map((surah) => {
                const isActive = surah.number === surahNumber;
                return (
                  <Link
                    key={surah.number}
                    href={`/surah/${surah.number}`}
                    title={`${surah.englishName} — ${surah.englishNameTranslation}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between group cursor-pointer w-full",
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
                      <span className="font-sans font-medium text-base text-emerald-400/90 group-hover:text-emerald-300 transition-colors">
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

"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

// =========== Shadcn UI and Components ==============
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Sheet } from "../ui/sheet";
import { Input } from "../ui/input";
import Settings from "../Settings";

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
import { Search, SlidersHorizontal } from "lucide-react";

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
      <SheetTrigger
        className={cn(
          "fixed w-full lg:hidden flex justify-between items-center transition-all duration-300 p-2 px-4 backdrop-blur-md border-b dark:border-[#262629ff] border-black min-h-16 z-99999",
          show ? "top-0" : "-top-16"
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

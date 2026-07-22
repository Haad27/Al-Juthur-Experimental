"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { ALL_TRANSLATION_OPTIONS, TranslationOption } from "@/lib/translationsManifest";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Check, ChevronDown, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function TranslationSelector() {
  const router = useRouter();
  const { translationEdition, setTranslationEdition } = useGlobalState();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentOption = useMemo(() => {
    return (
      ALL_TRANSLATION_OPTIONS.find((opt) => opt.identifier === translationEdition) ||
      ALL_TRANSLATION_OPTIONS.find((opt) => opt.identifier === "en.sahih") ||
      ALL_TRANSLATION_OPTIONS[0]
    );
  }, [translationEdition]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return ALL_TRANSLATION_OPTIONS;
    const query = search.toLowerCase();
    return ALL_TRANSLATION_OPTIONS.filter(
      (opt) =>
        opt.englishName.toLowerCase().includes(query) ||
        opt.languageLabel.toLowerCase().includes(query) ||
        opt.name.toLowerCase().includes(query) ||
        opt.identifier.toLowerCase().includes(query)
    );
  }, [search]);

  // Group filtered options by language
  const groupedOptions = useMemo(() => {
    const groups: Record<string, TranslationOption[]> = {};
    for (const opt of filteredOptions) {
      if (!groups[opt.languageLabel]) {
        groups[opt.languageLabel] = [];
      }
      groups[opt.languageLabel].push(opt);
    }
    return groups;
  }, [filteredOptions]);

  const handleSelect = (identifier: string) => {
    setTranslationEdition(identifier);
    setOpen(false);
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 transition-all duration-200 text-left group shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200">
              <Languages className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {currentOption.languageLabel} — {currentOption.englishName}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {currentOption.name} ({currentOption.identifier})
              </span>
            </div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0", open && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 sm:w-96 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl z-50 text-zinc-900 dark:text-zinc-100"
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Select Translation (124 Local)</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              {filteredOptions.length} available
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by language, author..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* List of translations grouped by language */}
          <div className="max-h-64 overflow-y-auto scrollable-container space-y-3 pr-1">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-400">
                No local translation found for &quot;{search}&quot;
              </div>
            ) : (
              Object.entries(groupedOptions).map(([lang, options]) => (
                <div key={lang} className="space-y-1">
                  <div className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 z-10 border-b border-zinc-200/50 dark:border-zinc-800/50">
                    {lang}
                  </div>
                  {options.map((opt) => {
                    const isSelected = opt.identifier === currentOption.identifier;
                    return (
                      <button
                        key={opt.identifier}
                        onClick={() => handleSelect(opt.identifier)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex flex-col overflow-hidden mr-2">
                          <span className="truncate">{opt.englishName}</span>
                          <span className="text-[10px] text-zinc-400 truncate">
                            {opt.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

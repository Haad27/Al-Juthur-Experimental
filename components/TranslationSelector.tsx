"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { ALL_TRANSLATION_OPTIONS, TranslationOption } from "@/lib/translationsManifest";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Check, ChevronDown, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_LANGUAGES = [
  "All",
  "English",
  "Urdu",
  "Arabic",
  "Turkish",
  "Spanish",
  "French",
  "German",
  "Persian",
  "Hindi",
  "Bengali",
  "Indonesian"
];

export default function TranslationSelector() {
  const router = useRouter();
  const { translationEdition, setTranslationEdition } = useGlobalState();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeLangPill, setActiveLangPill] = useState("All");

  const currentOption = useMemo(() => {
    return (
      ALL_TRANSLATION_OPTIONS.find((opt) => opt.identifier === translationEdition) ||
      ALL_TRANSLATION_OPTIONS.find((opt) => opt.identifier === "203") ||
      ALL_TRANSLATION_OPTIONS[0]
    );
  }, [translationEdition]);

  const filteredOptions = useMemo(() => {
    let list = ALL_TRANSLATION_OPTIONS;

    // Filter by quick language pill if selected
    if (activeLangPill !== "All") {
      const target = activeLangPill.toLowerCase();
      list = list.filter((opt) => {
        const langLabel = opt.languageLabel.toLowerCase();
        const langCode = opt.languageCode.toLowerCase();
        const id = opt.identifier.toLowerCase();
        
        if (langLabel === target || langCode === target) return true;
        if (target === "english" && (langCode === "en" || id.startsWith("en."))) return true;
        if (target === "urdu" && (langCode === "ur" || id.startsWith("ur."))) return true;
        if (target === "arabic" && (langCode === "ar" || id.startsWith("ar."))) return true;
        if (target === "spanish" && (langCode === "es" || id.startsWith("es."))) return true;
        if (target === "french" && (langCode === "fr" || id.startsWith("fr."))) return true;
        if (target === "german" && (langCode === "de" || id.startsWith("de."))) return true;
        if (target === "turkish" && (langCode === "tr" || id.startsWith("tr."))) return true;
        if (target === "persian" && (langCode === "fa" || id.startsWith("fa."))) return true;
        if (target === "hindi" && (langCode === "hi" || id.startsWith("hi."))) return true;
        if (target === "bengali" && (langCode === "bn" || id.startsWith("bn."))) return true;
        if (target === "indonesian" && (langCode === "id" || id.startsWith("id."))) return true;
        
        return false;
      });
    }

    // Filter by search text query
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (opt) =>
          opt.englishName.toLowerCase().includes(query) ||
          opt.languageLabel.toLowerCase().includes(query) ||
          opt.name.toLowerCase().includes(query) ||
          opt.identifier.toLowerCase().includes(query)
      );
    }

    return list;
  }, [search, activeLangPill]);

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
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 transition-all duration-200 text-left group shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {currentOption.languageLabel} — {currentOption.englishName}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {currentOption.name} ({currentOption.identifier})
              </span>
            </div>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ml-1", open && "rotate-180")} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        collisionPadding={16}
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[340px] max-h-[min(360px,var(--radix-popover-content-available-height))] p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl z-50 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden"
      >
        <div className="flex flex-col space-y-2.5 min-h-0 flex-1 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-0.5 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Translation ({ALL_TRANSLATION_OPTIONS.length} Editions)</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {filteredOptions.length}
            </span>
          </div>

          {/* Quick Language Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] shrink-0">
            {POPULAR_LANGUAGES.map((lang) => {
              const isActive = activeLangPill === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLangPill(lang)}
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0",
                    isActive
                      ? "bg-emerald-500 text-white shadow-xs font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search author, language..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* List of translations grouped by language */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollable-container space-y-2 pr-0.5">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-400">
                No translation found for &quot;{search || activeLangPill}&quot;
              </div>
            ) : (
              Object.entries(groupedOptions).map(([lang, options]) => (
                <div key={lang} className="space-y-1">
                  <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 z-10 border-b border-zinc-200/50 dark:border-zinc-800/50">
                    {lang}
                  </div>
                  {options.map((opt) => {
                    const isSelected = opt.identifier === currentOption.identifier;
                    return (
                      <button
                        key={opt.identifier}
                        type="button"
                        onClick={() => handleSelect(opt.identifier)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex flex-col overflow-hidden mr-2 min-w-0">
                          <span className="truncate text-xs">{opt.englishName}</span>
                          <span className="text-[10px] text-zinc-400 truncate">
                            {opt.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />
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

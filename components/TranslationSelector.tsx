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

  // Helper to get priority rank for languages
  const getLangPriorityRank = (lang: string) => {
    const lower = (lang || "").toLowerCase();
    if (lower === "english" || lower.startsWith("english")) return 1;
    if (lower === "urdu" || lower.startsWith("urdu")) return 2;
    if (lower === "arabic" || lower.startsWith("arabic")) return 3;
    return 100;
  };

  // Group filtered options by language
  const groupedOptions = useMemo(() => {
    const groups: Record<string, TranslationOption[]> = {};
    for (const opt of filteredOptions) {
      if (!groups[opt.languageLabel]) {
        groups[opt.languageLabel] = [];
      }
      groups[opt.languageLabel].push(opt);
    }

    const sortedEntries = Object.entries(groups).sort(([langA, optsA], [langB, optsB]) => {
      const rankA = getLangPriorityRank(langA);
      const rankB = getLangPriorityRank(langB);
      if (rankA <= 3 || rankB <= 3) {
        if (rankA !== rankB) return rankA - rankB;
      }
      if (optsB.length !== optsA.length) return optsB.length - optsA.length;
      return langA.localeCompare(langB);
    });

    const sortedGroups: Record<string, TranslationOption[]> = {};
    for (const [lang, opts] of sortedEntries) {
      sortedGroups[lang] = opts;
    }
    return sortedGroups;
  }, [filteredOptions]);

  const allGroupedByLanguage = useMemo(() => {
    const map: Record<string, TranslationOption[]> = {};
    for (const opt of ALL_TRANSLATION_OPTIONS) {
      if (!map[opt.languageLabel]) map[opt.languageLabel] = [];
      map[opt.languageLabel].push(opt);
    }

    const sortedEntries = Object.entries(map).sort(([langA, optsA], [langB, optsB]) => {
      const rankA = getLangPriorityRank(langA);
      const rankB = getLangPriorityRank(langB);
      if (rankA <= 3 || rankB <= 3) {
        if (rankA !== rankB) return rankA - rankB;
      }
      if (optsB.length !== optsA.length) return optsB.length - optsA.length;
      return langA.localeCompare(langB);
    });

    const sortedMap: Record<string, TranslationOption[]> = {};
    for (const [lang, opts] of sortedEntries) {
      sortedMap[lang] = opts;
    }
    return sortedMap;
  }, []);

  const handleSelect = (identifier: string) => {
    setTranslationEdition(identifier);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative w-full">
      {/* Mobile Native Translation Selector Overlay */}
      <select
        value={translationEdition}
        onChange={(e) => handleSelect(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 sm:hidden cursor-pointer z-20 bg-card text-foreground"
        aria-label="Select Translation"
      >
        {Object.entries(allGroupedByLanguage).map(([lang, options]) => (
          <optgroup key={lang} label={lang} className="bg-card text-accent font-bold">
            {options.map((opt) => (
              <option key={opt.identifier} value={opt.identifier} className="bg-card text-foreground py-1">
                {opt.languageLabel} — {opt.englishName} ({opt.name})
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border dark:border-border bg-muted/80 dark:bg-muted hover:bg-muted dark:hover:bg-muted transition-all duration-200 text-left group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="p-1.5 rounded-lg bg-accent/10 text-accent dark:text-accent group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Languages className="w-4 h-4" />
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-xs font-semibold text-foreground dark:text-foreground truncate">
                  {currentOption.languageLabel} — {currentOption.englishName}
                </span>
                <span className="text-[11px] text-muted-foreground dark:text-muted-foreground truncate">
                  {currentOption.name} ({currentOption.identifier})
                </span>
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-1", open && "rotate-180")} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[340px] max-h-[min(360px,var(--radix-popover-content-available-height))] p-3 bg-popover dark:bg-card backdrop-blur-2xl border border-border dark:border-border shadow-2xl rounded-2xl z-[9999999] text-foreground dark:text-foreground flex flex-col overflow-hidden hidden sm:flex"
        >
        <div className="flex flex-col space-y-2.5 min-h-0 flex-1 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-0.5 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Translation ({ALL_TRANSLATION_OPTIONS.length} Editions)</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
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
                      ? "bg-accent text-foreground shadow-xs font-semibold"
                      : "bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground dark:hover:text-foreground"
                  )}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search author, language..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-muted dark:bg-muted border border-border dark:border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
            />
          </div>

          {/* List of translations grouped by language */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollable-container space-y-2 pr-0.5">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No translation found for &quot;{search || activeLangPill}&quot;
              </div>
            ) : (
              Object.entries(groupedOptions).map(([lang, options]) => (
                <div key={lang} className="space-y-1">
                  <div className="sticky top-0 bg-popover dark:bg-card backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground z-10 border-b border-border dark:border-border/50">
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
                            ? "bg-accent/10 text-accent dark:text-accent font-semibold"
                            : "hover:bg-muted dark:hover:bg-muted/80 text-muted-foreground dark:text-reading"
                        )}
                      >
                        <div className="flex flex-col overflow-hidden mr-2 min-w-0">
                          <span className="truncate text-xs">{opt.englishName}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {opt.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-1" />
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
    </div>
  );
}

"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Compass, BookOpen, Layers, ChevronRight, ArrowRight, BookOpenText } from "lucide-react";
import { 
  getSurahThematicOutline, 
  searchSurahTopics, 
  searchTafsirTopics,
  searchGlobalTopics,
  TopicSearchResult,
  ThematicSection 
} from "@/lib/topicSearchEngine";
import { cn } from "@/lib/utils";
import { SURAHS_DATA } from "@/lib/surahsData";

interface TopicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "tafsir" | "surah" | "quran";
  surahId?: number;
  surahName?: string;
  authorName?: string;
  loadedTafsir?: Record<number, any>;
  loadedAyahs?: { numberInSurah: number; translation?: string; text?: string }[];
  onSelectAyah: (ayahNumber: number, toAyah?: number, surahNumber?: number) => void;
}

export default function TopicSearchModal({
  isOpen,
  onClose,
  mode,
  surahId,
  surahName,
  authorName,
  loadedTafsir = {},
  loadedAyahs,
  onSelectAyah,
}: TopicSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Thematic sections for this Surah
  const thematicSections = useMemo<ThematicSection[]>(() => {
    if (!surahId || mode === "quran") return [];
    return getSurahThematicOutline(surahId);
  }, [surahId, mode]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Compute search results instantly (0ms latency, zero AI calls)
  const results = useMemo<TopicSearchResult[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (mode === "quran") {
      return searchGlobalTopics(trimmed);
    } else if (mode === "tafsir" && surahId) {
      return searchTafsirTopics(surahId, null, trimmed, loadedTafsir);
    } else if (surahId) {
      return searchSurahTopics(surahId, trimmed, loadedAyahs);
    }
    return [];
  }, [query, mode, surahId, loadedTafsir, loadedAyahs]);

  if (!isOpen) return null;

  // Highlight matching query terms inside text snippet
  const renderHighlightedSnippet = (snippet: string, q: string) => {
    if (!q.trim()) return snippet;
    const terms = q.trim().toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return snippet;

    // Build regex for matching terms
    const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");

    const parts = snippet.split(regex);
    return parts.map((part, i) => {
      if (terms.some(t => t.toLowerCase() === part.toLowerCase())) {
        return (
          <mark key={i} className="bg-accent/25 text-accent font-semibold px-1 py-0.5 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const handleSelectResult = (ayahNumber: number, toAyah?: number, resultSurahId?: number) => {
    onSelectAyah(ayahNumber, toAyah, resultSurahId);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-2.5 min-w-0 mr-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5 sm:gap-2">
                <span className="truncate">Topic &amp; Subject Explorer</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/25 font-medium shrink-0">
                  {mode === "tafsir" ? "Tafsir Mode" : mode === "quran" ? "Whole Quran Mode" : "Surah Mode"}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {mode === "quran" ? "Searching across all 114 Surahs" : `${surahName} (Surah ${surahId}) ${authorName ? `- ${authorName}` : ""}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-border bg-background/50">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "tafsir"
                  ? "Search a topic in this Tafsir (e.g., Fasting, Adam, Taqwa, Usury, Hypocrites)..."
                  : "Search a topic or concept in this Surah (e.g., Prayer, Moses, Inheritance, Patience)..."
              }
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-card border border-border focus:border-accent/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* If query is empty, show curated Thematic Sections for this Surah */}
          {!query.trim() && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>Curated Thematic Sections of Surah {surahId}</span>
              </div>

              {thematicSections.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {thematicSections.map((sec, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(sec.fromAyah, sec.toAyah)}
                      className="text-left group p-3 rounded-lg border border-border bg-card/60 hover:bg-accent/5 hover:border-accent/40 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/25">
                            Ayah {sec.rangeStr}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground line-clamp-2 transition-colors">
                          {sec.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Type a topic or concept in the search bar above to discover where it is discussed in this {mode === "tafsir" ? "Tafsir" : "Surah"}.
                </p>
              )}

              {/* Quick Topic Chips */}
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Popular Subjects:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Tawhid", "Taqwa", "Salat", "Fasting", "Charity", "Inheritance", "Patience", "Repentance", "Prophets", "Hypocrisy", "Paradise", "Day of Judgment"].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setQuery(topic)}
                      className="text-xs px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-accent/10 hover:text-accent hover:border-accent/30 text-foreground transition-all"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* If query has text, show real-time Search Results */}
          {query.trim() && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  Found <strong className="text-accent">{results.length}</strong> {results.length === 1 ? "discussion" : "discussions"} for &ldquo;{query}&rdquo;
                </span>
              </div>

              {results.length > 0 ? (
                <div className="space-y-2.5">
                  {results.map((res) => (
                    <div
                      key={res.id}
                      className="p-3.5 rounded-xl border border-border bg-card/80 hover:border-accent/50 hover:bg-accent/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/25">
                            {mode === "quran" ? `Surah ${res.surahId}, Ayah ${res.ayahNumber}` : `Ayah ${res.ayahNumber}`}{res.toAyah ? `-${res.toAyah}` : ""}
                          </span>
                          {res.category && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              {res.category}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-foreground">
                          {res.title}
                        </h4>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {renderHighlightedSnippet(res.snippet, query)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSelectResult(res.ayahNumber, res.toAyah, res.surahId)}
                        className="self-stretch sm:self-center shrink-0 flex items-center justify-center gap-1.5 text-xs font-medium px-3.5 py-2 sm:py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent hover:text-white dark:hover:text-black border border-accent/30 transition-colors cursor-pointer"
                      >
                        <span>{mode === "tafsir" ? "Jump to Commentary" : "Jump to Ayah"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-lg border border-dashed border-border text-muted-foreground space-y-2">
                  <BookOpenText className="w-8 h-8 mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">No specific matches in this {mode === "tafsir" ? "Tafsir" : "Surah"}</p>
                  <p className="text-xs">
                    Try searching by a broader keyword (e.g. &ldquo;Fasting&rdquo;, &ldquo;Patience&rdquo;, &ldquo;Moses&rdquo;, &ldquo;Charity&rdquo;) or explore the curated thematic sections.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-border bg-card/90 flex items-center justify-end text-xs text-muted-foreground">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors font-medium text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

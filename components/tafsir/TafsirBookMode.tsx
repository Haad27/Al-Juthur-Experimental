"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen, ArrowLeft, Columns2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { amiriquran, inter } from "@/app/fonts";
import { SURAHS_DATA } from "@/lib/surahsData";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { getEnglishFont, getUrduFont } from "@/lib/fontsConfig";
import ThemeToggleButton from "@/components/ThemeToggleButton";

interface TafsirEntry {
  id?: number;
  authorId?: number;
  surahId?: number;
  ayahId?: number;
  text: string;
  ayah?: {
    id?: number;
    surahId?: number;
    numberInSurah?: number;
    text?: string;
  };
  author?: { name?: string };
  footnoteIds?: string[];
}

interface Author {
  id: number;
  name: string;
  authorName?: string;
  languageId?: number;
}

interface TafsirBookModeProps {
  loadedTafsir: Record<number, TafsirEntry>;
  activeSurah: number;
  activeLangName: string;
  activeAuthor: Author;
  totalAyahs: number;
  initialAyah?: number;
  onAyahChange?: (ayah: number) => void;
  onExitBookMode: () => void;
  onBackToLibrary: () => void;
  allAuthorsWithLang: { author: Author; language: { id: number; name: string } }[];
  onSwitchAuthor: (author: Author, langName: string) => void;
  onSurahChange: (surahId: number) => void;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export default function TafsirBookMode({
  loadedTafsir,
  activeSurah,
  activeLangName,
  activeAuthor,
  totalAyahs,
  initialAyah = 1,
  onAyahChange,
  onExitBookMode,
  onBackToLibrary,
  allAuthorsWithLang,
  onSwitchAuthor,
  onSurahChange,
}: TafsirBookModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { englishFont, urduFont } = useGlobalState();
  const isUrdu = activeLangName.toLowerCase().includes("urdu");
  const isArabic = activeLangName.toLowerCase().includes("arabic");
  const isRtl = isUrdu || isArabic || activeLangName.toLowerCase().includes("persian");

  const fontFamily = isUrdu
    ? getUrduFont(urduFont).fontFamily
    : getEnglishFont(englishFont).fontFamily;

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.overflow;
    const origHeight = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
      document.documentElement.style.overflow = origHeight;
    };
  }, []);

  const orderedEntries = useMemo(() => {
    const arr: TafsirEntry[] = [];
    for (let i = 1; i <= totalAyahs; i++) {
      if (loadedTafsir[i]) arr.push(loadedTafsir[i]);
    }
    return arr;
  }, [loadedTafsir, totalAyahs]);

  // Measure columns to determine total pages
  const measurePages = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const scrollWidth = contentRef.current.scrollWidth;

    const pages = Math.max(1, Math.round(scrollWidth / containerWidth));
    setTotalPages(pages);

    setCurrentPage((prev) => Math.min(prev, pages - 1));
    setIsReady(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(measurePages, 100);
    window.addEventListener("resize", measurePages);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measurePages);
    };
  }, [measurePages, orderedEntries]);

  // Navigation
  const goNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        isRtl ? goPrev() : goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        isRtl ? goNext() : goPrev();
      } else if (e.key === "Escape") {
        onExitBookMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onExitBookMode, isRtl]);

  const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);

  return (
    <div
      className={cn(inter.className, "bg-background text-foreground")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        className="bg-card border-b border-border"
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.75rem",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
          <button
            onClick={onBackToLibrary}
            className="text-accent hover:bg-accent/10 border border-accent/25"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Back to Library"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>

          <select
            value={activeSurah}
            onChange={(e) => onSurahChange(Number(e.target.value))}
            className="bg-accent/10 text-accent border border-accent/25"
            style={{
              appearance: "none",
              borderRadius: 8,
              padding: "0.3rem 1.4rem 0.3rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {SURAHS_DATA.map((s) => (
              <option key={s.number} value={s.number} className="bg-background text-foreground">
                {s.number}. {s.englishName}
              </option>
            ))}
          </select>

          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <button
            onClick={onExitBookMode}
            className="text-accent hover:bg-accent/10 border border-accent/25"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0.3rem 0.6rem",
              borderRadius: 8,
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Switch to Scroll Mode"
          >
            <Columns2 style={{ width: 14, height: 14 }} />
            <span className="hidden sm:inline">Scroll</span>
          </button>
          <ThemeToggleButton />
        </div>
      </div>

      {/* ── Book area ────────────────────────────────────────────── */}
      <style>{`
        .book-columns {
          column-width: calc(50vw - 4rem);
          column-gap: 4rem;
          padding: 2rem;
        }
        .page-num-left, .page-num-right, .page-num-mobile {
          position: absolute;
          bottom: 0.5rem;
          color: inherit;
          font-size: 0.65rem;
          font-variant-numeric: tabular-nums;
          opacity: 0.4;
          z-index: 10;
        }
        .page-num-left { left: 2rem; }
        .page-num-right { right: 2rem; }
        .page-num-mobile { left: 50%; transform: translateX(-50%); }

        @media (max-width: 768px) {
          .book-columns {
            column-width: calc(100vw - 3rem);
            column-gap: 3rem;
            padding: 1.5rem;
          }
          .page-num-left, .page-num-right { display: none; }
          .page-num-mobile { display: block; }
        }
        @media (min-width: 769px) {
          .page-num-left, .page-num-right { display: block; }
          .page-num-mobile { display: none; }
        }
        .book-columns p, .book-columns div {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {!isReady && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", zIndex: 10 }}>
            <BookOpen className="text-accent" style={{ width: 32, height: 32, opacity: 0.5, animation: "pulse 2s infinite" }} />
            <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              Flowing text...
            </span>
          </div>
        )}

        {/* Floating Page Numbers */}
        {isReady && (
          <>
            <div className="page-num-left text-foreground">
               {isRtl ? (currentPage * 2) + 2 : (currentPage * 2) + 1}
            </div>
            <div className="page-num-right text-foreground">
               {isRtl ? (currentPage * 2) + 1 : (currentPage * 2) + 2}
            </div>
            <div className="page-num-mobile text-foreground">
               {currentPage + 1}
            </div>
          </>
        )}

        <div
          ref={contentRef}
          dir={isRtl ? "rtl" : "ltr"}
          className="book-columns"
          style={{
            height: "100%",
            columnFill: "auto",
            boxSizing: "border-box",
            transform: `translateX(${isRtl ? currentPage * 100 : -currentPage * 100}vw)`,
            transition: "transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
            opacity: isReady ? 1 : 0,
          }}
        >
          {/* Cover Page */}
          <div
            className="bg-card border border-border"
            style={{
              breakAfter: "column",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              boxSizing: "border-box",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.15em", fontWeight: 700, textTransform: "uppercase", marginBottom: "2rem", opacity: 0.6 }} className="text-accent">
              بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
            </div>
            <div className={cn(amiriquran.className, "text-accent")} style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.6, marginBottom: "0.5rem" }}>
              {surahMeta?.name ?? ""}
            </div>
            <div style={{ fontSize: "clamp(1rem, 2vw, 1.4rem)", fontWeight: 700, marginBottom: "0.5rem", fontFamily }}>
              {surahMeta?.englishName ?? ""}
            </div>
            <div className="text-muted-foreground" style={{ fontSize: "0.85rem", marginBottom: "3rem", fontFamily }}>
              {surahMeta?.englishNameTranslation} • {surahMeta?.revelationType} • {surahMeta?.numberOfAyahs} Ayahs
            </div>
            <div style={{ width: 50, height: 1, opacity: 0.3, margin: "0 auto 2rem" }} className="bg-accent" />
            <div style={{ fontSize: "0.9rem", fontFamily, lineHeight: 1.6 }}>
              {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
            </div>
            {activeAuthor.authorName && (
              <div className="text-muted-foreground" style={{ fontSize: "0.75rem", marginTop: "0.4rem", fontFamily }}>
                {activeAuthor.authorName}
              </div>
            )}
          </div>

          {/* Tafsir Content */}
          {orderedEntries.map((entry, idx) => {
            const ayahLabel = `${activeSurah}:${entry.ayah?.numberInSurah ?? idx + 1}`;
            const arabic = entry.ayah?.text;
            const hasArabic = arabic && arabic !== "Arabic Text";
            const stripped = stripHtml(entry.text);
            const isCrossRef = !stripped || stripped === "{}" || stripped === "[]" || /^\d+:\d+$/.test(stripped.trim());

            return (
              <div key={idx} style={{ breakInside: "avoid", marginBottom: "2rem" }}>
                <div className="text-accent" style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem" }}>
                  Ayah {ayahLabel}
                </div>

                {hasArabic && (
                  <p
                    className="font-mushaf-indopak-16 text-arabic"
                    dir="rtl"
                    style={{
                      fontSize: "1.2rem",
                      lineHeight: 2.2,
                      textAlign: "right",
                      marginBottom: "1rem",
                      fontWeight: 400,
                    }}
                  >
                    {arabic}
                  </p>
                )}

                {isCrossRef ? (
                  <div className="text-muted-foreground" style={{ fontSize: "0.8rem", fontStyle: "italic", fontFamily, textAlign: "center", padding: "1rem 0" }}>
                     {/^\d+:\d+$/.test(stripped.trim())
                      ? `Tafsir for this verse is covered under Ayah ${stripped.trim().split(':')[1]}.`
                      : stripped || "No specific commentary for this verse."}
                  </div>
                ) : (
                  <div
                    className="text-reading"
                    style={{
                      fontFamily,
                      fontSize: isUrdu ? "1rem" : "0.9rem",
                      lineHeight: isUrdu ? 2.2 : 1.8,
                    }}
                    dangerouslySetInnerHTML={{ __html: entry.text }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <div
        className="bg-card border-t border-border"
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
        }}
      >
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
            currentPage === 0
              ? "border-transparent text-muted-foreground opacity-50 cursor-default"
              : "border-accent/25 text-accent hover:bg-accent/10 cursor-pointer"
          )}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="text-muted-foreground tabular-nums text-xs min-w-[5rem] text-center">
          {currentPage + 1} of {totalPages}
        </span>

        <button
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
            currentPage >= totalPages - 1
              ? "border-transparent text-muted-foreground opacity-50 cursor-default"
              : "border-accent/25 text-accent hover:bg-accent/10 cursor-pointer"
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

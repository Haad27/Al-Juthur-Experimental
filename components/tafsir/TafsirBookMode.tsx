"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Columns2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { amiriquran, inter } from "@/app/fonts";
import { SURAHS_DATA } from "@/lib/surahsData";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { getEnglishFont, getUrduFont } from "@/lib/fontsConfig";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import type { FlipBookHandle } from "./HTMLFlipBookWrapper";

// ─── Dynamic import (no SSR) ───────────────────────────────────────────────
const HTMLFlipBook = dynamic(
  () =>
    import("./HTMLFlipBookWrapper").then((m) => ({
      default: m.HTMLFlipBook as any,
    })),
  { ssr: false }
);

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Content-size estimation ───────────────────────────────────────────────
const PAGE_CAPACITY_CHARS = 1200;
const MERGE_THRESHOLD_CHARS = 500;

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

function isCrossRefOnly(text: string): boolean {
  const t = stripHtml(text).trim();
  if (!t || t === "{}" || t === "[]") return true;
  if (/^\d+:\d+$/.test(t)) return true;
  if (t.length < 80) return true;
  return false;
}

// ─── Page data model ───────────────────────────────────────────────────────

type BookPageData = {
  entries: TafsirEntry[];
  chunkText: string;
  entryStartAyah: number;
  entryEndAyah: number;
  isContinuation: boolean;
  hasMore: boolean;
};

function buildBookPages(
  entries: Record<number, TafsirEntry>,
  totalAyahs: number
): BookPageData[] {
  const pages: BookPageData[] = [];

  const ordered: TafsirEntry[] = [];
  for (let i = 0; i < totalAyahs; i++) {
    if (entries[i]) ordered.push(entries[i]);
  }

  let i = 0;
  while (i < ordered.length) {
    const first = ordered[i];
    const firstText = stripHtml(first.text);
    const firstAyah = first.ayah?.numberInSurah ?? i + 1;

    // Short entries → merge
    if (
      firstText.length < MERGE_THRESHOLD_CHARS ||
      isCrossRefOnly(first.text)
    ) {
      const group: TafsirEntry[] = [first];
      let combinedChars = firstText.length;

      let j = i + 1;
      while (j < ordered.length && combinedChars < PAGE_CAPACITY_CHARS) {
        const candidate = ordered[j];
        const candidateText = stripHtml(candidate.text);
        if (
          !isCrossRefOnly(candidate.text) &&
          candidateText.length >= MERGE_THRESHOLD_CHARS
        )
          break;
        if (combinedChars + candidateText.length > PAGE_CAPACITY_CHARS * 1.1)
          break;
        group.push(candidate);
        combinedChars += candidateText.length;
        j++;
      }

      const endAyah =
        group[group.length - 1].ayah?.numberInSurah ?? i + group.length;
      const mergedText = group.map((e) => stripHtml(e.text)).join("\n\n");

      pages.push({
        entries: group,
        chunkText: mergedText,
        entryStartAyah: firstAyah,
        entryEndAyah: endAyah,
        isContinuation: false,
        hasMore: false,
      });

      i = j;
      continue;
    }

    // Long entries → split into chunks
    const chunks = chunkText(firstText, PAGE_CAPACITY_CHARS);
    for (let c = 0; c < chunks.length; c++) {
      pages.push({
        entries: [first],
        chunkText: chunks[c],
        entryStartAyah: firstAyah,
        entryEndAyah: firstAyah,
        isContinuation: c > 0,
        hasMore: c < chunks.length - 1,
      });
    }

    i++;
  }

  return pages;
}

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let breakAt = remaining.lastIndexOf(".", maxChars);
    if (breakAt < maxChars * 0.4)
      breakAt = remaining.lastIndexOf(" ", maxChars);
    if (breakAt <= 0) breakAt = maxChars;
    chunks.push(remaining.slice(0, breakAt + 1).trim());
    remaining = remaining.slice(breakAt + 1).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// ─── Page Component ────────────────────────────────────────────────────────

const BookPage = React.forwardRef<
  HTMLDivElement,
  {
    pageData: BookPageData | "cover";
    pageNum: number;
    totalPages: number;
    activeSurah: number;
    activeLangName: string;
    activeAuthor: Author;
    fontFamily: string;
  }
>(
  (
    { pageData, pageNum, totalPages, activeSurah, activeLangName, activeAuthor, fontFamily },
    ref
  ) => {
    const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);
    const isUrdu = activeLangName.toLowerCase().includes("urdu");
    const isRtl =
      isUrdu ||
      activeLangName.toLowerCase().includes("arabic") ||
      activeLangName.toLowerCase().includes("persian");

    // ── Cover page ──
    if (pageData === "cover") {
      return (
        <div
          ref={ref}
          data-density="hard"
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(145deg, #2a1f14 0%, #1a120b 50%, #0f0a06 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1.5rem",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            borderRadius: "0 6px 6px 0",
            boxShadow: "inset -3px 0 12px rgba(0,0,0,0.3)",
          }}
        >
          {/* Decorative elements */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.03, background: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(180,140,80,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ fontSize: "0.55rem", letterSpacing: "0.25em", fontWeight: 700, color: "#b48c50", textTransform: "uppercase", marginBottom: "1.5rem", opacity: 0.6 }}>
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </div>

          <div className={amiriquran.className} style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "#b48c50", textAlign: "center", lineHeight: 1.6, marginBottom: "0.5rem" }}>
            {surahMeta?.name ?? ""}
          </div>

          <div style={{ fontSize: "clamp(0.9rem, 2vw, 1.2rem)", fontWeight: 700, color: "#e8dcc8", textAlign: "center", marginBottom: "0.3rem", fontFamily }}>
            {surahMeta?.englishName ?? ""}
          </div>

          <div style={{ fontSize: "0.72rem", color: "#a09080", textAlign: "center", marginBottom: "2rem", fontFamily }}>
            {surahMeta?.englishNameTranslation} • {surahMeta?.revelationType} •{" "}
            {surahMeta?.numberOfAyahs} Ayahs
          </div>

          <div style={{ width: 50, height: 1, background: "#b48c50", opacity: 0.3, margin: "0 auto 1.5rem" }} />

          <div style={{ fontSize: "0.7rem", color: "#a09080", textAlign: "center", fontFamily, lineHeight: 1.6 }}>
            {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
          </div>
          {activeAuthor.authorName && (
            <div style={{ fontSize: "0.6rem", color: "#706050", textAlign: "center", marginTop: "0.2rem", fontFamily }}>
              {activeAuthor.authorName}
            </div>
          )}

          <div style={{ position: "absolute", bottom: "1rem", fontSize: "0.55rem", color: "#605040", opacity: 0.5 }}>
            {pageNum}
          </div>
        </div>
      );
    }

    // ── Content page ──
    const p = pageData;
    const ayahLabel =
      p.entryStartAyah === p.entryEndAyah
        ? `${activeSurah}:${p.entryStartAyah}`
        : `${activeSurah}:${p.entryStartAyah}–${p.entryEndAyah}`;
    const hasArabicText = !p.isContinuation && p.entries.some(
      (e) => e.ayah?.text && e.ayah.text !== "Arabic Text"
    );

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #1e1610 0%, #181210 100%)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
          borderLeft: "1px solid rgba(180,140,80,0.08)",
          borderRight: "1px solid rgba(180,140,80,0.08)",
        }}
      >
        {/* Subtle page texture */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.015, background: "repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.04) 18px, rgba(255,255,255,0.04) 19px)", pointerEvents: "none" }} />

        {/* Page header */}
        <div
          style={{
            padding: "0.5rem 0.9rem",
            borderBottom: "1px solid rgba(180,140,80,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#b48c50", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>
            {p.isContinuation
              ? activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()
              : surahMeta?.englishName ?? `Surah ${activeSurah}`}
          </span>
          <span style={{ fontSize: "0.52rem", color: "#908070", fontFamily, letterSpacing: "0.05em" }}>
            {ayahLabel}
          </span>
        </div>

        {/* Page body */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "0.6rem 0.9rem 0.3rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Continuation label */}
          {p.isContinuation && (
            <div style={{ fontSize: "0.5rem", color: "#908070", fontStyle: "italic", marginBottom: "0.15rem", opacity: 0.6, fontFamily }}>
              ▸ continued from previous page
            </div>
          )}

          {/* Arabic text block (only on first page of each ayah group) */}
          {hasArabicText && (
            <div style={{ borderBottom: "1px solid rgba(180,140,80,0.1)", paddingBottom: "0.5rem", marginBottom: "0.15rem" }}>
              {p.entries.map((entry, ei) => {
                const arabic = entry.ayah?.text;
                if (!arabic || arabic === "Arabic Text") return null;
                return (
                  <div key={ei} style={{ marginBottom: p.entries.length > 1 && ei < p.entries.length - 1 ? "0.4rem" : 0 }}>
                    {p.entries.length > 1 && (
                      <div style={{ fontSize: "0.48rem", color: "#908070", marginBottom: "0.15rem", opacity: 0.5 }}>
                        Ayah {entry.ayah?.numberInSurah}
                      </div>
                    )}
                    <p
                      className="font-mushaf-indopak-16"
                      dir="rtl"
                      style={{
                        fontSize: p.entries.length > 2 ? "0.85rem" : "1.05rem",
                        lineHeight: 2,
                        color: "#e8dcc8",
                        textAlign: "right",
                        margin: 0,
                        fontWeight: 400,
                      }}
                    >
                      {arabic}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tafsir text */}
          {p.chunkText && (
            <div
              dir={isRtl ? "rtl" : "ltr"}
              style={{
                fontFamily,
                fontSize: isUrdu ? "0.85rem" : "0.72rem",
                lineHeight: isUrdu ? 2.2 : 1.78,
                color: "#c8b8a0",
                overflow: "hidden",
                flex: 1,
              }}
            >
              {p.chunkText}
            </div>
          )}

          {/* Cross-ref / empty */}
          {!p.chunkText && !p.isContinuation && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {p.entries.map((entry, ei) => {
                const t = stripHtml(entry.text).trim();
                const crossRef = t.match(/^(\d+):(\d+)$/);
                return (
                  <div key={ei} style={{ fontSize: "0.65rem", color: "#908070", fontStyle: "italic", textAlign: "center", padding: "0.6rem", fontFamily }}>
                    {crossRef
                      ? `Tafsir for this verse is covered under Ayah ${crossRef[2]}.`
                      : t || "No specific commentary for this verse."}
                  </div>
                );
              })}
            </div>
          )}

          {/* "Continues" indicator */}
          {p.hasMore && (
            <div style={{ textAlign: isRtl ? "left" : "right", fontSize: "0.48rem", color: "#908070", opacity: 0.5, fontStyle: "italic", marginTop: "auto", fontFamily }}>
              continues ▸
            </div>
          )}
        </div>

        {/* Page number */}
        <div
          style={{
            padding: "0.3rem 0.9rem",
            borderTop: "1px solid rgba(180,140,80,0.08)",
            display: "flex",
            justifyContent: pageNum % 2 === 0 ? "flex-start" : "flex-end",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: "0.5rem", color: "#706050", opacity: 0.5 }}>
            {pageNum}
          </span>
        </div>
      </div>
    );
  }
);
BookPage.displayName = "BookPage";

// ─── Main Component ────────────────────────────────────────────────────────

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
  const bookRef = useRef<FlipBookHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { englishFont, urduFont } = useGlobalState();
  const isUrdu = activeLangName.toLowerCase().includes("urdu");
  const fontFamily = isUrdu
    ? getUrduFont(urduFont).fontFamily
    : getEnglishFont(englishFont).fontFamily;

  const [currentPage, setCurrentPage] = useState(0);
  const [bookSize, setBookSize] = useState({ width: 400, height: 560 });
  const [isReady, setIsReady] = useState(false);

  // ── Lock body scroll ─────────────────────────────────────────────────────
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

  // ── Compute book dimensions ──────────────────────────────────────────────
  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Reserve ~48px for the top bar and ~52px for the bottom controls
      const availH = vh - 100;
      const availW = vw - 40;

      // Each page should be roughly A5/B5 ratio (1 : 1.4)
      const maxPageH = Math.min(availH, 720);
      const maxPageW = Math.min(availW / 2, maxPageH / 1.4, 480);
      const pageH = Math.min(Math.round(maxPageW * 1.4), maxPageH);
      const pageW = Math.round(pageH / 1.4);

      setBookSize({
        width: Math.max(240, pageW),
        height: Math.max(340, pageH),
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Build pages ──────────────────────────────────────────────────────────
  const contentPages = useMemo(
    () => buildBookPages(loadedTafsir, totalAyahs),
    [loadedTafsir, totalAyahs]
  );

  // Total: cover + content pages (+ 1 blank back if odd)
  const allPages = useMemo(() => {
    const p: (BookPageData | "cover")[] = ["cover", ...contentPages];
    // page-flip needs even total pages for landscape spread
    if (p.length % 2 !== 0) {
      p.push({
        entries: [],
        chunkText: "",
        entryStartAyah: 0,
        entryEndAyah: 0,
        isContinuation: false,
        hasMore: false,
      });
    }
    return p;
  }, [contentPages]);

  const totalPagesCount = allPages.length;

  // ── Ready once layout settled ─────────────────────────────────────────────
  useEffect(() => {
    if (allPages.length > 1 && bookSize.width > 0) {
      const t = setTimeout(() => setIsReady(true), 200);
      return () => clearTimeout(t);
    }
    setIsReady(false);
  }, [allPages.length, bookSize.width]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    bookRef.current?.pageFlip()?.flipNext();
  }, []);

  const goPrev = useCallback(() => {
    bookRef.current?.pageFlip()?.flipPrev();
  }, []);

  const handleFlip = useCallback(
    (e: any) => {
      const pg = e?.data ?? 0;
      setCurrentPage(typeof pg === "number" ? pg : 0);
      if (onAyahChange && allPages[pg] && allPages[pg] !== "cover") {
        const p = allPages[pg] as BookPageData;
        if (p.entryStartAyah > 0) onAyahChange(p.entryStartAyah);
      }
    },
    [allPages, onAyahChange]
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onExitBookMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onExitBookMode]);

  const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={inter.className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "linear-gradient(180deg, #1a120a 0%, #0d0805 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.75rem",
          borderBottom: "1px solid rgba(180,140,80,0.1)",
          background: "rgba(20,14,8,0.85)",
          backdropFilter: "blur(12px)",
          gap: "0.5rem",
        }}
      >
        {/* Left: Back + tafsir name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
          <button
            onClick={onBackToLibrary}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(180,140,80,0.15)",
              background: "rgba(180,140,80,0.06)",
              color: "#b48c50",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Back to Library"
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>

          {/* Surah selector */}
          <select
            value={activeSurah}
            onChange={(e) => onSurahChange(Number(e.target.value))}
            style={{
              appearance: "none",
              background: "rgba(180,140,80,0.06)",
              border: "1px solid rgba(180,140,80,0.15)",
              borderRadius: 8,
              padding: "0.3rem 1.4rem 0.3rem 0.5rem",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#e8dcc8",
              cursor: "pointer",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23b48c50' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center",
            }}
          >
            {SURAHS_DATA.map((s) => (
              <option key={s.number} value={s.number} style={{ background: "#1a120a", color: "#e8dcc8" }}>
                {s.number}. {s.englishName}
              </option>
            ))}
          </select>

          {/* Tafsir info */}
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#e8dcc8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
            </div>
          </div>
        </div>

        {/* Right: Mode toggle + Theme */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <button
            onClick={onExitBookMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0.3rem 0.6rem",
              borderRadius: 8,
              border: "1px solid rgba(180,140,80,0.25)",
              background: "rgba(180,140,80,0.1)",
              color: "#b48c50",
              fontSize: "0.62rem",
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
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Ambient glow behind book */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "70%",
            height: "60%",
            background: "radial-gradient(ellipse, rgba(180,140,80,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {!isReady ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <BookOpen style={{ width: 32, height: 32, color: "#b48c50", opacity: 0.3, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "0.72rem", color: "#706050" }}>
              Preparing book…
            </span>
          </div>
        ) : (
          /* @ts-ignore */
          <HTMLFlipBook
            ref={bookRef}
            width={bookSize.width}
            height={bookSize.height}
            size="fixed"
            minWidth={200}
            maxWidth={520}
            minHeight={300}
            maxHeight={750}
            showCover={true}
            usePortrait={window.innerWidth < 700}
            flippingTime={700}
            drawShadow={true}
            maxShadowOpacity={0.4}
            mobileScrollSupport={false}
            useMouseEvents={true}
            clickEventForward={true}
            swipeDistance={30}
            startPage={0}
            onFlip={handleFlip}
            className=""
            style={{}}
          >
            {allPages.map((page, i) => (
              <BookPage
                key={i}
                pageData={page}
                pageNum={i + 1}
                totalPages={totalPagesCount}
                activeSurah={activeSurah}
                activeLangName={activeLangName}
                activeAuthor={activeAuthor}
                fontFamily={fontFamily}
              />
            ))}
          </HTMLFlipBook>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          borderTop: "1px solid rgba(180,140,80,0.08)",
          background: "rgba(20,14,8,0.7)",
        }}
      >
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0.35rem 0.75rem",
            borderRadius: 8,
            border: "1px solid rgba(180,140,80,0.12)",
            background: "transparent",
            color: currentPage === 0 ? "#504030" : "#b48c50",
            fontSize: "0.68rem",
            fontWeight: 600,
            cursor: currentPage === 0 ? "default" : "pointer",
            transition: "color 0.2s",
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span
          style={{
            fontSize: "0.62rem",
            color: "#908070",
            minWidth: "5.5rem",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {currentPage + 1} of {totalPagesCount}
        </span>

        <button
          onClick={goNext}
          disabled={currentPage >= totalPagesCount - 2}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0.35rem 0.75rem",
            borderRadius: 8,
            border: "1px solid rgba(180,140,80,0.12)",
            background: "transparent",
            color: currentPage >= totalPagesCount - 2 ? "#504030" : "#b48c50",
            fontSize: "0.68rem",
            fontWeight: 600,
            cursor: currentPage >= totalPagesCount - 2 ? "default" : "pointer",
            transition: "color 0.2s",
          }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

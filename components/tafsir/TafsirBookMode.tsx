"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, BookOpen, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { amiriquran } from "@/app/fonts";
import { SURAHS_DATA } from "@/lib/surahsData";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { getEnglishFont, getUrduFont } from "@/lib/fontsConfig";
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

// ─── Page data model ───────────────────────────────────────────────────────

/**
 * A "BookPage" groups one or more ayah entries that fit together on a
 * single physical page.  When content for one ayah is too long for one page,
 * it is split into multiple BookPages (each with `continuationIndex`).
 *
 * Layout:
 *   Even-indexed pages (0, 2, 4 …) → LEFT page  (Arabic + header)
 *   Odd-indexed  pages (1, 3, 5 …) → RIGHT page (tafsir text)
 *
 * We emit pages in pairs: [left, right].
 * The cover is always page 0 (left) and has type "cover".
 */
type BookPageType =
  | { type: "cover" }
  | {
      type: "content";
      entries: TafsirEntry[];          // one or more grouped entries
      chunkText: string;               // tafsir text slice for THIS physical page
      entryStartAyah: number;          // first ayah number in this group
      entryEndAyah: number;            // last ayah number in this group
      isContinuation: boolean;         // is this a continuation of a long entry?
      hasMore: boolean;                // does this entry continue on the next right page?
      side: "left" | "right";         // left = arabic side, right = tafsir side
    };

// ─── Content-size estimation ───────────────────────────────────────────────
//
// We never measure real DOM nodes (SSR) so we work with character counts:
//
//  PAGE_CAPACITY_CHARS:  How many tafsir-text characters fit comfortably in
//                        one right page at a typical font size/line-height.
//                        Adjust if text looks too sparse or overflows.
//
//  MERGE_THRESHOLD_CHARS: If an entry's tafsir text is shorter than this,
//                         we consider packing another short entry alongside.
//
//  MIN_FILL_RATIO:       A page must be at least this full before we stop
//                        merging more entries into it.
//
const PAGE_CAPACITY_CHARS = 1_400;   // ~1400 chars fills a right page nicely
const MERGE_THRESHOLD_CHARS = 600;   // entries shorter than this may be merged

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

/**
 * Detect a "cross-reference only" entry like "2:5" or "{}".
 * These carry almost no tafsir body and should always be merged.
 */
function isCrossRefOnly(text: string): boolean {
  const t = stripHtml(text).trim();
  if (!t || t === "{}" || t === "[]") return true;
  if (/^\d+:\d+$/.test(t)) return true;
  if (t.length < 80) return true;   // very short entries (e.g. "See previous verse")
  return false;
}

// ─── Smart packing algorithm ────────────────────────────────────────────────

/**
 * buildBookPages()
 *
 * Converts a flat array of tafsir entries into an ordered list of BookPages
 * ready for the flip book.
 *
 * Rules:
 * 1. Short / cross-ref entries are merged onto the same physical right page
 *    until the page is "full" (>= PAGE_CAPACITY_CHARS).
 * 2. Each merged group gets ONE paired left page (Arabic block shows all
 *    merged ayahs).
 * 3. Long single entries are sliced into continuation pages (right pages only).
 * 4. The cover is always prepended as page 0.
 */
function buildBookPages(
  entries: Record<number, TafsirEntry>,
  totalAyahs: number
): BookPageType[] {
  const pages: BookPageType[] = [{ type: "cover" }];

  // Build a plain ordered list of entries
  const ordered: TafsirEntry[] = [];
  for (let i = 0; i < totalAyahs; i++) {
    if (entries[i]) ordered.push(entries[i]);
  }

  let i = 0;
  while (i < ordered.length) {
    const first = ordered[i];
    const firstText = stripHtml(first.text);
    const firstAyah = first.ayah?.numberInSurah ?? i + 1;

    // ── Case A: Entry is short → try to merge with subsequent short entries ──
    if (firstText.length < MERGE_THRESHOLD_CHARS || isCrossRefOnly(first.text)) {
      const group: TafsirEntry[] = [first];
      let combinedChars = firstText.length;

      let j = i + 1;
      while (
        j < ordered.length &&
        combinedChars < PAGE_CAPACITY_CHARS
      ) {
        const candidate = ordered[j];
        const candidateText = stripHtml(candidate.text);

        // Stop merging if this candidate is itself a long entry
        if (
          !isCrossRefOnly(candidate.text) &&
          candidateText.length >= MERGE_THRESHOLD_CHARS
        )
          break;

        // Stop merging if adding this candidate would push us past capacity
        if (combinedChars + candidateText.length > PAGE_CAPACITY_CHARS * 1.1)
          break;

        group.push(candidate);
        combinedChars += candidateText.length;
        j++;
      }

      const endAyah =
        group[group.length - 1].ayah?.numberInSurah ?? i + group.length;
      const mergedText = group.map((e) => stripHtml(e.text)).join("\n\n");

      // Left page (Arabic block for all grouped ayahs)
      pages.push({
        type: "content",
        entries: group,
        chunkText: mergedText,
        entryStartAyah: firstAyah,
        entryEndAyah: endAyah,
        isContinuation: false,
        hasMore: false,
        side: "left",
      });
      // Right page (tafsir for all grouped ayahs)
      pages.push({
        type: "content",
        entries: group,
        chunkText: mergedText,
        entryStartAyah: firstAyah,
        entryEndAyah: endAyah,
        isContinuation: false,
        hasMore: false,
        side: "right",
      });

      i = j;
      continue;
    }

    // ── Case B: Entry is long → split into chunks ────────────────────────────
    const chunks = chunkText(firstText, PAGE_CAPACITY_CHARS);

    // First spread: left = arabic, right = first chunk
    pages.push({
      type: "content",
      entries: [first],
      chunkText: chunks[0],
      entryStartAyah: firstAyah,
      entryEndAyah: firstAyah,
      isContinuation: false,
      hasMore: chunks.length > 1,
      side: "left",
    });
    pages.push({
      type: "content",
      entries: [first],
      chunkText: chunks[0],
      entryStartAyah: firstAyah,
      entryEndAyah: firstAyah,
      isContinuation: false,
      hasMore: chunks.length > 1,
      side: "right",
    });

    // Continuation spreads (right pages only, left page is "continued" label)
    for (let c = 1; c < chunks.length; c++) {
      const isLast = c === chunks.length - 1;
      // Left continuation page (just the label)
      pages.push({
        type: "content",
        entries: [first],
        chunkText: "",
        entryStartAyah: firstAyah,
        entryEndAyah: firstAyah,
        isContinuation: true,
        hasMore: !isLast,
        side: "left",
      });
      // Right continuation page (next chunk)
      pages.push({
        type: "content",
        entries: [first],
        chunkText: chunks[c],
        entryStartAyah: firstAyah,
        entryEndAyah: firstAyah,
        isContinuation: true,
        hasMore: !isLast,
        side: "right",
      });
    }

    i++;
  }

  return pages;
}

/**
 * Split text into chunks of at most `maxChars` characters,
 * always breaking on sentence/paragraph boundaries when possible.
 */
function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    // Try to break at a sentence boundary
    let breakAt = remaining.lastIndexOf(".", maxChars);
    if (breakAt < maxChars * 0.5) {
      // No good sentence break → break at space
      breakAt = remaining.lastIndexOf(" ", maxChars);
    }
    if (breakAt <= 0) breakAt = maxChars;

    chunks.push(remaining.slice(0, breakAt + 1).trim());
    remaining = remaining.slice(breakAt + 1).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// ─── Individual page renderers ─────────────────────────────────────────────

interface PageProps {
  page: BookPageType;
  pageNumber: number;
  totalPages: number;
  activeSurah: number;
  activeLangName: string;
  activeAuthor: Author;
  isPortrait: boolean;
  englishFontFamily: string;
  urduFontFamily: string;
}

const BookPageLeft = React.forwardRef<HTMLDivElement, PageProps>(
  (
    {
      page,
      pageNumber,
      totalPages,
      activeSurah,
      activeLangName,
      activeAuthor,
      isPortrait,
      englishFontFamily,
      urduFontFamily,
    },
    ref
  ) => {
    const isUrdu =
      activeLangName.toLowerCase().includes("urdu") ||
      activeLangName.toLowerCase().includes("persian");

    // Cover page
    if (page.type === "cover") {
      const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);
      return (
        <div
          ref={ref}
          className="page page-cover"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2.5rem 1.5rem",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: "absolute",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background: "var(--accent)",
              opacity: 0.07,
              filter: "blur(60px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.18em",
              fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase",
              marginBottom: "1rem",
              opacity: 0.7,
            }}
          >
            Tafsir
          </div>
          <div
            className={amiriquran.className}
            style={{
              fontSize: "2.8rem",
              color: "var(--accent)",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: "0.75rem",
            }}
          >
            {surahMeta?.name ?? ""}
          </div>
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--foreground)",
              textAlign: "center",
              marginBottom: "0.35rem",
            }}
          >
            {surahMeta?.englishName ?? ""}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-foreground)",
              textAlign: "center",
              marginBottom: "1.6rem",
            }}
          >
            {surahMeta?.englishNameTranslation} • {surahMeta?.revelationType} •{" "}
            {surahMeta?.numberOfAyahs} Ayahs
          </div>
          <div
            style={{
              width: "40px",
              height: "1px",
              background: "var(--accent)",
              opacity: 0.4,
              margin: "0 auto 1.4rem",
            }}
          />
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--muted-foreground)",
              textAlign: "center",
              maxWidth: "80%",
              lineHeight: 1.6,
              fontFamily: englishFontFamily,
            }}
          >
            {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
          </div>
          {activeAuthor.authorName && (
            <div
              style={{
                fontSize: "0.65rem",
                color: "var(--muted-foreground)",
                textAlign: "center",
                opacity: 0.6,
                marginTop: "0.25rem",
                fontFamily: englishFontFamily,
              }}
            >
              {activeAuthor.authorName}
            </div>
          )}
        </div>
      );
    }

    // Content left page
    const p = page;
    const isContd = p.isContinuation;
    const entries = p.entries;
    const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);
    const label =
      p.entryStartAyah === p.entryEndAyah
        ? `${activeSurah}:${p.entryStartAyah}`
        : `${activeSurah}:${p.entryStartAyah}–${p.entryEndAyah}`;

    return (
      <div
        ref={ref}
        className="page"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Page header strip */}
        <div
          style={{
            padding: "0.55rem 1.1rem 0.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            {surahMeta?.englishName ?? `Surah ${activeSurah}`}
          </span>
          <span
            style={{
              fontSize: "0.58rem",
              color: "var(--muted-foreground)",
              fontFamily: englishFontFamily,
              opacity: 0.7,
            }}
          >
            {label}
          </span>
        </div>

        {/* Ayah label */}
        <div
          style={{
            padding: "0.5rem 1.1rem 0",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "var(--accent)",
              background: "rgba(var(--accent-rgb, 120,90,60), 0.1)",
              borderRadius: "4px",
              padding: "0.15rem 0.5rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {isContd ? "◂ continued" : `Ayah${entries.length > 1 ? "s" : ""} ${p.entryStartAyah === p.entryEndAyah ? p.entryStartAyah : `${p.entryStartAyah}–${p.entryEndAyah}`}`}
          </span>
        </div>

        {/* Arabic text block */}
        <div
          style={{
            flex: 1,
            overflowY: "hidden",
            padding: "0.6rem 1.1rem 0.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
          }}
        >
          {!isContd &&
            entries.map((entry, ei) => {
              const arabic = entry.ayah?.text;
              const ayahNum = entry.ayah?.numberInSurah ?? ei + 1;
              if (!arabic || arabic === "Arabic Text") {
                return (
                  <div
                    key={ei}
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                      textAlign: "center",
                      padding: "0.4rem 0",
                    }}
                  >
                    Ayah {ayahNum}
                  </div>
                );
              }
              return (
                <div key={ei} style={{ borderBottom: entries.length > 1 && ei < entries.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: entries.length > 1 && ei < entries.length - 1 ? "0.6rem" : 0 }}>
                  {entries.length > 1 && (
                    <div style={{ fontSize: "0.55rem", color: "var(--muted-foreground)", marginBottom: "0.2rem", opacity: 0.6 }}>
                      Ayah {ayahNum}
                    </div>
                  )}
                  <p
                    className="font-mushaf-indopak-16"
                    dir="rtl"
                    style={{
                      fontSize: entries.length > 2 ? "1.05rem" : "1.35rem",
                      lineHeight: 2.1,
                      color: "var(--foreground)",
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

          {/* For continuation left pages, show a subtle indicator */}
          {isContd && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.25,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <BookOpen
                  style={{ width: 28, height: 28, color: "var(--accent)", margin: "0 auto 0.5rem" }}
                />
                <div style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Continued
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page number */}
        <div
          style={{
            padding: "0.3rem 1.1rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-start",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.55rem",
              color: "var(--muted-foreground)",
              opacity: 0.5,
            }}
          >
            {pageNumber}
          </span>
        </div>
      </div>
    );
  }
);
BookPageLeft.displayName = "BookPageLeft";

const BookPageRight = React.forwardRef<HTMLDivElement, PageProps>(
  (
    {
      page,
      pageNumber,
      totalPages,
      activeSurah,
      activeLangName,
      activeAuthor,
      isPortrait,
      englishFontFamily,
      urduFontFamily,
    },
    ref
  ) => {
    const isUrdu =
      activeLangName.toLowerCase().includes("urdu") ||
      activeLangName.toLowerCase().includes("persian");
    const isRtl = isUrdu || activeLangName.toLowerCase().includes("arabic");
    const fontFamily = isUrdu ? urduFontFamily : englishFontFamily;

    if (page.type === "cover") {
      // Blank back cover
      return (
        <div
          ref={ref}
          className="page page-cover"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
        />
      );
    }

    const p = page;
    const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);
    const label =
      p.entryStartAyah === p.entryEndAyah
        ? `Ayah ${p.entryStartAyah}`
        : `Ayahs ${p.entryStartAyah}–${p.entryEndAyah}`;

    return (
      <div
        ref={ref}
        className="page"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Page header strip */}
        <div
          style={{
            padding: "0.55rem 1.1rem 0.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
          </span>
          <span
            style={{
              fontSize: "0.58rem",
              color: "var(--muted-foreground)",
              fontFamily: englishFontFamily,
              opacity: 0.7,
            }}
          >
            {label}
          </span>
        </div>

        {/* Tafsir text content */}
        <div
          style={{
            flex: 1,
            overflowY: "hidden",
            padding: "0.75rem 1.15rem 0.4rem",
            position: "relative",
          }}
        >
          {/* Continuation indicator */}
          {p.isContinuation && (
            <div
              style={{
                fontSize: "0.55rem",
                color: "var(--muted-foreground)",
                marginBottom: "0.5rem",
                fontStyle: "italic",
                opacity: 0.55,
                fontFamily: englishFontFamily,
              }}
            >
              ▸ continued from previous page
            </div>
          )}

          {/* Main text */}
          {p.chunkText ? (
            <div
              dir={isRtl ? "rtl" : "ltr"}
              style={{
                fontFamily,
                fontSize: isUrdu ? "1rem" : "0.78rem",
                lineHeight: isUrdu ? 2.3 : 1.85,
                color: "var(--foreground)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {p.chunkText}
            </div>
          ) : (
            // Cross-ref / empty entries
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                height: "100%",
              }}
            >
              {p.entries.map((entry, ei) => {
                const t = stripHtml(entry.text).trim();
                const crossRef = t.match(/^(\d+):(\d+)$/);
                return (
                  <div
                    key={ei}
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted-foreground)",
                      fontStyle: "italic",
                      padding: "0.5rem 0.7rem",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontFamily: englishFontFamily,
                    }}
                  >
                    {crossRef
                      ? `Tafsir for this verse is covered under Ayah ${crossRef[2]}.`
                      : t || "No specific commentary for this verse."}
                  </div>
                );
              })}
            </div>
          )}

          {/* "Continues →" indicator */}
          {p.hasMore && (
            <div
              style={{
                position: "absolute",
                bottom: "0.4rem",
                right: isRtl ? "auto" : "1.1rem",
                left: isRtl ? "1.1rem" : "auto",
                fontSize: "0.55rem",
                color: "var(--muted-foreground)",
                opacity: 0.5,
                fontFamily: englishFontFamily,
                fontStyle: "italic",
              }}
            >
              continues ▸
            </div>
          )}
        </div>

        {/* Page number */}
        <div
          style={{
            padding: "0.3rem 1.1rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.55rem",
              color: "var(--muted-foreground)",
              opacity: 0.5,
            }}
          >
            {pageNumber}
          </span>
        </div>
      </div>
    );
  }
);
BookPageRight.displayName = "BookPageRight";

// ─── Main TafsirBookMode component ────────────────────────────────────────────

interface TafsirBookModeProps {
  loadedTafsir: Record<number, TafsirEntry>;
  activeSurah: number;
  activeLangName: string;
  activeAuthor: Author;
  totalAyahs: number;
  /** Optionally jump to this ayah on mount */
  initialAyah?: number;
  onAyahChange?: (ayah: number) => void;
}

export default function TafsirBookMode({
  loadedTafsir,
  activeSurah,
  activeLangName,
  activeAuthor,
  totalAyahs,
  initialAyah = 1,
  onAyahChange,
}: TafsirBookModeProps) {
  const bookRef = useRef<FlipBookHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { englishFont, urduFont } = useGlobalState();
  const englishFontFamily = getEnglishFont(englishFont).fontFamily;
  const urduFontFamily = getUrduFont(urduFont).fontFamily;

  const [currentPage, setCurrentPage] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [bookSize, setBookSize] = useState({ width: 400, height: 580 });
  const [isReady, setIsReady] = useState(false);

  // ── Compute book dimensions from container ─────────────────────────────────
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const { width: cw, height: ch } = container.getBoundingClientRect();
      const portrait = cw < 700;
      setIsPortrait(portrait);

      // In landscape: two pages side-by-side; in portrait: one page
      const maxH = Math.min(ch - 80, 640);
      const pageW = portrait
        ? Math.min(cw - 24, 440)
        : Math.min((cw - 48) / 2, 460);
      const pageH = Math.round(pageW * 1.42);  // roughly A4 ratio

      setBookSize({
        width: Math.round(Math.max(260, Math.min(pageW, portrait ? 440 : 460))),
        height: Math.round(Math.max(380, Math.min(pageH, maxH))),
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Build pages ────────────────────────────────────────────────────────────
  const bookPages = useMemo(
    () => buildBookPages(loadedTafsir, totalAyahs),
    [loadedTafsir, totalAyahs]
  );

  const totalPages = bookPages.length;

  // Mark ready once we have pages + a valid book size
  useEffect(() => {
    if (bookPages.length > 1 && bookSize.width > 0) {
      // Give layout a tick to settle
      const t = setTimeout(() => setIsReady(true), 150);
      return () => clearTimeout(t);
    }
    setIsReady(false);
  }, [bookPages.length, bookSize.width]);

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

      // Report which ayah we've reached to the parent
      if (onAyahChange && bookPages[pg]) {
        const p = bookPages[pg];
        if (p.type === "content") {
          onAyahChange(p.entryStartAyah);
        }
      }
    },
    [bookPages, onAyahChange]
  );

  // ── Page number display ────────────────────────────────────────────────────
  const displayPage = Math.max(1, currentPage);
  const displayTotal = Math.max(1, totalPages);

  const spreadLabel = (() => {
    // In landscape mode we see two pages at once
    if (!isPortrait && currentPage + 1 < totalPages) {
      return `${displayPage}–${displayPage + 1} of ${displayTotal}`;
    }
    return `${displayPage} of ${displayTotal}`;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  // Shared props for each page component
  const pageProps = (i: number): PageProps => ({
    page: bookPages[i],
    pageNumber: i + 1,
    totalPages,
    activeSurah,
    activeLangName,
    activeAuthor,
    isPortrait,
    englishFontFamily,
    urduFontFamily,
  });

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1rem 0.5rem",
        boxSizing: "border-box",
        minHeight: 0,
      }}
    >
      {/* Book viewport */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {!isReady ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
              color: "var(--muted-foreground)",
            }}
          >
            <BookOpen style={{ width: 28, height: 28, opacity: 0.4, animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
              Preparing book…
            </span>
          </div>
        ) : (
          /* @ts-ignore – dynamic import loses forwardRef typings */
          <HTMLFlipBook
            ref={bookRef}
            width={bookSize.width}
            height={bookSize.height}
            size="fixed"
            minWidth={200}
            maxWidth={500}
            minHeight={300}
            maxHeight={700}
            showCover={true}
            usePortrait={isPortrait}
            flippingTime={700}
            drawShadow={true}
            mobileScrollSupport={true}
            useMouseEvents={true}
            startPage={0}
            onFlip={handleFlip}
            className=""
            style={{}}
          >
            {bookPages.map((page, i) =>
              i % 2 === 0 ? (
                <BookPageLeft key={i} {...pageProps(i)} />
              ) : (
                <BookPageRight key={i} {...pageProps(i)} />
              )
            )}
          </HTMLFlipBook>
        )}
      </div>

      {/* Controls bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: currentPage === 0 ? "var(--muted-foreground)" : "var(--foreground)",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: currentPage === 0 ? "default" : "pointer",
            opacity: currentPage === 0 ? 0.4 : 1,
            transition: "all 0.15s",
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span
          style={{
            fontSize: "0.68rem",
            color: "var(--muted-foreground)",
            minWidth: "6rem",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {spreadLabel}
        </span>

        <button
          onClick={goNext}
          disabled={currentPage >= totalPages - 1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: currentPage >= totalPages - 1 ? "var(--muted-foreground)" : "var(--foreground)",
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: currentPage >= totalPages - 1 ? "default" : "pointer",
            opacity: currentPage >= totalPages - 1 ? 0.4 : 1,
            transition: "all 0.15s",
          }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

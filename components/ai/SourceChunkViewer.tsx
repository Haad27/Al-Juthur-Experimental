"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  BookOpen,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Type
} from "lucide-react";
import { amiri, inter } from "@/app/fonts";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

export interface SourceItem {
  id: string;
  book: string;
  authorName: string;
  surah?: number | null;
  ayah?: number | null;
  rootWord?: string | null;
  snippet: string;
  chunkText?: string;
  workType: "tafsir" | "lexicon" | "textbook";
}

interface SourceChunkViewerProps {
  source: SourceItem;
  onClose: () => void;
  isMobile?: boolean;
}

export default function SourceChunkViewer({
  source,
  onClose,
  isMobile = false
}: SourceChunkViewerProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  const fullText = source.chunkText || source.snippet || "";
  const isArabic = /[\u0600-\u06FF]/.test(fullText);

  const handleCopy = async () => {
    try {
      await copyToClipboard(fullText);
      setCopied(true);
      toast.success("Chunk copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const cycleFontSize = () => {
    if (fontSize === "normal") setFontSize("large");
    else if (fontSize === "large") setFontSize("xlarge");
    else setFontSize("normal");
  };

  // Determine continue reading URL
  const continueReadingHref =
    source.workType === "textbook"
      ? "/-Dream-Textbook.pdf"
      : source.workType === "lexicon"
      ? `/lexicon?root=${encodeURIComponent(source.rootWord || "رحم")}&author=${encodeURIComponent(source.authorName || source.book)}`
      : `/tafsir?surah=${source.surah || 1}&ayah=${source.ayah || 1}&author=${encodeURIComponent(source.authorName || source.book)}`;

  // Parse text into paragraphs and excerpts
  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const getFontSizeClass = () => {
    if (!isArabic) {
      if (fontSize === "normal") return "text-sm leading-relaxed";
      if (fontSize === "large") return "text-base leading-relaxed";
      return "text-lg leading-loose";
    }
    if (fontSize === "normal") return "text-lg sm:text-xl leading-[2.2]";
    if (fontSize === "large") return "text-xl sm:text-2xl leading-[2.4]";
    return "text-2xl sm:text-3xl leading-[2.6]";
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white select-text">
      {/* Header */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-zinc-800/90 bg-zinc-900/60 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Top Author / Category Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                {source.workType === "textbook" ? (
                  <BookOpen className="size-3 text-indigo-400" />
                ) : source.workType === "lexicon" ? (
                  <Layers className="size-3 text-rose-400" />
                ) : (
                  <BookOpen className="size-3 text-emerald-400" />
                )}
                <span className="truncate max-w-[200px]">
                  {source.authorName || source.book}
                </span>
              </span>

              {/* Surah/Ayah or Root Badge */}
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
                {source.workType === "textbook"
                  ? "Grammar Reference"
                  : source.workType === "lexicon"
                  ? `Root: [${source.rootWord || "—"}]`
                  : `Surah ${source.surah || 1}:${source.ayah || 1}`}
              </span>
            </div>

            {/* Book Title */}
            <h2 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight leading-snug truncate">
              {source.book}
            </h2>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            aria-label="Close Chunk Viewer"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>

        {/* Verification banner */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-medium bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-2.5 py-1">
          <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
          <span>Exact classical passage retrieved & grounded by RAG</span>
        </div>
      </div>

      {/* Main Chunk Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => {
            // Check for continuation marker
            if (
              para.includes("... [Continuation] ...") ||
              para.includes("... [Relevant Excerpts Deep Within The Text] ...")
            ) {
              return (
                <div
                  key={idx}
                  className="my-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 font-mono text-center"
                >
                  <span>... Deep Excerpt Match in Source ...</span>
                </div>
              );
            }

            return (
              <p
                key={idx}
                dir={isArabic ? "rtl" : "ltr"}
                className={`${isArabic ? amiri.className : inter.className} ${getFontSizeClass()} ${
                  isArabic ? "text-right text-zinc-100" : "text-left text-zinc-200"
                } selection:bg-emerald-500/30 selection:text-white`}
              >
                {para}
              </p>
            );
          })
        ) : (
          <p className="text-zinc-500 text-sm italic">No text content available.</p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-3.5 sm:p-4 border-t border-zinc-800/90 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between gap-2.5">
        {/* Left Toolbar: Copy & Font Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Copy retrieved text"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {isArabic && (
            <button
              onClick={cycleFontSize}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              title="Toggle Font Size"
            >
              <Type className="size-3.5" />
              <span className="uppercase text-[10px] font-semibold">{fontSize}</span>
            </button>
          )}
        </div>

        {/* Right Toolbar: Continue Reading */}
        <Link
          href={continueReadingHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
        >
          <span>Continue Reading</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

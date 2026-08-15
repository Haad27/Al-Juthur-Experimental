"use client";

import React, { useState, useEffect } from "react";
import { Languages, Loader2, Sparkles, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface InlineTranslationProps {
  textToTranslate: string;
  onClose?: () => void;
}

export default function InlineTranslation({ textToTranslate, onClose }: InlineTranslationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [translationText, setTranslationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (translationText) return; // Already translated

    setIsLoading(true);
    setIsDone(false);
    setError(null);
    setTranslationText("");

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToTranslate, preserveStructure: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to start translation.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body.");

      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                fullText += data.text;
                // Basic parsing to show just the English text, stripping the markdown table
                const parsed = parseSimpleTranslation(fullText);
                setTranslationText(parsed);
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              // ignore parse errors for incomplete JSON chunks
            }
          }
        }
      }
      // If we finished and still have no parsed text, fallback to raw fullText just in case it wasn't a table
      setTranslationText((prev) => prev.trim() ? prev : fullText);
    } catch (err: any) {
      setError(err.message || "An error occurred during translation.");
    } finally {
      setIsLoading(false);
      setIsDone(true);
    }
  };

  // Quick helper to extract just the English text from the Markdown table stream
  const parseSimpleTranslation = (rawText: string) => {
    const lines = rawText.split("\n");
    let englishText = "";
    let isExtracting = false;

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed.startsWith("|") && !trimmed.includes("|")) continue;
      
      if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);
      
      const columns = trimmed.split("|").map((p) => p.trim());
      if (columns.length >= 1) {
        let transcreated = columns[0] || "";
        const cleanTrans = transcreated.toLowerCase().replace(/[\*\s\.\?]/g, "");
        
        if (
          cleanTrans === "transcreatedtext" ||
          cleanTrans === "readytogenerate" ||
          cleanTrans === "ready" ||
          cleanTrans.includes("thecombinedtranslation") ||
          cleanTrans.includes("waittheprompt") ||
          cleanTrans.includes("output:markdowntable") ||
          cleanTrans.startsWith("row1:") ||
          transcreated.includes("---")
        ) {
          continue;
        }
        
        if (!transcreated) continue;
        
        const cleanedTransText = transcreated.replace(/^(?:\*\*)?(?:Row|Paragraph|Segment|Section)\s*\d+[:\-\.]?\s*(?:\*\*)?\s*/i, "").trim();
        englishText += cleanedTransText + "\n\n";
      }
    }
    return englishText.trim();
  };

  return (
    <div className="mt-4 flex flex-col items-end">
      <button
        onClick={handleTranslate}
        className={cn(
          "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 font-medium text-xs sm:text-sm shadow-sm",
          isOpen
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        )}
      >
        <Languages className="size-4 shrink-0" />
        <span>{isOpen ? "Hide Translation" : "Quick Translate"}</span>
      </button>

      {isOpen && (
        <div className="w-full mt-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-zinc-950/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
          
          <div className="flex items-center justify-between mb-4">
            <h4 className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="size-4" />
              English Translation
              {isLoading && (
                <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                  <Loader2 className="size-3 animate-spin" /> Translating
                </span>
              )}
              {isDone && !error && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 font-medium">
                  Completed
                </span>
              )}
            </h4>
            <div className="flex items-center gap-3">
              <Link
                href="/ai"
                onClick={() => {
                  sessionStorage.setItem("ai_translator_input", textToTranslate);
                }}
                className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                Full Details <ExternalLink className="size-3" />
              </Link>
              {onClose && (
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[60px] text-zinc-200 text-sm sm:text-base leading-relaxed font-inter whitespace-pre-wrap text-left">
            {isLoading && !translationText ? (
              <div className="flex items-center justify-center h-full gap-2 text-zinc-400 py-4">
                <Loader2 className="size-4 animate-spin" />
                <span>Translating...</span>
              </div>
            ) : error ? (
              <div className="text-red-400 py-2">{error}</div>
            ) : (
              <div className="prose prose-invert prose-emerald max-w-none">
                {translationText || (
                   <span className="flex items-center gap-2 text-zinc-400">
                     <Loader2 className="size-3 animate-spin" /> Gathering context...
                   </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

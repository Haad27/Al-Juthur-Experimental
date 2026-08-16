"use client";

import React, { useState, useEffect } from "react";
import { Languages, Loader2, Sparkles, X, ExternalLink, Copy, Check } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface InlineTranslationProps {
  textToTranslate: string;
  storageKey?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
}

function getCacheKey(text: string, customKey?: string) {
  if (customKey) return `ai_trans_${customKey}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `ai_trans_hash_${Math.abs(hash)}`;
}

export default function InlineTranslation({ 
  textToTranslate, 
  storageKey,
  defaultOpen = false,
  onClose 
}: InlineTranslationProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [translationText, setTranslationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount or text change
  useEffect(() => {
    if (typeof window === "undefined" || !textToTranslate) return;
    const key = getCacheKey(textToTranslate, storageKey);
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved.trim()) {
        setTranslationText(saved);
        setIsDone(true);
        setIsSaved(true);
      }
    } catch (e) {
      // Ignore storage read error
    }
  }, [textToTranslate, storageKey]);

  const handleTranslate = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (translationText) return; // Already loaded from cache or previously translated

    setIsLoading(true);
    setIsDone(false);
    setIsSaved(false);
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
                const parsed = parseSimpleTranslation(fullText);
                if (parsed) {
                  setTranslationText(parsed);
                }
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              // ignore parse errors for incomplete JSON chunks
            }
          }
        }
      }

      const finalParsed = parseSimpleTranslation(fullText);
      if (finalParsed) {
        setTranslationText(finalParsed);
        try {
          const key = getCacheKey(textToTranslate, storageKey);
          localStorage.setItem(key, finalParsed);
          setIsSaved(true);
        } catch (e) {}
      }

      setIsDone(true);
      toast.success("Translation complete!", { id: "inline-trans-done" });
    } catch (err: any) {
      setError(err.message || "An error occurred during translation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to extract just the English text from the Markdown table stream
  const parseSimpleTranslation = (rawText: string) => {
    const lines = rawText.split("\n");
    let englishText = "";

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed.startsWith("|") && !trimmed.includes("|")) continue;
      
      if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);
      
      const columns = trimmed.split("|").map((p) => p.trim());
      if (columns.length >= 2) {
        let transcreated = columns[0] || "";
        let sourceFragments = columns[1] || "";
        
        // Strictly require the second column to contain a fragment number
        if (!/\d/.test(sourceFragments)) {
          continue;
        }

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
    <div className="mt-2 flex flex-col items-end w-full">
      <div className="flex items-center gap-2">
        {isSaved && !isOpen && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold shadow-sm">
            <Check className="size-3 text-emerald-400" /> Saved
          </span>
        )}
        <button
          onClick={handleTranslate}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-300 font-medium text-xs sm:text-sm shadow-sm cursor-pointer",
            isOpen
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 hover:bg-emerald-500/30 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          )}
        >
          <Languages className="size-4 shrink-0" />
          <span>{isOpen ? "Hide Translation" : translationText ? "View Translation" : "Quick Translate"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="w-full mt-3 animate-in fade-in slide-in-from-top-2 duration-300 bg-zinc-950/80 border border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
          
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="size-4" />
                English Translation
              </h4>

              {isLoading && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-medium animate-pulse">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  </div>
                  <span>Translating</span>
                </span>
              )}

              {isDone && !error && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                  <Check className="size-3" /> Translation Complete
                </span>
              )}

              {isSaved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                  Saved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {translationText && (
                <button
                  onClick={() => copyToClipboard(translationText, "English translation copied!")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer shadow-sm"
                  title="Copy English Translation"
                >
                  <Copy className="size-3.5" /> <span>Copy</span>
                </button>
              )}
              <Link
                href="/ai"
                onClick={() => {
                  sessionStorage.setItem("ai_translator_input", textToTranslate);
                }}
                className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-zinc-900"
              >
                Full Details <ExternalLink className="size-3" />
              </Link>
              {onClose && (
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-[60px] text-zinc-200 text-sm sm:text-base leading-relaxed font-inter whitespace-pre-wrap text-left">
            {isLoading && !translationText ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 py-6 text-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-300 font-medium text-sm">Translating with scholarly accuracy...</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    The AI is reviewing the text thoroughly. We will notify you with a popup as soon as it's done!
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="text-red-400 py-2">{error}</div>
            ) : (
              <div className="prose prose-invert prose-emerald max-w-none">
                {translationText ? (
                  <div>
                    <span>{translationText}</span>
                    {isLoading && (
                      <span className="inline-flex items-center gap-1 ml-2 text-emerald-400 font-mono align-baseline select-none">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                        <span className="text-xs text-emerald-400/80 font-sans italic ml-1 font-medium">translating...</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="size-3 animate-spin" /> Gathering context...
                  </span>
                )}
              </div>
            )}

            {/* Live Streaming Dots Bottom Indicator when streaming mid-way */}
            {isLoading && translationText && (
              <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3 px-4 sm:px-6 rounded-b-2xl animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  </div>
                  <span className="font-medium text-emerald-300">AI is actively generating the next section...</span>
                </div>
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Live stream</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { amiriquran } from "@/app/fonts";

interface LexiconTextRendererProps {
  text: string;
  isImmersive?: boolean;
}

export default function LexiconTextRenderer({ text, isImmersive }: LexiconTextRendererProps) {
  if (!text) return null;

  // Transform raw text/HTML for modern typography
  let content = text
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // Transform raw HTML tags for 3-Role Color System (soft amber chips for root terms & quotes)
  content = content
    .replace(/<b([^>]*)>(.*?)<\/b>/gi, '<b$1 class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-semibold text-xs md:text-sm inline-block mx-0.5">$2</b>')
    .replace(/<span class="text-amber-500 font-bold">/gi, '<span class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-semibold text-xs md:text-sm inline-block mx-0.5">');

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-3 ${isImmersive ? "text-amber-100/90 leading-relaxed font-serif" : "text-stone-300 leading-relaxed"}`}>
      {lines.map((line, idx) => {
        // Detect Arabic-dominant lines
        const isArabicLine = /[\u0600-\u06FF]/.test(line) && (line.match(/[\u0600-\u06FF]/g)?.length || 0) > line.length * 0.3;

        if (isArabicLine) {
          return (
            <p
              key={idx}
              className={`${amiriquran.className} ${
                isImmersive ? "text-2xl md:text-3xl text-amber-200/90 py-1" : "text-xl md:text-2xl text-stone-200 py-1"
              } text-right leading-loose`}
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: line }}
            />
          );
        }

        return (
          <p
            key={idx}
            className={`${
              isImmersive ? "text-base md:text-lg text-amber-100/80" : "text-sm md:text-base text-stone-300"
            } leading-relaxed`}
            dangerouslySetInnerHTML={{ __html: line }}
          />
        );
      })}
    </div>
  );
}

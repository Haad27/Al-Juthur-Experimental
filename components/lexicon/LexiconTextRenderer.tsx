"use client";

import React from "react";

interface LexiconTextRendererProps {
  text: string;
}

export default function LexiconTextRenderer({ text }: LexiconTextRendererProps) {
  if (!text) return null;

  // Transform raw text/HTML for modern typography
  let content = text
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // Transform raw HTML tags for 3-Role Color System (soft amber chips for root terms & quotes)
  content = content
    .replace(/<b([^>]*)>(.*?)<\/b>/gi, '<b$1 class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-semibold text-xs md:text-sm inline-block mx-0.5 shadow-sm">$2</b>')
    .replace(/<span class="text-amber-500 font-bold">/gi, '<span class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-semibold text-xs md:text-sm inline-block mx-0.5 shadow-sm">');

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-stone-300 leading-relaxed">
      {lines.map((line, idx) => {
        // Detect Arabic-dominant lines
        const isArabicLine = /[\u0600-\u06FF]/.test(line) && (line.match(/[\u0600-\u06FF]/g)?.length || 0) > line.length * 0.3;

        if (isArabicLine) {
          // Wrap Arabic lines in a Tafsir-like green container
          return (
            <div key={idx} className="block my-4 p-4 md:p-6 border-l-4 border-emerald-500 bg-emerald-950/30 rounded-r-xl shadow-sm text-right overflow-x-hidden">
              <p
                className="font-mushaf-uthmani text-2xl md:text-3xl text-emerald-100/90 leading-loose md:leading-loose"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: line }}
              />
            </div>
          );
        }

        // For lines that are mostly English but contain Arabic words, style the Arabic words
        const styledLine = line.replace(
          /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
          `<span class="font-mushaf-uthmani text-xl md:text-2xl text-emerald-200/90 leading-normal inline-block mx-1" dir="rtl">$&</span>`
        );

        return (
          <p
            key={idx}
            className="text-base md:text-lg text-stone-300 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: styledLine }}
          />
        );
      })}
    </div>
  );
}

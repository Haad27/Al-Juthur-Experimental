"use client";

import React from "react";

interface LexiconTextRendererProps {
  text: string;
  compact?: boolean;
}

export default function LexiconTextRenderer({ text, compact = false }: LexiconTextRendererProps) {
  if (!text) return null;

  // Transform raw text/HTML for modern typography
  let content = text
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // Transform raw HTML tags for 3-Role Color System (soft amber chips for root terms & quotes)
  // We use em-based or inherited sizes so it scales correctly for both English and Arabic
  content = content
    .replace(/<b([^>]*)>(.*?)<\/b>/gi, '<b$1 class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold shadow-sm inline-block mx-1">$2</b>')
    .replace(/<span class="text-amber-500 font-bold">/gi, '<span class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold shadow-sm inline-block mx-1">');

  // Also replace <ul> and <li> to use custom styles if they exist
  content = content
    .replace(/<ul([^>]*)>/gi, '<ul$1 class="space-y-2.5 mt-2 mb-2 ml-1">')
    .replace(/<li([^>]*)>/gi, '<li$1 class="flex items-start gap-2 before:content-[\'•\'] before:text-emerald-500/70 before:mr-1">');

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-3 text-stone-300 ${compact ? 'leading-snug' : 'leading-relaxed'}`}>
      {lines.map((line, idx) => {
        // Detect Arabic-dominant lines
        const isArabicLine = /[\u0600-\u06FF]/.test(line) && (line.match(/[\u0600-\u06FF]/g)?.length || 0) > line.length * 0.3;

        if (isArabicLine && !line.includes('<li')) {
          const displayLine = line
            .replace(/\u064E\u0670/g, '\u0670')
            .replace(/\u0670\u064E/g, '\u0670')
            .replace(/([^\s\u06DF\u06E0])?([\u06DF\u06E0])/g, '<span style="font-family: \'Amiri\', serif;">$1$2</span>')
            .replace(/([\u06ED])/g, '<span style="display: inline-block; vertical-align: -0.22em; font-family: \'Amiri\', serif;">$1</span>');

          // Render plain Arabic text with beautiful font, no heavy green wrapper
          return (
            <p
              key={idx}
              className={`font-arabic text-stone-200 text-right my-2 ${compact ? 'text-xl md:text-2xl leading-relaxed' : 'text-2xl md:text-3xl leading-loose md:leading-[2.5]'}`}
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: displayLine }}
            />
          );
        }

        // For lines that are mostly English but contain Arabic words, style the Arabic words
        let styledLine = line.replace(
          /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
          (match) => {
            const cleaned = match.replace(/\u064E\u0670/g, '\u0670').replace(/\u0670\u064E/g, '\u0670');
            return `<span class="font-arabic text-emerald-200/90 leading-normal inline-block mx-1 ${compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}" dir="rtl">${cleaned}</span>`;
          }
        );

        // If it's a list item, use div instead of p so block styling works well
        const Tag = line.includes('<li') || line.includes('<ul') ? 'div' : 'p';

        return (
          <Tag
            key={idx}
            className={`text-stone-300 whitespace-pre-wrap ${compact ? 'text-sm' : 'text-base md:text-lg'} ${line.includes('<li') ? '' : (compact ? 'leading-snug' : 'leading-relaxed')}`}
            dangerouslySetInnerHTML={{ __html: styledLine }}
          />
        );
      })}
    </div>
  );
}

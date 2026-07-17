"use client";

import React from "react";

interface TafsirTextRendererProps {
  text: string;
  isArabic?: boolean;
}

export default function TafsirTextRenderer({ text, isArabic }: TafsirTextRendererProps) {
  if (!text) return null;

  // 1. First clean outer wrapper divs like <div class=ar lang=ar> or </div>
  let content = text
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // 2. Parse blocks by splitting on double newlines or block tags (<p>, <h2>, <h3>)
  // We can convert HTML tags into styled React components block by block
  // Let's normalize <br> and <br/> to \n
  content = content.replace(/<br\s*\/?>/gi, "\n");

  // Helper to transform HTML span classes into Tailwind classes
  const transformHtmlForTailwind = (rawHtml: string) => {
    let html = rawHtml;
    // Quranic verses inside Tafsir
    html = html.replace(
      /<span[^>]*class="qpc-hafs"[^>]*>/gi,
      '<span class="font-bold text-emerald-400 font-serif text-xl leading-relaxed mx-1">'
    );
    // Highlights
    html = html.replace(
      /<span[^>]*class="hlt"[^>]*>/gi,
      '<span class="text-amber-200">'
    );
    // Gray/secondary text
    html = html.replace(
      /<span[^>]*class="gray"[^>]*>/gi,
      '<span class="text-zinc-400 italic bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/40 inline-block my-0.5">'
    );
    
    // Any other generic span if they exist without classes
    // (Optional: if we just want to ensure they render safely without breaking)
    return html;
  };

  // Split content into lines or tag blocks
  // Let's extract <h2>...</h2> and <h3>...</h3> and <p>...</p> into distinct blocks
  const blockRegex = /<(h[1-6]|p)[^>]*>(.*?)<\/\1>/gi;
  const blocks: { type: string; text: string }[] = [];
  let lastBlockIndex = 0;
  let bMatch;

  while ((bMatch = blockRegex.exec(content)) !== null) {
    if (bMatch.index > lastBlockIndex) {
      const before = content.slice(lastBlockIndex, bMatch.index).trim();
      if (before) {
        blocks.push({ type: "p", text: before });
      }
    }
    blocks.push({ type: bMatch[1].toLowerCase(), text: bMatch[2] });
    lastBlockIndex = blockRegex.lastIndex;
  }

  if (lastBlockIndex < content.length) {
    const after = content.slice(lastBlockIndex).trim();
    if (after) {
      blocks.push({ type: "p", text: after });
    }
  }

  // If no HTML block tags were matched, split by newlines
  if (blocks.length === 0) {
    content
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        blocks.push({ type: "p", text: line });
      });
  }

  return (
    <div
      className={`space-y-4 ${isArabic ? "font-serif text-right" : "text-left"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {blocks.map((block, idx) => {
        const transformedHtml = transformHtmlForTailwind(block.text);
        
        if (block.type.startsWith("h")) {
          return (
            <h3
              key={idx}
              className="text-lg md:text-xl font-bold text-amber-300 border-b border-amber-500/20 pb-2 mt-6 mb-3"
              dangerouslySetInnerHTML={{ __html: transformedHtml }}
            />
          );
        }

        // Check for Arabic section labels
        const isArabicHeader =
          block.text.includes("شرح الكلمات") ||
          block.text.includes("معنى الآية") ||
          block.text.includes("هداية الآيات") ||
          (block.text.length < 35 && block.text.endsWith(":"));

        if (isArabicHeader) {
          return (
            <p
              key={idx}
              className="font-bold text-emerald-400 text-lg mt-4 pb-1 border-b border-emerald-500/20 inline-block"
              dangerouslySetInnerHTML={{ __html: transformedHtml }}
            />
          );
        }

        return (
          <p
            key={idx}
            className="text-zinc-200 text-base md:text-lg leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: transformedHtml }}
          />
        );
      })}
    </div>
  );
}

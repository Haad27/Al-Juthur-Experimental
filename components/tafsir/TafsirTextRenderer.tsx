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

  // Helper to format inline tags like <span class="gray">...</span> inside text
  const renderInlineText = (rawStr: string, idxKey: number) => {
    // Check for span tags like <span class="gray">(...)</span>
    const spanRegex = /<span[^>]*>(.*?)<\/span>/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = spanRegex.exec(rawStr)) !== null) {
      if (match.index > lastIndex) {
        parts.push(rawStr.slice(lastIndex, match.index));
      }
      parts.push(
        <span
          key={`span-${idxKey}-${match.index}`}
          className="text-zinc-400 italic bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/40 inline-block my-0.5"
        >
          {match[1]}
        </span>
      );
      lastIndex = spanRegex.lastIndex;
    }

    if (lastIndex < rawStr.length) {
      // Also strip any other stray HTML tags that might be left inline
      const rest = rawStr.slice(lastIndex).replace(/<[^>]+>/g, "");
      parts.push(rest);
    }

    return parts.length > 0 ? parts : rawStr.replace(/<[^>]+>/g, "");
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
        if (block.type.startsWith("h")) {
          return (
            <h3
              key={idx}
              className="text-lg md:text-xl font-bold text-amber-300 border-b border-amber-500/20 pb-2 mt-6 mb-3"
            >
              {renderInlineText(block.text, idx)}
            </h3>
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
            >
              {renderInlineText(block.text, idx)}
            </p>
          );
        }

        return (
          <p
            key={idx}
            className="text-zinc-200 text-base md:text-lg leading-relaxed whitespace-pre-wrap"
          >
            {renderInlineText(block.text, idx)}
          </p>
        );
      })}
    </div>
  );
}

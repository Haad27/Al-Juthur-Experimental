"use client";

import React from "react";

interface TafsirTextRendererProps {
  text: string;
  isArabic?: boolean;
  immersive?: boolean;
}

export default function TafsirTextRenderer({ text, isArabic, immersive }: TafsirTextRendererProps) {
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

  // Helper to transform HTML span classes into styled classes
  const transformHtmlForTailwind = (rawHtml: string, isImmersive: boolean, isAr: boolean) => {
    let html = rawHtml;

    if (isImmersive) {
      // Immersive mode: warm golden styling for embedded Quran verses
      html = html.replace(
        /<span[^>]*class="qpc-hafs"[^>]*>/gi,
        '<span style="font-family:Amiri,serif;color:#fef3c7;font-size:1.2em;line-height:2.2;margin:0 0.25em;">'
      );
      // Highlights in immersive — warm amber
      html = html.replace(
        /<span[^>]*class="hlt"[^>]*>/gi,
        '<span style="color:#fbbf24;">'
      );
      // Gray/secondary text in immersive
      html = html.replace(
        /<span[^>]*class="gray"[^>]*>/gi,
        '<span style="color:#9a7c5a;font-style:italic;">'
      );
    } else {
      // Standard mode (original styling)
      html = html.replace(
        /<span[^>]*class="qpc-hafs"[^>]*>/gi,
        '<span class="font-bold text-emerald-400 font-serif text-xl leading-relaxed mx-1">'
      );
      html = html.replace(
        /<span[^>]*class="hlt"[^>]*>/gi,
        '<span class="text-amber-200">'
      );
      html = html.replace(
        /<span[^>]*class="gray"[^>]*>/gi,
        '<span class="text-zinc-400 italic bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/40 inline-block my-0.5">'
      );
    }

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

  if (immersive) {
    // ── IMMERSIVE MODE RENDERING ──────────────────────────────────────────────
    return (
      <div
        className={isArabic ? "tafsir-immersive-text-arabic" : "tafsir-immersive-text"}
        dir={isArabic ? "rtl" : "ltr"}
      >
        {blocks.map((block, idx) => {
          const transformedHtml = transformHtmlForTailwind(block.text, true, !!isArabic);

          if (block.type.startsWith("h")) {
            return (
              <h3
                key={idx}
                style={{
                  fontFamily: isArabic ? "Amiri, serif" : "'Lora', Georgia, serif",
                  fontSize: isArabic ? "1.3rem" : "1.15rem",
                  fontWeight: 700,
                  color: "#d97706",
                  borderBottom: "1px solid rgba(180,120,40,0.2)",
                  paddingBottom: "0.5rem",
                  marginTop: "2rem",
                  marginBottom: "1rem",
                  letterSpacing: "0.01em",
                }}
                dangerouslySetInnerHTML={{ __html: transformedHtml }}
              />
            );
          }

          // Arabic section labels
          const isArabicHeader =
            block.text.includes("شرح الكلمات") ||
            block.text.includes("معنى الآية") ||
            block.text.includes("هداية الآيات") ||
            (block.text.length < 35 && block.text.endsWith(":"));

          if (isArabicHeader) {
            return (
              <p
                key={idx}
                style={{
                  fontFamily: "Amiri, serif",
                  fontWeight: 700,
                  color: "#b45309",
                  fontSize: "1.1rem",
                  marginTop: "1.5rem",
                  paddingBottom: "0.4rem",
                  borderBottom: "1px solid rgba(180,120,40,0.15)",
                }}
                dangerouslySetInnerHTML={{ __html: transformedHtml }}
              />
            );
          }

          return (
            <p
              key={idx}
              style={{ marginBottom: "1.25em", textIndent: idx === 0 ? 0 : undefined }}
              dangerouslySetInnerHTML={{ __html: transformedHtml }}
            />
          );
        })}
      </div>
    );
  }

  // ── STANDARD MODE RENDERING (unchanged) ────────────────────────────────────
  return (
    <div
      className={`space-y-4 ${isArabic ? "font-serif text-right" : "text-left"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {blocks.map((block, idx) => {
        const transformedHtml = transformHtmlForTailwind(block.text, false, !!isArabic);

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

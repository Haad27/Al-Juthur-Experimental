import { BookOpen, Info, ArrowRight } from "lucide-react";

interface TafsirTextRendererProps {
  text: string;
  isArabic?: boolean;
  isUrdu?: boolean;
  langName?: string;
  onNavigateToAyah?: (ayahNum: number) => void;
}

export default function TafsirTextRenderer({ 
  text, 
  isArabic: propIsArabic, 
  isUrdu: propIsUrdu, 
  langName = "",
  onNavigateToAyah 
}: TafsirTextRendererProps) {
  if (!text) return null;

  const lowerLang = (langName || "").toLowerCase();
  const isUrdu = !!propIsUrdu || lowerLang.includes("urdu");
  const isPashto = lowerLang.includes("pashto") || lowerLang === "ps";
  const isPersian = lowerLang.includes("persian") || lowerLang.includes("farsi") || lowerLang.includes("uyghur") || lowerLang.includes("kurdish") || lowerLang.includes("sindhi");
  const isArabic = !!propIsArabic || lowerLang.includes("arabic") || lowerLang === "العربية";
  const isRtl = isArabic || isUrdu || isPashto || isPersian;

  const trimmedText = text.trim();

  // Handle empty or placeholder brackets "{}"
  if (!trimmedText || trimmedText === "{}" || trimmedText === "[]") {
    return (
      <div className="py-3 px-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 text-xs sm:text-sm italic flex items-center gap-2.5">
        <Info className="size-4 text-zinc-500 shrink-0" />
        <span>No specific commentary entry recorded for this verse.</span>
      </div>
    );
  }

  // Handle cross-reference pointers (e.g. "2:1", "2:10") to previous verses
  const crossRefMatch = trimmedText.match(/^(\d+):(\d+)$/);
  if (crossRefMatch) {
    const targetSurah = parseInt(crossRefMatch[1], 10);
    const targetAyah = parseInt(crossRefMatch[2], 10);
    return (
      <div className="py-3 px-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-zinc-400 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5 italic">
          <BookOpen className="size-4 text-emerald-500/70 shrink-0 not-italic" />
          <span>
            Tafsir for this verse is covered under <strong className="text-zinc-200 not-italic font-semibold">Ayah {targetAyah}</strong>.
          </span>
        </div>
        {onNavigateToAyah && (
          <button
            onClick={() => onNavigateToAyah(targetAyah)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-emerald-400 font-medium text-xs transition-all cursor-pointer shrink-0"
          >
            <span>Jump to Ayah {targetAyah}</span>
            <ArrowRight className="size-3.5 text-zinc-400" />
          </button>
        )}
      </div>
    );
  }

  // 1. First clean outer wrapper divs like <div class=ar lang=ar> or </div>
  let content = trimmedText
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // 2. Parse blocks by splitting on double newlines or block tags (<p>, <h2>, <h3>)
  content = content.replace(/<br\s*\/?>/gi, "\n");

  // Helper to transform HTML span classes into styled classes
  const transformHtmlForTailwind = (rawHtml: string, isRightToLeft: boolean) => {
    let html = rawHtml;

    // Helper to wrap raw Arabic text in a styled span ONLY for LTR languages (English, French, etc.)
    const applyArabicFont = (textToFormat: string) => {
      return textToFormat.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, contentInside) => {
        if (tag) return tag;
        if (contentInside) {
          return contentInside.replace(
            /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u08E4-\u08FE\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u08E4-\u08FE\uFB50-\uFDFF\uFE70-\uFEFF\d\(\)\[\]«».,;:؟!]+)*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u08E4-\u08FE\uFB50-\uFDFF\uFE70-\uFEFF]+|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u08E4-\u08FE\uFB50-\uFDFF\uFE70-\uFEFF]+)/g,
            '<span style="font-family: \'Noto Naskh Arabic\', \'Amiri\', serif; font-size: 1.25em; line-height: 2.2; font-weight: normal; color: #f1f5f9; display: inline-block; text-align: right;" dir="rtl">$1</span>'
          );
        }
        return match;
      });
    };

    // Standard mode (3-Role Color System)
    // 1. Quranic Verse Citations → Soft amber citation chip
    html = html.replace(
      /<span[^>]*class="qpc-hafs"[^>]*>/gi,
      '<span class="bg-amber-950/60 text-amber-200/90 border border-amber-500/30 px-2 py-0.5 rounded-md font-serif text-lg md:text-xl leading-loose inline-block mx-1 my-0.5 shadow-sm" style="font-family: \'UthmanicHafs\', serif;">'
    );
    // 2. Phrase Highlights → Soft warm amber text
    html = html.replace(
      /<span[^>]*class="hlt"[^>]*>/gi,
      '<span class="text-amber-300/90 font-semibold">'
    );
    // 3. Footnotes / Gray Text → Green container or muted pill
    html = html.replace(
      /<span[^>]*class="gray"[^>]*>([\s\S]*?)<\/span>/gi,
      (match, innerText) => {
        if (innerText.length < 50) {
          return `<span class="text-zinc-400 italic bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/40 inline-block my-0.5 text-xs md:text-sm">${innerText}</span>`;
        }
        return `<span class="block my-4 p-4 border-l-4 border-emerald-500 bg-emerald-950/30 rounded-r-xl text-emerald-100/90 text-sm md:text-base italic shadow-sm">${innerText}</span>`;
      }
    );

    // Only apply Arabic snippet font wrapper if this is an LTR translation (e.g. English, French)
    if (!isRightToLeft) {
      html = applyArabicFont(html);
    }

    return html;
  };

  // Split content into lines or tag blocks
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

  if (blocks.length === 0) {
    content
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        blocks.push({ type: "p", text: line });
      });
  }

  const getFontFamily = () => {
    if (isUrdu) return "'IndoPakNastaleeq', 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Scheherazade New', 'Lateef', serif";
    if (isPashto) return "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Scheherazade New', 'Amiri', serif";
    if (isPersian) return "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Amiri', serif";
    if (isArabic) return "'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif";
    return undefined;
  };

  const getLineHeight = () => {
    if (isUrdu) return "2.6";
    if (isPashto) return "2.2";
    if (isPersian || isArabic) return "2.1";
    return "1.65";
  };

  const getFontSize = () => {
    if (isUrdu) return "1.25rem";
    if (isPashto) return "1.2rem";
    if (isArabic || isPersian) return "1.2rem";
    return undefined;
  };

  return (
    <div
      className={`space-y-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        fontFamily: getFontFamily(),
        lineHeight: getLineHeight(),
        fontSize: getFontSize(),
      }}
    >
      {blocks.map((block, idx) => {
        const transformedHtml = transformHtmlForTailwind(block.text, isRtl);

        if (block.type.startsWith("h")) {
          return (
            <h3
              key={idx}
              className={`font-bold text-emerald-300/90 text-base md:text-lg my-4 leading-snug ${
                isRtl ? "border-r-2 border-emerald-500/60 pr-3" : "border-l-2 border-emerald-500/60 pl-3"
              }`}
              style={{ fontSize: getFontSize(), lineHeight: getLineHeight() }}
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
              className="font-bold text-emerald-300/90 text-base md:text-lg mt-4 pb-1 border-r-2 border-emerald-500/60 pr-3 inline-block"
              style={{ fontSize: getFontSize(), lineHeight: getLineHeight() }}
              dangerouslySetInnerHTML={{ __html: transformedHtml }}
            />
          );
        }

        return (
          <p
            key={idx}
            className="text-stone-300 text-base md:text-lg whitespace-pre-wrap"
            style={{ 
              lineHeight: getLineHeight(), 
              fontSize: getFontSize() 
            }}
            dangerouslySetInnerHTML={{ __html: transformedHtml }}
          />
        );
      })}
    </div>
  );
}

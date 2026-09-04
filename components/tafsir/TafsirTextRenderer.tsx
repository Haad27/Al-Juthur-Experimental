import { BookOpen, Info, ArrowRight, Lock, Sparkles } from "lucide-react";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";

interface TafsirTextRendererProps {
  text: string;
  isArabic?: boolean;
  isUrdu?: boolean;
  langName?: string;
  isLocked?: boolean;
  authorName?: string;
  onNavigateToAyah?: (ayahNum: number) => void;
  onUpgradeClick?: () => void;
}

export default function TafsirTextRenderer({ 
  text, 
  isArabic: propIsArabic, 
  isUrdu: propIsUrdu, 
  langName = "",
  isLocked = false,
  authorName = "",
  onNavigateToAyah,
  onUpgradeClick,
}: TafsirTextRendererProps) {
  const { openPricingModal } = useSubscriptionStore();
  if (!text) return null;

  const lowerLang = (langName || "").toLowerCase();
  const isUrdu = !!propIsUrdu || lowerLang.includes("urdu");
  const isPashto = lowerLang.includes("pashto") || lowerLang === "ps";
  const isPersian = lowerLang.includes("persian") || lowerLang.includes("farsi") || lowerLang.includes("uyghur") || lowerLang.includes("kurdish") || lowerLang.includes("sindhi");
  const isArabic = (!isUrdu && !isPashto && !isPersian) && (!!propIsArabic || lowerLang.includes("arabic") || lowerLang === "العربية");
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

  // Strip classical decorative circles / rosettes / manuscript variation symbols (🔘, ۞, ۝, ◌, ֎, etc.) in Tafsir UI
  content = content
    .replace(/[\u{1F518}\u{1F534}\u{1F535}\u{1F536}\u{1F537}\u{1F538}\u{1F539}\u{1F780}-\u{1F7FF}\u{1F6E0}-\u{1F6FF}🔘۞۝֎◌◍◎◉⦾⦿⚬◯○●◐◑◒◓◈◇◆▪▫★☆✦✧※\u06DE\u06DD\u06E9\u058E\u25CC\u25CD\u20DD\u20DE\u20DF\u25CB\u25CF\u25CE\u25C9\u29BF\u29BE\u2299\u229A\u2735\u2736\u2742\u2740\u273F\u2741\u2055\u2737\u2738\u2739\u273A\u25C8\u2743\u273D\u2734\u25EF\u2B58\u2B57\u25D9\u25D8\u25C6\u25C7\u25A0\u25A1\u25AA\u25AB]/gu, " ")
    .replace(/\s{2,}/g, " ");

  // In Arabic Tafsir texts, remove characters (Arabic comma ،, semicolon ؛, question mark, orphan Quranic placeholder glyphs)
  // that font engines (such as Uthmanic Quran fonts) map to dotted-circle / ayah glyphs instead of normal punctuation
  if (isArabic) {
    content = content
      .replace(/[\u0600-\u060F\u061B\u061F\u06D4\u06DF\u06E3\u06EB\u06EE\u06EF]/gu, " ")
      .replace(/\s{2,}/g, " ");
  }

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
            '<span style="font-family: \'Noto Naskh Arabic\', \'Amiri\', serif; font-size: 1.25em; line-height: 2.2; font-weight: normal; color: var(--arabic); display: inline-block; text-align: right;" dir="rtl">$1</span>'
          );
        }
        return match;
      });
    };

    // Standard mode (Clean Subtle Muted Italic Pill System)
    // 1. Quranic Verse Citations (<span class="qpc-hafs">) → Subtle muted italic pill / container
    html = html.replace(
      /<span[^>]*class="qpc-hafs"[^>]*>([\s\S]*?)<\/span>/gi,
      (match, innerText) => {
        const trimmed = innerText.trim();
        // Standalone long ayah block (>= 80 characters)
        if (trimmed.length >= 80) {
          return `<span class="block my-3 p-3.5 ${
            isRightToLeft ? "border-r-2 border-zinc-600/70 rounded-l-lg pr-3.5" : "border-l-2 border-zinc-600/70 rounded-r-lg pl-3.5"
          } bg-zinc-800/30 text-zinc-200 font-serif text-lg md:text-xl leading-loose italic" style="font-family: 'UthmanicHafs', serif;">${trimmed}</span>`;
        }
        // Subtle inline italic muted chip
        return `<span class="bg-zinc-800/40 text-zinc-300 border border-zinc-700/40 px-2 py-0.5 rounded-md font-serif text-base md:text-lg italic leading-loose inline-block mx-1 my-0.5 shadow-sm" style="font-family: 'UthmanicHafs', serif;">${trimmed}</span>`;
      }
    );
    // Fallback for unclosed or isolated qpc-hafs opening tags
    html = html.replace(
      /<span[^>]*class="qpc-hafs"[^>]*>/gi,
      '<span class="bg-zinc-800/40 text-zinc-300 border border-zinc-700/40 px-2 py-0.5 rounded-md font-serif text-base md:text-lg italic leading-loose inline-block mx-1 my-0.5 shadow-sm" style="font-family: \'UthmanicHafs\', serif;">'
    );

    // 2. Arabic Quranic Verses in brackets { ... }, ﴿ ... ﴾, « ... » across Urdu and all languages
    html = html.replace(
      /([\{﴿«])([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u08E4-\u08FE\uFB50-\uFDFF\uFE70-\uFEFF\s\d.,:;!؟\(\)\[\]\-–—«»"']+?)([\}﴾»])/gu,
      (match, openBracket, verseContent, closeBracket) => {
        const trimmed = verseContent.trim();
        // Check if content has substantial Arabic letters (distinct from pure Urdu sentences)
        const arabicLettersCount = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
        if (arabicLettersCount >= 3) {
          if (trimmed.length >= 80) {
            return `<span class="block my-3 p-3.5 ${
              isRightToLeft ? "border-r-2 border-zinc-600/70 rounded-l-lg pr-3.5" : "border-l-2 border-zinc-600/70 rounded-r-lg pl-3.5"
            } bg-zinc-800/30 text-zinc-200 font-serif text-lg md:text-xl leading-loose italic" style="font-family: 'UthmanicHafs', 'Amiri', serif;" dir="rtl">﴿${trimmed}﴾</span>`;
          }
          return `<span class="bg-zinc-800/40 text-zinc-300 border border-zinc-700/40 px-2 py-0.5 rounded-md font-serif text-base md:text-lg italic leading-loose inline-block mx-1 my-0.5 shadow-sm" style="font-family: 'UthmanicHafs', 'Amiri', serif;" dir="rtl">﴿${trimmed}﴾</span>`;
        }
        return match;
      }
    );

    // 3. Phrase Highlights → Clean subtle text
    html = html.replace(
      /<span[^>]*class="hlt"[^>]*>/gi,
      '<span class="text-zinc-200 font-semibold">'
    );

    // 4. Footnotes / Gray Text / Translation quotes → Direction-aware green container or muted pill
    html = html.replace(
      /<span[^>]*class="gray"[^>]*>([\s\S]*?)<\/span>/gi,
      (match, innerText) => {
        const trimmed = innerText.trim();
        if (trimmed.length < 50) {
          return `<span class="text-zinc-400 italic bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/40 inline-block my-0.5 text-xs md:text-sm">${trimmed}</span>`;
        }
        return `<span class="block my-4 p-4 ${
          isRightToLeft ? "border-r-4 rounded-l-xl" : "border-l-4 rounded-r-xl"
        } border-emerald-500 bg-emerald-950/30 text-emerald-100/90 text-sm md:text-base italic shadow-sm">${trimmed}</span>`;
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
    if (isUrdu) return "var(--font-noto-nastaliq-urdu), 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif";
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

  const displayedBlocks = isLocked ? blocks.slice(0, 3) : blocks;

  return (
    <div className="relative">
      <div
        className={`space-y-4 ${isRtl ? "text-right" : "text-left"} ${
          isLocked ? "overflow-hidden max-h-[160px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)] select-none pointer-events-none" : ""
        }`}
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          fontFamily: getFontFamily(),
          lineHeight: getLineHeight(),
          fontSize: getFontSize(),
        }}
      >
        {displayedBlocks.map((block, idx) => {
          const cleanTextOnly = block.text.replace(/<[^>]+>/g, "").trim();
          const hasLetters = /[\p{L}\p{N}]/u.test(cleanTextOnly);

          // If a block has no actual letters (e.g. "* *", "***", "• • •"), render it as a subtle centered divider
          if (!hasLetters && cleanTextOnly.length > 0) {
            return (
              <div key={idx} className="my-2 py-1 text-center text-zinc-600 text-xs tracking-widest select-none">
                • • •
              </div>
            );
          }

          const transformedHtml = transformHtmlForTailwind(block.text, isRtl);

          // Only genuine text headers get header styling
          if (block.type.startsWith("h") && hasLetters && cleanTextOnly.length >= 2) {
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
          const hasArabicLetters = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(cleanTextOnly);
          const isArabicHeader =
            hasArabicLetters &&
            (cleanTextOnly.includes("شرح الكلمات") ||
             cleanTextOnly.includes("معنى الآية") ||
             cleanTextOnly.includes("هداية الآيات") ||
             (cleanTextOnly.length >= 3 && cleanTextOnly.length < 40 && cleanTextOnly.endsWith(":")));

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

      {/* Frosted Glass Blur Lock Overlay */}
      {isLocked && (
        <div className="relative -mt-16 pt-16 pb-8 px-6 rounded-3xl bg-gradient-to-t from-[#090e0b] via-[#090e0b]/95 to-transparent border border-emerald-500/20 text-center space-y-4 shadow-2xl backdrop-blur-md z-10">
          <div className="mx-auto size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Lock className="size-6 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-white font-serif">
              Unlock Full Commentary with <span className="text-emerald-400">Al-Juthur Pro</span>
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              You are previewing {authorName || "this classical work"}. Subscribe to Pro to unlock all 130+ classical Tafsirs across all 114 Surahs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={onUpgradeClick || openPricingModal}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="size-4" />
              <span>Upgrade to Pro ($3.99/mo)</span>
            </button>
          </div>
          <p className="text-[11px] text-emerald-400/80">
            💡 Tip: Surah Al-Fatihah is 100% free for all 130+ authors to preview anytime!
          </p>
        </div>
      )}
    </div>
  );
}

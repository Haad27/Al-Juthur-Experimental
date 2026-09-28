import { Lock, Sparkles } from "lucide-react";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";
import { cleanQuranText } from "@/lib/utils";
import { UserHighlight } from "@/lib/readerStorage";

export interface LexiconTextRendererProps {
  text: string;
  compact?: boolean;
  isLocked?: boolean;
  dictName?: string;
  onUpgradeClick?: () => void;
  highlights?: UserHighlight[];
  notes?: any[];
  isEnglish?: boolean;
}

// Unified resilient pattern generator matching across Arabic diacritics, HTML tags, whitespace, smart quotes, entities, etc.
export function buildResilientPattern(rawStr: string): string | null {
  const trimmed = cleanQuranText(rawStr.trim());
  if (!trimmed) return null;

  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(trimmed);

  if (hasArabic) {
    const diacritics = '[\\u064B-\\u065F\\u0670\\u0640]*';
    let pattern = '';
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      // Skip if character is a standalone diacritic in the source selection
      if (/[\u064B-\u065F\u0670\u0640]/.test(char)) continue;

      if (/[اأإآٱ]/.test(char)) {
        pattern += '[اأإآٱ]' + diacritics;
      } else if (/[يىئ]/.test(char)) {
        pattern += '[يىئ]' + diacritics;
      } else if (/[ةه]/.test(char)) {
        pattern += '[ةه]' + diacritics;
      } else if (/[\s\u00A0\u200B-\u200D]/.test(char)) {
        pattern += '(?:<[^>]+>|[\\s\\u00A0\\u200B-\\u200D])+';
      } else if (/[''’‘]/.test(char)) {
        pattern += "(?:'|&#39;|&apos;|’|‘)";
      } else if (/[""“”]/.test(char)) {
        pattern += '(?:"|&quot;|&#34;|“|”)';
      } else if (char === '&') {
        pattern += '(?:&|&amp;)';
      } else if (/[-\/\\^$*+?.()|[\]{}]/.test(char)) {
        pattern += '\\' + char;
      } else {
        pattern += char + diacritics;
      }
    }
    return pattern;
  }

  // Non-Arabic (English / Urdu / Latin languages)
  let escaped = trimmed
    .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    .replace(/[''’‘]/g, "(?:'|&#39;|&apos;|’|‘)")
    .replace(/[""“”]/g, '(?:"|&quot;|&#34;|“|”)')
    .replace(/&/g, '(?:&|&amp;)')
    .replace(/↓/g, '(?:↓|&darr;)')
    .replace(/[—–-]/g, '(?:—|–|-|&mdash;|&ndash;)')
    .replace(/\\\s+|\s+/g, '(?:<[^>]+>|[\\s\\u00A0\\u200B-\\u200D])+');

  return escaped;
}

export function applyHighlightsAndNotesToHtml(
  rawHtml: string,
  highlights: UserHighlight[] = [],
  notes: any[] = []
): string {
  let html = rawHtml;

  // 1. Apply User Highlights (Fill and Underline modes) - Vibrant readable palette
  if (highlights && highlights.length > 0) {
    highlights.forEach((h) => {
      if (!h.text || h.text.trim() === '') return;
      try {
        const color = (h.color || 'gold').toLowerCase();
        const isUnderline = color.endsWith('_underline');
        const baseColor = color.replace('_underline', '');

        let bg = 'rgba(250, 204, 21, 0.45)'; // amber/yellow-400
        let border = '#d97706';
        if (baseColor === 'pink') {
          bg = 'rgba(244, 63, 94, 0.40)'; // rose/pink-500
          border = '#e11d48';
        } else if (baseColor === 'green') {
          bg = 'rgba(34, 197, 94, 0.40)'; // sage green-500
          border = '#16a34a';
        } else if (baseColor === 'blue') {
          bg = 'rgba(59, 130, 246, 0.40)'; // sky blue-500
          border = '#2563eb';
        } else if (baseColor === 'purple') {
          bg = 'rgba(168, 85, 247, 0.40)'; // violet-500
          border = '#8b5cf6';
        }

        const markStyle = isUnderline
          ? `background-color: transparent; border-bottom: 2.5px solid ${border}; padding-bottom: 1.5px; text-decoration: none; display: inline;`
          : `background-color: ${bg}; border-bottom: 2px solid ${border}; border-radius: 3px; padding: 2px 4px; text-decoration: none; display: inline;`;

        // Handle multi-line selections across paragraphs
        const segments = h.text.split(/\n+/).map((s) => s.trim()).filter((s) => s.length >= 2);
        const targets = segments.length > 0 ? segments : [h.text.trim()];

        targets.forEach((seg) => {
          const pattern = buildResilientPattern(seg);
          if (!pattern) return;
          // Match text outside HTML tags and not already inside a <mark>
          const reg = new RegExp(`(${pattern})(?![^<]*>)(?![^<]*<\\/mark>)`, 'giu');
          html = html.replace(reg, `<mark style="${markStyle}" class="text-inherit cursor-pointer transition-opacity hover:opacity-85" data-id="${h.id || ''}" data-color="${color}">$1</mark>`);
        });
      } catch (e) {
        console.error("Failed to highlight text", e);
      }
    });
  }

  // 2. Apply Inline Note Indicators (only for anchored notes that match this specific text)
  if (notes && notes.length > 0) {
    notes.forEach((note) => {
      const anchorMatch = note.text.match(/^\[Re:\s*["']?([\s\S]+?)["']?\]\s*(?:\r?\n|$)/);
      if (anchorMatch) {
        let anchor = anchorMatch[1].trim();
        if (anchor.endsWith('…')) anchor = anchor.slice(0, -1).trim();
        const pattern = buildResilientPattern(anchor);
        if (pattern) {
          try {
            // Match the anchored phrase outside HTML tags, right after mark or complete word
            const regex = new RegExp(`(${pattern}(?:<\\/mark>)?)(?![\\p{L}\\p{N}])(?![^<]*>)`, "iu");
            // Subtle sticky note icon placed right after the complete highlighted word/phrase
            const iconHtml = ` <span role="button" tabindex="0" data-note-id="${note.id}" class="note-indicator-icon inline-flex items-center justify-center shrink-0 size-5 rounded-md bg-amber-400/30 hover:bg-amber-400/50 border border-amber-500/50 text-amber-700 dark:text-amber-300 text-xs mx-1 align-baseline cursor-pointer transition-transform hover:scale-110 select-none shadow-sm" title="Click to view note">📝</span>`;
            html = html.replace(regex, `$1${iconHtml}`);
          } catch (e) {
            console.error("Failed to add note indicator", e);
          }
        }
      }
    });
  }

  return html;
}

export default function LexiconTextRenderer({ 
  text, 
  compact = false,
  isLocked = false,
  dictName = "",
  onUpgradeClick,
  highlights = [],
  notes = [],
  isEnglish = false,
}: LexiconTextRendererProps) {
  const { openPricingModal } = useSubscriptionStore();
  if (!text) return null;

  // Transform raw text/HTML for modern typography
  let content = text
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "")
    .trim();

  // Transform raw HTML tags for 3-Role Color System (soft accent chips for root terms & quotes)
  content = content
    .replace(/<b([^>]*)>(.*?)<\/b>/gi, '<b$1 class="bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 rounded-md font-bold shadow-sm inline-block mx-1">$2</b>')
    .replace(/<span class="text-amber-500 font-bold">/gi, '<span class="bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 rounded-md font-bold shadow-sm inline-block mx-1">');

  // Also replace <ul> and <li> to use custom styles if they exist
  content = content
    .replace(/<ul([^>]*)>/gi, '<ul$1 class="space-y-2.5 mt-2 mb-2 ml-1">')
    .replace(/<li([^>]*)>/gi, '<li$1 class="flex items-start gap-2 before:content-[\'•\'] before:text-accent before:mr-1">');

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const displayedLines = isLocked ? lines.slice(0, 3) : lines;

  return (
    <div className="relative lexicon-content">
      <div 
        className={`space-y-3 text-reading ${compact ? 'leading-snug' : 'leading-relaxed'} ${
          isLocked ? 'overflow-hidden max-h-[140px] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)] select-none pointer-events-none' : ''
        }`}
      >
        {displayedLines.map((line, idx) => {
          // Detect Arabic-dominant lines (disabled for English dictionaries like Lane's or Hans Wehr)
          const isArabicLine = !isEnglish && /[\u0600-\u06FF]/.test(line) && (line.match(/[\u0600-\u06FF]/g)?.length || 0) > line.length * 0.3;

          if (isArabicLine && !line.includes('<li')) {
            const displayLine = applyHighlightsAndNotesToHtml(cleanQuranText(line), highlights, notes);

            return (
              <p
                key={idx}
                className={`font-arabic text-arabic text-right my-2 ${compact ? 'text-xl md:text-2xl leading-relaxed' : 'text-2xl md:text-3xl leading-loose md:leading-[2.5]'}`}
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: displayLine }}
              />
            );
          }

          // Apply highlights and notes first on clean line text
          let styledLine = applyHighlightsAndNotesToHtml(line, highlights, notes);

          // For lines that are mostly English but contain Arabic words, style the Arabic words without corrupting mark/html tags
          styledLine = styledLine.replace(
            /(<mark[^>]*>[\s\S]*?<\/mark>)|(<[^>]+>)|([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
            (match, markTag, htmlTag, arabicText) => {
              if (markTag || htmlTag) return match;
              if (arabicText) {
                const cleaned = arabicText.replace(/\u064E\u0670/g, '\u0670').replace(/\u0670\u064E/g, '\u0670');
                return `<span class="font-arabic text-arabic/90 leading-normal inline-block mx-1 ${compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}" dir="rtl">${cleaned}</span>`;
              }
              return match;
            }
          );

          const Tag = line.includes('<li') || line.includes('<ul') ? 'div' : 'p';

          return (
            <Tag
              key={idx}
              className={`text-reading whitespace-pre-wrap ${compact ? 'text-sm' : 'text-base md:text-lg'} ${line.includes('<li') ? '' : (compact ? 'leading-snug' : 'leading-relaxed')}`}
              dangerouslySetInnerHTML={{ __html: styledLine }}
            />
          );
        })}
      </div>

      {/* Frosted Glass Blur Lock Overlay for Lexicons */}
      {isLocked && (
        <div className="relative -mt-16 pt-16 pb-7 px-5 rounded-3xl bg-gradient-to-t from-background via-background/95 to-transparent border border-accent/20 text-center space-y-3.5 shadow-2xl backdrop-blur-md z-10">
          <div className="mx-auto size-11 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shadow-inner">
            <Lock className="size-5 text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-foreground font-serif">
              Unlock Complete Entry in <span className="text-accent">{dictName || "Lexicon"}</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upgrade to Al-Juthur Pro to unlock all 13 classical lexicons (including full 8-volume Lane's Lexicon & Lisan al-Arab).
            </p>
          </div>
          <div className="flex justify-center pt-1">
            <button
              onClick={onUpgradeClick || openPricingModal}
              className="px-5 py-2.5 rounded-xl bg-accent hover:from-accent hover:to-accent text-accent-foreground font-bold text-xs shadow-lg  transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>Upgrade to Pro ($3.99/mo)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

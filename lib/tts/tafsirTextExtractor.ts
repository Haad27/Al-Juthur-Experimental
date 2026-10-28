/**
 * lib/tts/tafsirTextExtractor.ts
 *
 * Strips HTML from raw tafsir text and splits it into language-tagged segments.
 * Arabic text inside ﴿…﴾ / {…} / «…» brackets, or bare Arabic Unicode runs,
 * is tagged "ar" so the TTS engine can voice-switch mid-utterance.
 */

import type { TtsLang } from "./langUtils";

export interface TtsSegment {
  text: string;
  lang: TtsLang;
}

// ── Arabic Unicode ranges ────────────────────────────────────────────────────
const AR_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const AR_BLOCK = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{3,}/;

// Brackets that typically wrap quoted Quranic ayahs
const BRACKET_RE =
  /(?:[{﴿«])([^\}﴾»]{5,}?)(?:[}﴾»])/gu;

// ── HTML stripping ───────────────────────────────────────────────────────────

/**
 * Remove HTML tags and collapse whitespace, returning plain readable text.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Core segmentation ────────────────────────────────────────────────────────

/**
 * Split `text` (already plain text, no HTML) into segments tagged with their
 * script language. Urdu tafsir with embedded Arabic quotations will produce
 * alternating ur/ar/ur segments.
 *
 * @param plainText  Strip HTML before calling this.
 * @param baseLang   The primary language of the tafsir (ar | ur | en).
 */
function segmentPlainText(plainText: string, baseLang: TtsLang): TtsSegment[] {
  if (!plainText.trim()) return [];

  // If the tafsir is already fully Arabic, return one segment
  if (baseLang === "ar") {
    return [{ text: plainText.trim(), lang: "ar" }];
  }

  const segments: TtsSegment[] = [];

  // We'll scan the text and detect Arabic runs (either bracketed or bare)
  let remaining = plainText;
  let cursor = 0;
  const len = remaining.length;

  while (cursor < len) {
    // 1. Look for the next bracketed Arabic quotation starting from cursor
    const slice = remaining.slice(cursor);

    // Try to find Arabic bracket at current position or ahead
    const bracketMatch = /([{﴿«])(.{5,}?)([}﴾»])/u.exec(slice);

    if (bracketMatch && bracketMatch.index !== undefined) {
      const beforeBracket = slice.slice(0, bracketMatch.index);

      // Emit base-language segment for text before the bracket
      if (beforeBracket.trim()) {
        // Check if the "before" text has substantial Arabic chars – if the tafsir is Urdu
        // the main body should be Urdu even if it contains a few Arabic letters
        segments.push({ text: beforeBracket.trim(), lang: baseLang });
      }

      // Inner bracket content – check it's actually Arabic
      const inner = bracketMatch[2].trim();
      const arChars = (inner.match(new RegExp(AR_CHAR.source, "g")) || []).length;
      const totalChars = inner.replace(/\s/g, "").length;

      if (arChars / Math.max(totalChars, 1) > 0.3) {
        // Emit Arabic segment (drop the bracket glyphs themselves)
        segments.push({ text: inner, lang: "ar" });
      } else {
        // Not really Arabic – treat as base language
        segments.push({ text: inner, lang: baseLang });
      }

      cursor += bracketMatch.index + bracketMatch[0].length;
    } else {
      // No more brackets — handle the tail
      // (At this point baseLang is guaranteed non-ar because ar returns early above)
      const tail = slice.trim();
      if (tail) {
        // Split tail further on bare Arabic runs embedded in Urdu/English text
        const tailSegs = splitOnBareArabicRuns(tail, baseLang);
        segments.push(...tailSegs);
      }
      break;
    }
  }

  // Merge consecutive same-language segments and filter empties
  return mergeSameLang(segments.filter((s) => s.text.trim().length > 0));
}

/**
 * For Urdu/English text that contains bare Arabic runs (no brackets),
 * split into alternating baseLang / ar segments.
 */
function splitOnBareArabicRuns(text: string, baseLang: TtsLang): TtsSegment[] {
  const result: TtsSegment[] = [];
  // Regex: match Arabic run of ≥4 chars (enough to be a standalone phrase)
  const arRunRe =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{4,}(?:[\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,})*/gu;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  // Reset lastIndex
  arRunRe.lastIndex = 0;

  while ((m = arRunRe.exec(text)) !== null) {
    if (m.index > lastIndex) {
      const before = text.slice(lastIndex, m.index).trim();
      if (before) result.push({ text: before, lang: baseLang });
    }
    result.push({ text: m[0].trim(), lang: "ar" });
    lastIndex = arRunRe.lastIndex;
  }
  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex).trim();
    if (rest) result.push({ text: rest, lang: baseLang });
  }

  return result.length > 0 ? result : [{ text, lang: baseLang }];
}

function mergeSameLang(segs: TtsSegment[]): TtsSegment[] {
  const out: TtsSegment[] = [];
  for (const seg of segs) {
    if (out.length > 0 && out[out.length - 1].lang === seg.lang) {
      out[out.length - 1] = {
        text: out[out.length - 1].text + " " + seg.text,
        lang: seg.lang,
      };
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

// ── Max utterance length (browser TTS engines truncate long strings) ─────────
const MAX_UTT_CHARS = 200;

function splitLongSegment(seg: TtsSegment): TtsSegment[] {
  if (seg.text.length <= MAX_UTT_CHARS) return [seg];

  // Split on sentence boundaries
  const sentences = seg.text.match(/[^.!?؟\n]+[.!?؟\n]*/g) || [seg.text];
  const out: TtsSegment[] = [];
  let buf = "";

  for (const s of sentences) {
    if ((buf + s).length > MAX_UTT_CHARS && buf.trim()) {
      out.push({ text: buf.trim(), lang: seg.lang });
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push({ text: buf.trim(), lang: seg.lang });
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Takes raw tafsir HTML (as stored in the DB / API), strips HTML,
 * and returns TTS-ready segments with language tags.
 */
export function extractTafsirSegments(
  rawHtmlOrText: string,
  baseLang: TtsLang
): TtsSegment[] {
  if (!rawHtmlOrText) return [];

  const plain = stripHtml(rawHtmlOrText);
  const segments = segmentPlainText(plain, baseLang);

  // Further split any segment that exceeds browser character limits
  return segments.flatMap(splitLongSegment);
}

/**
 * Normalizes text for Quran & Tafsir searching by removing diacritics,
 * common prefixes (Al-, An-, As-, Surah, Tafsir, etc.), spaces, hyphens, and punctuation.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Remove Arabic diacritics / tashkeel & alef wasla / maddah
    .replace(/[\u064B-\u065F\u0670\u0671]/g, "")
    // Standardize Arabic letters
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    // Remove common prefix words (surah, surat, sura, tafsir)
    .replace(/\b(surah|surat|sura|tafsir)\b/gi, "")
    // Remove common article prefixes (al-, an-, as-, at-, ar-, az-, ad-, ash-, adh-, aal-, el-)
    .replace(/\b(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)[-\s]+/gi, "")
    // Handle fused prefixes like 'alfath' -> 'fath', 'albaqarah' -> 'baqarah'
    .replace(/^(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)(?=[a-z]{3,})/i, "")
    // Remove non-alphanumeric characters
    .replace(/[^a-z0-9\u0600-\u06FF]/gi, "")
    .trim();
}

/**
 * Levenshtein distance for fuzzy matching typos
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if query matches target via exact normalized inclusion, prefix match, or fuzzy typo match.
 */
export function isFuzzyMatch(rawQuery: string, rawTarget: string): boolean {
  if (!rawQuery || !rawTarget) return false;

  const query = normalizeSearchText(rawQuery);
  const target = normalizeSearchText(rawTarget);

  if (!query) return false;

  // Direct normalized substring match
  if (target.includes(query) || query.includes(target)) return true;

  // Also check raw lowercase substring match
  const rawQ = rawQuery.trim().toLowerCase();
  const rawT = rawTarget.trim().toLowerCase();
  if (rawT.includes(rawQ)) return true;

  // If query is at least 3 chars long, check fuzzy Levenshtein distance
  if (query.length >= 3) {
    const targetWords = rawTarget.split(/[\s\-]+/);
    for (const word of targetWords) {
      const normWord = normalizeSearchText(word);
      if (normWord.length >= 3) {
        const dist = levenshteinDistance(query, normWord);
        const maxAllowed = query.length <= 5 ? 1 : 2;
        if (dist <= maxAllowed) return true;
      }
    }

    if (target.length >= 3) {
      const fullDist = levenshteinDistance(query, target);
      if (fullDist <= (query.length <= 5 ? 1 : 2)) return true;
    }
  }

  return false;
}

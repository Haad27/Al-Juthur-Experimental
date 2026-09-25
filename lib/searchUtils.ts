/**
 * Converts Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩ / ۰۱۲۳۴۵۶۷۸۹) to standard Western digits (0-9).
 */
export function convertEasternToWesternDigits(str: string): string {
  if (!str) return "";
  return str
    .replace(/[٠۰]/g, "0")
    .replace(/[١۱]/g, "1")
    .replace(/[٢۲]/g, "2")
    .replace(/[٣۳]/g, "3")
    .replace(/[٤۴]/g, "4")
    .replace(/[٥۵]/g, "5")
    .replace(/[٦۶]/g, "6")
    .replace(/[٧۷]/g, "7")
    .replace(/[٨۸]/g, "8")
    .replace(/[٩۹]/g, "9");
}

/**
 * Standardizes Arabic characters, strips diacritics/tashkeel,
 * and removes punctuation / brackets.
 */
export function cleanPunctuation(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    // Remove Arabic diacritics / tashkeel & alef wasla / maddah
    .replace(/[\u064B-\u065F\u0670\u0671]/g, "")
    // Standardize Arabic letters
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    // Replace punctuation with spaces
    .replace(/[''`'"\-–—:;,.()\[\]\/{}\\_#?!\*&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phonetic reduction for Islamic terms, Arabic transliteration variations,
 * and common user spelling differences (e.g. "as saddi" -> "sadi", "surah jinn" -> "jin", "ibhn kaseer" -> "ibn kasir").
 */
export function phoneticReduce(str: string): string {
  if (!str) return "";
  let s = cleanPunctuation(str);

  // Strip common honorific / descriptive prefixes at word boundaries
  s = s.replace(/\b(surah|surat|sura|soorah|tafsir|tafseer|sheikh|shaykh|imam|hafiz|mufti|maulana|allamah|allama|dr|doctor|ustadh)\b/gi, " ");

  // Strip definite articles at word boundaries: al-, an-, as-, at-, ar-, az-, ad-, ash-, adh-, aal-, el-, etc.
  s = s.replace(/\b(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)\s+/gi, " ");
  s = s.replace(/\b(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)(?=[a-z]{3,})/gi, "");

  // Common typo fixes
  s = s.replace(/\bibhn\b/gi, "ibn");
  s = s.replace(/ibhn/gi, "ibn");

  // Transliteration consonant equivalences (preserve 'sh', 's', 'z', etc.)
  s = s.replace(/c(?=[eiy])/gi, "j");
  s = s.replace(/c/g, "k");
  s = s.replace(/th/g, "s");      // Kathir <-> Kaseer, Kauthar <-> Kausar, Hadith <-> Hadis
  s = s.replace(/kh/g, "k");      // Kahf <-> Kahef, Bukhari <-> Bukari
  s = s.replace(/dh/g, "z");      // Adh-Dhariyat <-> Az-Zariyat
  s = s.replace(/zh/g, "z");
  s = s.replace(/gh/g, "g");
  s = s.replace(/ph/g, "f");
  s = s.replace(/dj/g, "j");
  s = s.replace(/q/g, "k");       // Baqarah <-> Bakarah, Furqan <-> Furkan, Qurtubi <-> Kurtubi

  // Vowel normalization & trailing reductions
  s = s.replace(/ee/g, "i");
  s = s.replace(/ea/g, "i");
  s = s.replace(/ie/g, "i");
  s = s.replace(/ei/g, "i");
  s = s.replace(/ey/g, "ai");
  s = s.replace(/ay/g, "ai");
  s = s.replace(/y\b/g, "i");
  s = s.replace(/y(?=[bcdfghjklmnpqrstvwxz])/g, "i");
  s = s.replace(/oo/g, "u");
  s = s.replace(/ou/g, "u");
  s = s.replace(/aa+/g, "a");
  s = s.replace(/e\b/g, "i");     // Trailing 'e' (saade -> sadi, saaade -> sadi)
  s = s.replace(/e/g, "a");      // Middle 'e' (rehman -> rahman, kehf -> kahf)
  s = s.replace(/o/g, "u");

  // Kahef / Kahaf -> Kahf
  s = s.replace(/h[aieou](?=[bcdfghjklmnpqrstvwxz])/g, "h");

  // Drop terminal 'h' (ta marbuta transliteration: baqarah -> baqara -> bakar)
  s = s.replace(/h\b/g, "");

  // Collapse consecutive identical letters (saddi -> sadi, jinn -> jin, kaseer -> kasir)
  s = s.replace(/(.)\1+/g, "$1");

  // Keep alphanumeric + Arabic
  s = s.replace(/[^a-z0-9\s\u0600-\u06FF]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes text for Quran & Tafsir searching by removing diacritics,
 * common prefixes (Al-, An-, As-, Surah, Tafsir, etc.), spaces, hyphens, and punctuation.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return phoneticReduce(text).replace(/\s+/g, "");
}

/**
 * Levenshtein distance for fuzzy matching typos.
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
 * Calculates a match score (0 - 100) between a search query and a target string.
 * - 100: Exact match or canonical equivalence
 * - 95: Spaceless match
 * - 90: Single whole-token exact match
 * - 80: Prefix match
 * - 75: Multi-token prefix match
 * - 60: Substring match
 * - 50: Strict fuzzy token match (5+ chars only)
 * - 0: No match
 */
export function getMatchScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const qTrim = query.trim().toLowerCase();
  const tTrim = target.trim().toLowerCase();
  if (!qTrim || !tTrim) return 0;

  // 1. Literal exact match
  if (qTrim === tTrim) return 100;

  // 2. Clean punctuation equality
  const qClean = cleanPunctuation(qTrim);
  const tClean = cleanPunctuation(tTrim);
  if (qClean && qClean === tClean) return 100;

  // 3. Phonetic / canonical reduction equality
  const qPhone = phoneticReduce(qTrim);
  const tPhone = phoneticReduce(tTrim);
  if (qPhone && qPhone === tPhone) return 100;

  // 4. Spaceless clean or phonetic equality
  const qPhoneNoSpace = qPhone.replace(/\s+/g, "");
  const tPhoneNoSpace = tPhone.replace(/\s+/g, "");
  if (qPhoneNoSpace && qPhoneNoSpace === tPhoneNoSpace) return 95;

  const qCleanNoSpace = qClean.replace(/\s+/g, "");
  const tCleanNoSpace = tClean.replace(/\s+/g, "");
  if (qCleanNoSpace && qCleanNoSpace === tCleanNoSpace) return 95;

  // Check if target contains query as a whole exact word / token
  const qTokens = qPhone.split(" ").filter(Boolean);
  const tTokens = tPhone.split(" ").filter(Boolean);

  if (qTokens.length === 1 && tTokens.includes(qTokens[0])) {
    return 90;
  }

  // 5. Prefix match
  if (tClean.startsWith(qClean) || (qPhone.length >= 2 && tPhone.startsWith(qPhone)) || (qPhoneNoSpace.length >= 2 && tPhoneNoSpace.startsWith(qPhoneNoSpace))) {
    return 80;
  }

  // Multi-token prefix match (e.g. "ibn k" matches "ibn kathir")
  if (qTokens.length > 0 && qTokens.length <= tTokens.length) {
    const isTokensPrefix = qTokens.every((qTok) => tTokens.some((tTok) => tTok.startsWith(qTok)));
    if (isTokensPrefix) return 75;
  }

  // 6. Substring match
  if (tClean.includes(qClean) || (qPhone.length >= 3 && tPhone.includes(qPhone))) {
    return 60;
  }

  // 7. Token inclusion match (all query tokens found in target)
  if (qTokens.length > 0) {
    const allTokensFound = qTokens.every((qTok) =>
      tTokens.some((tTok) => {
        if (tTok === qTok) return true;
        if (tTok.startsWith(qTok)) return true;
        // Strictly only allow 1 typo if token is 5+ characters long
        if (qTok.length >= 5 && tTok.length >= 5) {
          const maxDist = Math.min(qTok.length, tTok.length) <= 7 ? 1 : 2;
          return levenshteinDistance(qTok, tTok) <= maxDist;
        }
        return false;
      })
    );
    if (allTokensFound) return 50;
  }

  return 0;
}

/**
 * Checks if query matches target via smart scoring.
 */
export function isFuzzyMatch(rawQuery: string, rawTarget: string): boolean {
  if (!rawQuery || !rawTarget) return false;
  return getMatchScore(rawQuery, rawTarget) > 0;
}

/**
 * Parses user input for potential Surah and Ayah numbers (e.g. "2:255", "surah 2 ayah 255", "18:10", "24").
 */
export function parseSurahVerseReference(query: string): { surahNumber?: number; ayahNumber?: number } | null {
  if (!query) return null;
  const clean = convertEasternToWesternDigits(query.trim().toLowerCase());

  // Pattern 1: "2:255", "surah 2:255", "2: 255", "18 : 10"
  const colonMatch = clean.match(/^(?:surah|sura)?\s*(\d{1,3})\s*:\s*(\d{1,3})$/i);
  if (colonMatch) {
    const s = parseInt(colonMatch[1], 10);
    const a = parseInt(colonMatch[2], 10);
    if (s >= 1 && s <= 114) {
      return { surahNumber: s, ayahNumber: a };
    }
  }

  // Pattern 2: "surah 2 ayah 255", "surah 2 verse 255", "surah 2, 255"
  const wordsMatch = clean.match(/^(?:surah|sura)?\s*(\d{1,3})\s*(?:ayah|verse|,)\s*(\d{1,3})$/i);
  if (wordsMatch) {
    const s = parseInt(wordsMatch[1], 10);
    const a = parseInt(wordsMatch[2], 10);
    if (s >= 1 && s <= 114) {
      return { surahNumber: s, ayahNumber: a };
    }
  }

  // Pattern 3: "surah 2 255" (space separated two numbers)
  const spaceMatch = clean.match(/^(?:surah|sura)\s+(\d{1,3})\s+(\d{1,3})$/i);
  if (spaceMatch) {
    const s = parseInt(spaceMatch[1], 10);
    const a = parseInt(spaceMatch[2], 10);
    if (s >= 1 && s <= 114) {
      return { surahNumber: s, ayahNumber: a };
    }
  }

  // Pattern 4: Pure number or "surah 55", "#55", "55"
  const pureNumMatch = clean.match(/^(?:surah|sura|#)?\s*(\d{1,3})$/i);
  if (pureNumMatch) {
    const s = parseInt(pureNumMatch[1], 10);
    if (s >= 1 && s <= 114) {
      return { surahNumber: s };
    }
  }

  return null;
}

/**
 * Checks if a search query is an exact match for a Surah.
 */
export function isExactSurahMatch(
  query: string,
  surah: { number: number; name?: string; englishName: string; englishNameTranslation?: string }
): boolean {
  if (!query || !query.trim()) return false;
  const q = query.trim();

  // 1. Direct number equality
  const converted = convertEasternToWesternDigits(q);
  if (surah.number.toString() === converted) return true;

  const ref = parseSurahVerseReference(q);
  if (ref && ref.surahNumber === surah.number) return true;

  if (getMatchScore(q, surah.englishName) >= 90) return true;
  if (surah.name && getMatchScore(q, surah.name) >= 90) return true;
  if (surah.englishNameTranslation && getMatchScore(q, surah.englishNameTranslation) >= 90) return true;

  return false;
}

/**
 * Checks if a search query matches a Surah by number, verse reference (2:255),
 * English name, translation, Arabic name, or phonetic variation ("al nuur", "noor", "kahaf", "baqara").
 */
export function isSurahMatch(
  rawQuery: string,
  surah: { number: number; name?: string; englishName: string; englishNameTranslation?: string }
): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  const query = rawQuery.trim();

  // 1. Direct surah / ayah reference ("2:255", "surah 24", "#24", "24")
  const ref = parseSurahVerseReference(query);
  if (ref && ref.surahNumber) {
    if (surah.number === ref.surahNumber) return true;
  }

  // 2. Direct number equality ("24" matches Surah 24, "٢٤" matches Surah 24)
  const convertedQuery = convertEasternToWesternDigits(query);
  if (surah.number.toString() === convertedQuery) return true;

  // 3. Name or verse pattern like "baqarah 255" or "al nuur 35"
  const nameWithVerseMatch = query.match(/^([a-zA-Z\s\-']+?)\s+(?:\d{1,3})$/);
  const searchNamePart = nameWithVerseMatch ? nameWithVerseMatch[1].trim() : query;

  // 4. Scoring across English name, translation, Arabic name
  if (getMatchScore(searchNamePart, surah.englishName) > 0) return true;
  if (surah.name && getMatchScore(searchNamePart, surah.name) > 0) return true;
  if (surah.englishNameTranslation && getMatchScore(searchNamePart, surah.englishNameTranslation) > 0) return true;

  return false;
}

/**
 * Filters an array of Surahs with high precision. If top-tier (exact/canonical) matches exist,
 * returns ONLY the top-tier matches. Otherwise returns all matching items sorted by relevance.
 */
export function filterSurahs<
  T extends { number: number; name?: string; englishName: string; englishNameTranslation?: string }
>(query: string, surahs: T[]): T[] {
  if (!query || !query.trim()) return surahs;

  const scored = surahs.map((surah) => {
    let score = 0;
    const ref = parseSurahVerseReference(query);
    if (ref && ref.surahNumber === surah.number) {
      score = 100;
    } else {
      const convertedQuery = convertEasternToWesternDigits(query.trim());
      if (surah.number.toString() === convertedQuery) {
        score = 100;
      } else {
        const nameWithVerseMatch = query.match(/^([a-zA-Z\s\-']+?)\s+(?:\d{1,3})$/);
        const searchNamePart = nameWithVerseMatch ? nameWithVerseMatch[1].trim() : query;

        const s1 = getMatchScore(searchNamePart, surah.englishName);
        const s2 = surah.name ? getMatchScore(searchNamePart, surah.name) : 0;
        const s3 = surah.englishNameTranslation ? getMatchScore(searchNamePart, surah.englishNameTranslation) : 0;
        score = Math.max(s1, s2, s3);
      }
    }
    return { surah, score };
  });

  const matching = scored.filter((item) => item.score > 0);
  if (matching.length === 0) return [];

  const maxScore = Math.max(...matching.map((m) => m.score));
  // If top-tier exact match is found, return only exact matches to avoid unrelated clutter
  if (maxScore >= 90) {
    return matching.filter((m) => m.score >= 90).map((m) => m.surah);
  }

  return matching.sort((a, b) => b.score - a.score).map((m) => m.surah);
}

/**
 * Finds the index of a Surah by number (Western or Eastern Arabic digits) or fuzzy name match.
 */
export function findSurahMatchIndex(
  rawQuery: string,
  surahs: { number: number; name: string; englishName: string; englishNameTranslation: string }[]
): number {
  if (!rawQuery || !rawQuery.trim()) return -1;
  const trimmed = rawQuery.trim();

  // Check surah / verse reference first
  const ref = parseSurahVerseReference(trimmed);
  if (ref && ref.surahNumber) {
    const idx = surahs.findIndex((s) => s.number === ref.surahNumber);
    if (idx !== -1) return idx;
  }

  // Check exact match first
  const exactIdx = surahs.findIndex((s) => isExactSurahMatch(trimmed, s));
  if (exactIdx !== -1) return exactIdx;

  // Check best scored match
  const filtered = filterSurahs(trimmed, surahs);
  if (filtered.length > 0) {
    return surahs.findIndex((s) => s.number === filtered[0].number);
  }

  return -1;
}

/**
 * Checks if a search query is an exact match for a Tafsir title or author.
 */
export function isExactTafsirMatch(
  query: string,
  author: { name: string; authorName?: string },
  language?: { name: string } | null
): boolean {
  if (!query || !query.trim()) return false;
  if (getMatchScore(query, author.name) >= 90) return true;
  if (author.authorName && getMatchScore(query, author.authorName) >= 90) return true;
  if (language?.name) {
    const combined = `${author.name} ${language.name}`;
    if (getMatchScore(query, combined) >= 90) return true;
  }
  return false;
}

/**
 * Checks if a search query matches a Tafsir author, book name, language, or era.
 */
export function isTafsirMatch(
  rawQuery: string,
  author: { name: string; authorName?: string; era?: string; difficulty?: string; tags?: { name: string }[] },
  language?: { name: string } | null
): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = rawQuery.trim();

  if (getMatchScore(q, author.name) > 0) return true;
  if (author.authorName && getMatchScore(q, author.authorName) > 0) return true;
  if (language?.name && getMatchScore(q, language.name) > 0) return true;
  if (author.era && getMatchScore(q, author.era) > 0) return true;
  if (author.tags && author.tags.some((t) => getMatchScore(q, t.name) > 0)) return true;

  const combined = [author.name, author.authorName, language?.name].filter(Boolean).join(" ");
  if (getMatchScore(q, combined) > 0) return true;

  return false;
}

/**
 * Filters a list of Tafsir items with high precision. If top-tier (exact/canonical) matches exist,
 * returns ONLY top-tier matches so unrelated tafsirs are excluded.
 */
export function filterTafsirs<
  T extends {
    author: { name: string; authorName?: string; era?: string; difficulty?: string; tags?: { name: string }[] };
    language?: { name: string } | null;
    languageName?: string;
    langName?: string;
  }
>(query: string, items: T[]): T[] {
  if (!query || !query.trim()) return items;

  const getLangName = (item: T) => {
    return item.language?.name || item.languageName || item.langName || "";
  };

  const scored = items.map((item) => {
    const langName = getLangName(item);
    const s1 = getMatchScore(query, item.author.name);
    const s2 = item.author.authorName ? getMatchScore(query, item.author.authorName) : 0;
    const s3 = langName ? getMatchScore(query, langName) : 0;
    const combined = [item.author.name, item.author.authorName, langName].filter(Boolean).join(" ");
    const s4 = getMatchScore(query, combined);
    const s5 = item.author.tags ? Math.max(0, ...item.author.tags.map(t => getMatchScore(query, t.name))) : 0;
    
    const score = Math.max(s1, s2, s3, s4, s5);
    return { item, score };
  });

  const matching = scored.filter((s) => s.score > 0);
  if (matching.length === 0) return [];

  const maxScore = Math.max(...matching.map((m) => m.score));
  // If top-tier (>= 90 exact or canonical matches) exist, return ONLY those to keep results clean and relevant
  if (maxScore >= 90) {
    return matching.filter((m) => m.score >= 90).map((m) => m.item);
  }

  return matching.sort((a, b) => b.score - a.score).map((m) => m.item);
}

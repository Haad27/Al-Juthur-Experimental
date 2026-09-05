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
    .replace(/ى/g, "ي")
    // Replace punctuation with spaces
    .replace(/[''`'"\-–—:;,.()\[\]\/{}\\_#?!\*&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phonetic reduction for Islamic terms, Arabic transliteration variations,
 * and common user typos (e.g. "ibhn kaseer" -> "ibnkasir", "al nuur" -> "nur").
 */
export function phoneticReduce(str: string): string {
  if (!str) return "";
  let s = cleanPunctuation(str);

  // Strip common honorific / descriptive prefixes
  s = s.replace(/\b(surah|surat|sura|soorah|tafsir|tafseer|sheikh|shaykh|imam|hafiz|mufti|maulana|allamah|dr|doctor)\b/gi, " ");

  // Strip definite articles at word boundaries: al-, an-, as-, at-, ar-, az-, ad-, ash-, adh-, aal-, el-, etc.
  s = s.replace(/\b(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)\s+/gi, " ");
  s = s.replace(/\b(al|an|as|at|ar|az|ad|ash|adh|aal|el|en|es|et|er|ez|ed|esh|edh)(?=[a-z]{3,})/gi, "");

  // Common typo fixes
  s = s.replace(/\bibhn\b/gi, "ibn");
  s = s.replace(/ibhn/gi, "ibn");

  // Transliteration consonant equivalences
  // Soft 'c' (e.g. Turkish "celaleyn" -> "jelaleyn")
  s = s.replace(/c(?=[eiy])/gi, "j");
  s = s.replace(/c/g, "k");
  s = s.replace(/th/g, "s");      // Kathir <-> Kaseer, Kauthar <-> Kausar, Hadith <-> Hadis
  s = s.replace(/kh/g, "k");      // Kahf <-> Kahef, Bukhari <-> Bukari
  s = s.replace(/dh/g, "z");      // Adh-Dhariyat <-> Az-Zariyat
  s = s.replace(/zh/g, "z");
  s = s.replace(/sh/g, "s");
  s = s.replace(/gh/g, "g");
  s = s.replace(/ph/g, "f");
  s = s.replace(/dj/g, "j");
  s = s.replace(/q/g, "k");       // Baqarah <-> Bakarah, Furqan <-> Furkan, Qurtubi <-> Kurtubi
  s = s.replace(/w/g, "v");       // Thanwi <-> Thanvi

  // Vowel normalization
  s = s.replace(/ee/g, "i");      // Kaseer <-> Kasir
  s = s.replace(/ea/g, "i");
  s = s.replace(/ie/g, "i");
  s = s.replace(/y/g, "i");
  s = s.replace(/oo/g, "u");      // Noor <-> Nuur <-> Nur
  s = s.replace(/ou/g, "u");
  s = s.replace(/aa/g, "a");
  s = s.replace(/e/g, "i");       // Kaser <-> Kasir
  s = s.replace(/o/g, "u");

  // Drop terminal 'h' (ta marbuta transliteration: baqarah -> baqara -> bakar)
  s = s.replace(/h\b/g, "");

  // Collapse consecutive identical letters (e.g. "kattab" -> "katab", "kaseer" -> "kasir")
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
 * Checks if query matches target via exact normalized inclusion,
 * phonetic transliteration matching, spaceless matching, or fuzzy typo distance.
 */
export function isFuzzyMatch(rawQuery: string, rawTarget: string): boolean {
  if (!rawQuery || !rawTarget) return false;

  const qRaw = rawQuery.trim().toLowerCase();
  const tRaw = rawTarget.trim().toLowerCase();
  if (tRaw.includes(qRaw)) return true;

  // Clean strings
  const qClean = cleanPunctuation(rawQuery);
  const tClean = cleanPunctuation(rawTarget);
  if (!qClean || !tClean) return false;

  if (tClean.includes(qClean)) return true;

  // Spaceless clean match (e.g. "ibnkasir" matches "ibn kathir")
  const qSpaceless = qClean.replace(/\s+/g, "");
  const tSpaceless = tClean.replace(/\s+/g, "");
  if (tSpaceless.includes(qSpaceless) || qSpaceless.includes(tSpaceless)) return true;

  // Phonetic matching
  const qPhone = phoneticReduce(rawQuery);
  const tPhone = phoneticReduce(rawTarget);

  if (qPhone && tPhone) {
    if (tPhone.includes(qPhone)) return true;
    const qPhoneNoSpace = qPhone.replace(/\s+/g, "");
    const tPhoneNoSpace = tPhone.replace(/\s+/g, "");
    if (tPhoneNoSpace.includes(qPhoneNoSpace) || qPhoneNoSpace.includes(tPhoneNoSpace)) return true;

    // Word-by-word token matching
    const qTokens = qPhone.split(" ").filter((t) => t.length >= 2);
    const tTokens = tPhone.split(" ").filter((t) => t.length >= 2);

    if (qTokens.length > 0) {
      const allTokensMatch = qTokens.every((qTok) =>
        tTokens.some((tTok) => {
          if (tTok.includes(qTok) || qTok.includes(tTok)) return true;
          if (qTok.length >= 3 && tTok.length >= 3) {
            const maxDist = Math.min(qTok.length, tTok.length) <= 4 ? 1 : 2;
            return levenshteinDistance(qTok, tTok) <= maxDist;
          }
          return false;
        })
      );
      if (allTokensMatch) return true;
    }
  }

  // Levenshtein on whole spaceless string if query is 3+ chars
  if (qSpaceless.length >= 3 && tSpaceless.length >= 3) {
    const maxDist = qSpaceless.length <= 5 ? 1 : 2;
    if (levenshteinDistance(qSpaceless, tSpaceless) <= maxDist) return true;
  }

  return false;
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

  // 4. Fuzzy / phonetic matching across English name, translation, Arabic name
  if (isFuzzyMatch(searchNamePart, surah.englishName)) return true;
  if (surah.englishNameTranslation && isFuzzyMatch(searchNamePart, surah.englishNameTranslation)) return true;
  if (surah.name && isFuzzyMatch(searchNamePart, surah.name)) return true;

  return false;
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

  return surahs.findIndex((s) => isSurahMatch(trimmed, s));
}

/**
 * Checks if a search query matches a Tafsir author, book name, language, or era
 * using phonetic transliteration and typo tolerance (e.g. "ibhn kaseer", "ibnkasir", "kaseer").
 */
export function isTafsirMatch(
  rawQuery: string,
  author: { name: string; authorName?: string; era?: string; difficulty?: string; tags?: { name: string }[] },
  language?: { name: string }
): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;
  const q = rawQuery.trim();

  // Target candidate fields
  const targets = [
    author.name,
    author.authorName,
    author.era,
    language?.name,
    ...(author.tags ? author.tags.map((t) => t.name) : []),
  ].filter(Boolean) as string[];

  // 1. Direct match on any field
  for (const t of targets) {
    if (isFuzzyMatch(q, t)) return true;
  }

  // 2. Multi-word composite match (e.g. "english ibn kathir", "classical kathir")
  const combined = targets.join(" ");
  if (isFuzzyMatch(q, combined)) return true;

  return false;
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Types
export interface DictionaryInfo {
  id: number;
  ident: string;
  name: string;
  info: string;
  is_hi_capable: boolean;
  ar_en: boolean;
  link: string;
}

export interface WordMorphology {
  surah: number;
  ayah: number;
  wordIndex: number;
  word: string;
  root: string | null;
  lemma: string | null;
  stem: string | null;
}

export interface StructuredLaneEntry {
  id: number;
  root: string;
  root_buckwalter: string;
  definition_en: string | null;
  summary_en: string | null;
  summary_tr: string | null;
  quran_frequency: number;
  morphological_forms: Array<{
    form_pattern: string;
    form_arabic: string;
    form_name: string;
    form_category: string;
    example_word: string;
    occurrences: number;
  }>;
}

export interface LexiconEntry {
  dictId: number;
  dictName: string;
  dictIdent: string;
  isEnglish: boolean;
  definitions: string[];
}

export interface RootLexiconResult {
  root: string;
  normalizedRoot: string;
  structuredLane: StructuredLaneEntry | null;
  entries: LexiconEntry[];
}

// Singleton database connections for Next.js HMR
const globalForDb = globalThis as unknown as {
  lexiconsDb: Database.Database | undefined;
  wordRootDb: Database.Database | undefined;
  structuredLaneCache: StructuredLaneEntry[] | undefined;
  surahWordsCache: Record<number, any> | undefined;
};

function getLexiconsDb(): Database.Database {
  if (!globalForDb.lexiconsDb) {
    const dbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'arabic_lexicons.sqlite');
    globalForDb.lexiconsDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  }
  return globalForDb.lexiconsDb;
}

function getWordRootDb(): Database.Database {
  if (!globalForDb.wordRootDb) {
    const dbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'word-root.db');
    globalForDb.wordRootDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  }
  return globalForDb.wordRootDb;
}

function getStructuredLaneData(): StructuredLaneEntry[] {
  if (!globalForDb.structuredLaneCache) {
    try {
      const jsonPath = path.join(
        process.cwd(),
        'database',
        'lexicon',
        'data',
        'quran-arabic-roots-lane-lexicon-main',
        'quran_arabic_roots_lane_lexicon_2026-02-12.json'
      );
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        globalForDb.structuredLaneCache = parsed.roots || [];
      } else {
        globalForDb.structuredLaneCache = [];
      }
    } catch (e) {
      console.error('Error loading structured Lane JSON:', e);
      globalForDb.structuredLaneCache = [];
    }
  }
  return globalForDb.structuredLaneCache || [];
}

/**
 * Strips Arabic diacritics (Tashkeel / Harakat), Kashida, and standardizes spaces/Alif.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove Tashkeel & Harakat
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Remove Tatweel/Kashida
    .replace(/\u0640/g, '')
    // Standardize Alif forms
    .replace(/[أإآء]/g, 'ا')
    .trim();
}

/**
 * Normalizes a root into contiguous letters (e.g., 'كتب') and spaced letters (e.g., 'ك ت ب').
 */
export function normalizeRootVariants(root: string): { compact: string; spaced: string; raw: string } {
  const clean = root
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .trim();
  
  // Extract Arabic characters
  const chars = clean.replace(/\s+/g, '').split('');
  return {
    raw: clean,
    compact: chars.join(''),
    spaced: chars.join(' '),
  };
}

export interface PdfDictionaryInfo {
  id: string;
  name: string;
  author: string;
  language: 'English' | 'Urdu';
  filePath: string;
  sizeMb: string;
  description: string;
}

/**
 * Returns list of PDF reference lexicons available in database/pdf/lexicon
 */
export function getPdfDictionaries(): PdfDictionaryInfo[] {
  return [
    {
      id: 'pdf-abdel-haleem',
      name: "Arabic-English Dictionary of Qur'anic Usage",
      author: 'Elsaid M. Badawi & Muhammad Abdel Haleem (with Nouman Ali Khan notes)',
      language: 'English',
      filePath: 'english/(Nouman ali khan) - Muhammad Abdel Haleem Arabic-English-Dictionary-Quranic.pdf',
      sizeMb: '8.7 MB',
      description: 'Comprehensive modern Arabic-English dictionary of Quranic vocabulary and contextual nuances.'
    },
    {
      id: 'pdf-abdul-mannan',
      name: 'Dictionary of the Holy Quran',
      author: 'Abdul Mannan Omar',
      language: 'English',
      filePath: 'english/Dictionary of Quran by Abdul Manan omar .pdf',
      sizeMb: '4.9 MB',
      description: 'Classic English reference work mapping Quranic root words to classical Arabic lexicon meanings.'
    },
    {
      id: 'pdf-lughatul-quran-en',
      name: 'Lughat-ul-Quran Dictionary',
      author: 'Scholarly Collective',
      language: 'English',
      filePath: 'english/lughatul quran dictionary.pdf',
      sizeMb: '18.3 MB',
      description: 'Detailed English vocabulary reference and root guide for study of classical Quranic Arabic.'
    },
    {
      id: 'pdf-lutf-ur-rahman-ur',
      name: 'Quranic Dictionary (لغات القرآن)',
      author: 'Maulana Lutf-ur-Rahman (مولانا لطف الرحمن)',
      language: 'Urdu',
      filePath: 'urdu/Quranic Dictionary By Lutf ur Rahman.pdf',
      sizeMb: '71.2 MB',
      description: 'Extensive Urdu reference dictionary for Quranic root words, grammar, and classical meanings.'
    }
  ];
}

/**
 * Returns list of all available dictionaries
 */
export function getDictionaries(): DictionaryInfo[] {
  return [
    { id: 1, ident: 'lane', name: "Lane's Lexicon", info: '', is_hi_capable: true, ar_en: true, link: '' },
    { id: 2, ident: 'lisanularab', name: 'Lisan al-Arab', info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 3, ident: 'mujamul_ghoni', name: "Mu'jam al-Ghani", info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 4, ident: 'mujamul_muashiroh', name: "Mu'jam al-Mu'ashira", info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 5, ident: 'mujamul_wasith', name: "Mu'jam al-Wasit", info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 6, ident: 'mujamul_muhith', name: 'Al-Qamus al-Muhit', info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 7, ident: 'quran', name: 'Quran Dictionary', info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 8, ident: 'ghoribulquran', name: 'Gharib al-Quran', info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 9, ident: 'mujamul_shihah', name: "Mu'jam al-Shihah", info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 10, ident: 'mufradat_alfajul_quran', name: 'Mufradat Alfaz al-Quran', info: '', is_hi_capable: true, ar_en: false, link: '' },
    { id: 11, ident: 'maqayeesul_luga', name: 'Maqayis al-Lughah', info: '', is_hi_capable: true, ar_en: false, link: '' }
  ];
}

function getMcpDb() {
  const dbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'quran.db');
  return new Database(dbPath, { readonly: true });
}

function getEnglishMorphologyDb() {
  const dbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'english_morphology.sqlite');
  return new Database(dbPath, { readonly: true });
}

export function getSurahWords(surah: number) {
  if (!globalForDb.surahWordsCache) {
    globalForDb.surahWordsCache = {};
  }
  if (globalForDb.surahWordsCache[surah]) {
    return globalForDb.surahWordsCache[surah];
  }
  try {
    const db = getMcpDb();
    const rows = db.prepare(`
      SELECT 
        r.ayahNo,
        r.wordNo, 
        r.word as rasmWord, 
        s.root, 
        c.sarf, 
        i.irabMushakkal
      FROM word_content_rasm r
      LEFT JOIN word_statistics s ON r.surahNo = s.surahNo AND r.ayahNo = s.ayahNo AND r.wordNo = s.wordNo
      LEFT JOIN word_content_sarf c ON r.surahNo = c.surahNo AND r.ayahNo = c.ayahNo AND r.wordNo = c.wordNo
      LEFT JOIN word_content_irab i ON r.surahNo = i.surahNo AND r.ayahNo = i.ayahNo AND r.wordNo = i.wordNo
      WHERE r.surahNo = ?
      ORDER BY r.ayahNo ASC, r.wordNo ASC
    `).all(surah) as any[];

    // Fetch English Morphology
    let engMorphMap: Record<string, string> = {};
    try {
      const engDb = getEnglishMorphologyDb();
      const engRows = engDb.prepare(`SELECT ayah, word, pos_tags FROM word_morphology WHERE surah = ?`).all(surah) as any[];
      for (const er of engRows) {
        engMorphMap[`${er.ayah}:${er.word}`] = er.pos_tags;
      }
    } catch (e) {
      console.error('Error fetching English morphology:', e);
    }

    const map: Record<number, any[]> = {};
    for (const r of rows) {
      if (!map[r.ayahNo]) map[r.ayahNo] = [];
      const normalizedWordIdx = (surah === 2 && r.ayahNo === 1 && r.wordNo === 5) ? 1 : r.wordNo;
      const engMorph = engMorphMap[`${r.ayahNo}:${normalizedWordIdx}`] || engMorphMap[`${r.ayahNo}:${r.wordNo}`];
      
      map[r.ayahNo].push({
        wordIndex: normalizedWordIdx,
        word: r.rasmWord,
        root: r.root || null,
        lemma: null,
        stem: engMorph || r.sarf || null, // Using stem for Sarf text, preferring English
        irab: engMorph ? null : (r.irabMushakkal || null), // Omit Arabic irab if we have English
      });
    }
    globalForDb.surahWordsCache[surah] = map;
    return map;
  } catch (err) {
    console.error('Error fetching surah words from MCP:', err);
    return {};
  }
}

export function getAyahWords(surah: number, ayah: number) {
  if (!globalForDb.surahWordsCache?.[surah]) {
    getSurahWords(surah);
  }
  if (globalForDb.surahWordsCache?.[surah]?.[ayah]) {
    return globalForDb.surahWordsCache[surah][ayah];
  }
  try {
    const db = getMcpDb();
    const rows = db.prepare(`
      SELECT 
        r.wordNo, 
        r.word as rasmWord, 
        s.root, 
        c.sarf, 
        i.irabMushakkal
      FROM word_content_rasm r
      LEFT JOIN word_statistics s ON r.surahNo = s.surahNo AND r.ayahNo = s.ayahNo AND r.wordNo = s.wordNo
      LEFT JOIN word_content_sarf c ON r.surahNo = c.surahNo AND r.ayahNo = c.ayahNo AND r.wordNo = c.wordNo
      LEFT JOIN word_content_irab i ON r.surahNo = i.surahNo AND r.ayahNo = i.ayahNo AND r.wordNo = i.wordNo
      WHERE r.surahNo = ? AND r.ayahNo = ?
      ORDER BY r.wordNo ASC
    `).all(surah, ayah) as any[];

    let engMorphMap: Record<string, string> = {};
    try {
      const engDb = getEnglishMorphologyDb();
      const engRows = engDb.prepare(`SELECT word, pos_tags FROM word_morphology WHERE surah = ? AND ayah = ?`).all(surah, ayah) as any[];
      for (const er of engRows) {
        engMorphMap[er.word] = er.pos_tags;
      }
    } catch (e) { }

    return rows.map((r) => {
      const normalizedWordIdx = (surah === 2 && ayah === 1 && r.wordNo === 5) ? 1 : r.wordNo;
      const engMorph = engMorphMap[normalizedWordIdx] || engMorphMap[r.wordNo];
      return {
        wordIndex: normalizedWordIdx,
        word: r.rasmWord,
        root: r.root || null,
        lemma: null,
        stem: engMorph || r.sarf || null, // repurposing stem field for sarf text
        irab: engMorph ? null : (r.irabMushakkal || null),
      };
    });
  } catch (err) {
    console.error('Error fetching ayah words from MCP:', err);
    return [];
  }
}

/**
 * Get morphology & root for a specific word in Quran
 */
export function getWordMorphology(surah: number, ayah: number, wordIndex: number): WordMorphology | null {
  const words = getAyahWords(surah, ayah);
  const word = words.find((w: any) => w.wordIndex === wordIndex || (surah === 2 && ayah === 1 && (wordIndex === 5 || wordIndex === 1)));
  
  if (word) {
    return {
      surah,
      ayah,
      wordIndex: word.wordIndex,
      word: word.word,
      root: word.root,
      lemma: word.lemma,
      stem: word.stem, // Sarf text
      // @ts-ignore
      irab: word.irab
    };
  }
  return null;
}

/**
 * Search all roots by query string (supports Arabic root or English transliteration)
 */
export function searchRoots(query: string, limit = 50): string[] {
  if (!query || query.trim().length === 0) return [];
  const qClean = query.trim();
  const compact = qClean.replace(/\s+/g, '');
  
  const laneData = getStructuredLaneData();
  const matchedSet = new Set<string>();

  // Check structured lane data
  for (const item of laneData) {
    if (
      item.root === compact ||
      item.root.includes(compact) ||
      item.root_buckwalter.toLowerCase().includes(qClean.toLowerCase())
    ) {
      matchedSet.add(item.root);
      if (matchedSet.size >= limit) break;
    }
  }

  // Also search lanelexcon in sqlite
  try {
    const db = getLexiconsDb();
    const compactPattern = `%${compact}%`;
    const rows = db
      .prepare(
        `SELECT word FROM lanelexcon 
         WHERE is_root = 1 AND word LIKE ? 
         LIMIT ?`
      )
      .all(compactPattern, limit) as { word: string }[];

    for (const r of rows) {
      const cleanRoot = r.word.replace(/\s+/g, '');
      matchedSet.add(cleanRoot);
    }
  } catch (err) {
    console.error('Error searching roots in sqlite:', err);
  }

  return Array.from(matchedSet).slice(0, limit);
}

/**
 * Fetches comprehensive lexicon entries across all dictionaries for a given root.
 */
export function getLexiconEntriesForRoot(rootQuery: string): RootLexiconResult {
  const variants = normalizeRootVariants(rootQuery);
  const dicts = getDictionaries();
  const dictMap = new Map<number, DictionaryInfo>();
  dicts.forEach((d) => dictMap.set(d.id, d));

  // 1. Structured Lane's Lexicon
  const laneList = getStructuredLaneData();
  const structuredLane =
    laneList.find(
      (r) =>
        r.root === variants.compact ||
        r.root.replace(/\s+/g, '') === variants.compact
    ) || null;

  // 2. Query dictionary tables in sqlite
  const db = getLexiconsDb();
  const entries: LexiconEntry[] = [];

  try {
    for (const dict of dicts) {
      // Don't search if the table doesn't exist (handled by try/catch per dict)
      try {
        let row: any = null;
        if (dict.ident === 'lane') {
          // Lane is a bit different (is_root, parent_id)
          let rootRow = db.prepare('SELECT id FROM lanelexcon WHERE is_root = 1 AND word = ?').get(variants.compact) as { id: number } | undefined;
          if (!rootRow && variants.raw !== variants.compact) {
              rootRow = db.prepare('SELECT id FROM lanelexcon WHERE is_root = 1 AND word = ?').get(variants.raw) as { id: number } | undefined;
          }
          if (rootRow) {
            const children = db.prepare('SELECT word, meanings FROM lanelexcon WHERE parent_id = ? AND is_root = 0 ORDER BY id ASC').all(rootRow.id) as { word: string; meanings: string }[];
            if (children && children.length > 0) {
              const definitions = children.map(c => `<div class="mb-2"><b class="text-amber-500 font-bold">${c.word}</b>: <span class="leading-relaxed">${c.meanings}</span></div>`);
              entries.push({ dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions });
            }
          }
        } else {
          // Other dictionaries are simpler (word, meanings)
          row = db.prepare(`SELECT meanings FROM ${dict.ident} WHERE word = ?`).get(variants.compact) as { meanings: string } | undefined;
          if (!row && variants.raw !== variants.compact) {
            row = db.prepare(`SELECT meanings FROM ${dict.ident} WHERE word = ?`).get(variants.raw) as { meanings: string } | undefined;
          }
          if (row && row.meanings) {
            entries.push({ dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions: [row.meanings] });
          }
        }
      } catch (e) {
        // Table might not exist, silently skip
      }
    }
  } catch (err) {
    console.error('Error querying dictionaries:', err);
  }

  // Sort entries so English / Lane's appear first, then Arabic Classical
  entries.sort((a, b) => {
    if (a.dictId === 1) return -1;
    if (b.dictId === 1) return 1;
    return a.dictId - b.dictId;
  });

  return {
    root: rootQuery,
    normalizedRoot: variants.compact,
    structuredLane,
    entries,
  };
}

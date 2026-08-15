import { createClient } from '@libsql/client';
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
  ai_summary: { root_meaning_html: string; quranic_usage_html: string } | null;
}

// Singleton database connections for Next.js HMR
const globalForDb = globalThis as unknown as {
  tursoClient: any;
  structuredLaneCache: StructuredLaneEntry[] | undefined;
  surahWordsCache: Record<number, any> | undefined;
  aiSummariesCache: Record<string, { root_meaning_html: string; quranic_usage_html: string }> | undefined;
};

function getTursoClient() {
  if (!globalForDb.tursoClient) {
    globalForDb.tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForDb.tursoClient;
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

function getAiSummaries(): Record<string, { root_meaning_html: string; quranic_usage_html: string }> {
  if (!globalForDb.aiSummariesCache) {
    try {
      const jsonPath = path.join(
        process.cwd(),
        'database',
        'lexicon',
        'data',
        'comprehensive_root_summaries.json'
      );
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        globalForDb.aiSummariesCache = JSON.parse(raw);
      } else {
        globalForDb.aiSummariesCache = {};
      }
    } catch (e) {
      console.error('Error loading AI summaries JSON:', e);
      globalForDb.aiSummariesCache = {};
    }
  }
  return globalForDb.aiSummariesCache || {};
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

export async function getSurahWords(surah: number) {
  if (!globalForDb.surahWordsCache) {
    globalForDb.surahWordsCache = {};
  }
  if (globalForDb.surahWordsCache[surah]) {
    return globalForDb.surahWordsCache[surah];
  }
  try {
    const turso = getTursoClient();
    const res = await turso.execute({
      sql: `
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
      `,
      args: [surah]
    });
    const rows = res.rows;

    // Fetch English Morphology
    let engMorphMap: Record<string, string> = {};
    try {
      const engRes = await turso.execute({
        sql: `SELECT ayah, word, pos_tags FROM word_morphology WHERE surah = ?`,
        args: [surah]
      });
      for (const er of engRes.rows) {
        engMorphMap[`${er.ayah}:${er.word}`] = er.pos_tags as string;
      }
    } catch (e) {
      console.error('Error fetching English morphology:', e);
    }

    const map: Record<number, any[]> = {};
    for (const r of rows) {
      const ayahNo = r.ayahNo as number;
      const wordNo = r.wordNo as number;
      if (!map[ayahNo]) map[ayahNo] = [];
      const normalizedWordIdx = (surah === 2 && ayahNo === 1 && wordNo === 5) ? 1 : wordNo;
      const engMorph = engMorphMap[`${ayahNo}:${normalizedWordIdx}`] || engMorphMap[`${ayahNo}:${wordNo}`];
      
      map[ayahNo].push({
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
    console.error('Error fetching surah words from Turso:', err);
    return {};
  }
}

export async function getAyahWords(surah: number, ayah: number) {
  if (!globalForDb.surahWordsCache?.[surah]) {
    await getSurahWords(surah);
  }
  if (globalForDb.surahWordsCache?.[surah]?.[ayah]) {
    return globalForDb.surahWordsCache[surah][ayah];
  }
  try {
    const turso = getTursoClient();
    const res = await turso.execute({
      sql: `
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
      `,
      args: [surah, ayah]
    });
    const rows = res.rows;

    let engMorphMap: Record<string, string> = {};
    try {
      const engRes = await turso.execute({
        sql: `SELECT word, pos_tags FROM word_morphology WHERE surah = ? AND ayah = ?`,
        args: [surah, ayah]
      });
      for (const er of engRes.rows) {
        engMorphMap[er.word as string] = er.pos_tags as string;
      }
    } catch (e) { }

    return rows.map((r) => {
      const wordNo = r.wordNo as number;
      const normalizedWordIdx = (surah === 2 && ayah === 1 && wordNo === 5) ? 1 : wordNo;
      const engMorph = engMorphMap[normalizedWordIdx] || engMorphMap[wordNo];
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
    console.error('Error fetching ayah words from Turso:', err);
    return [];
  }
}

/**
 * Get morphology & root for a specific word in Quran
 */
export async function getWordMorphology(surah: number, ayah: number, wordIndex: number): Promise<WordMorphology | null> {
  const words = await getAyahWords(surah, ayah);
  const word = words.find((w: any) => w.wordIndex === wordIndex || (surah === 2 && ayah === 1 && (wordIndex === 5 || wordIndex === 1)));
  
  if (word) {
    return {
      surah,
      ayah,
      wordIndex: word.wordIndex,
      word: word.word as string,
      root: word.root as string | null,
      lemma: word.lemma,
      stem: word.stem as string | null, // Sarf text
      irab: word.irab as string | null
    };
  }
  return null;
}

/**
 * Search all roots by query string (supports Arabic root or English transliteration)
 */
export async function searchRoots(query: string, limit = 50): Promise<string[]> {
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

  // Also search lanelexcon in Turso
  try {
    const turso = getTursoClient();
    const compactPattern = `%${compact}%`;
    const res = await turso.execute({
      sql: `SELECT word FROM lanelexcon WHERE is_root = 1 AND word LIKE ? LIMIT ?`,
      args: [compactPattern, limit]
    });

    for (const r of res.rows) {
      const cleanRoot = (r.word as string).replace(/\s+/g, '');
      matchedSet.add(cleanRoot);
    }
  } catch (err) {
    console.error('Error searching roots in Turso:', err);
  }

  return Array.from(matchedSet).slice(0, limit);
}

/**
 * Fetches comprehensive lexicon entries across all dictionaries for a given root.
 */
export async function getLexiconEntriesForRoot(rootQuery: string): Promise<RootLexiconResult> {
  const variants = normalizeRootVariants(rootQuery);
  const dicts = getDictionaries();
  
  // 1. Structured Lane's Lexicon
  const laneList = getStructuredLaneData();
  const structuredLane =
    laneList.find(
      (r) =>
        r.root === variants.compact ||
        r.root.replace(/\s+/g, '') === variants.compact
    ) || null;

  // 2. Query dictionary tables in Turso
  const turso = getTursoClient();
  const entries: LexiconEntry[] = [];

  try {
    for (const dict of dicts) {
      try {
        let row: any = null;
        if (dict.ident === 'lane') {
          // Lane is a bit different (is_root, parent_id)
          let rootRes = await turso.execute({
            sql: 'SELECT id FROM lanelexcon WHERE is_root = 1 AND word = ?',
            args: [variants.compact]
          });
          if (rootRes.rows.length === 0 && variants.raw !== variants.compact) {
            rootRes = await turso.execute({
              sql: 'SELECT id FROM lanelexcon WHERE is_root = 1 AND word = ?',
              args: [variants.raw]
            });
          }
          if (rootRes.rows.length > 0) {
            const rootId = rootRes.rows[0].id;
            const childrenRes = await turso.execute({
              sql: 'SELECT word, meanings FROM lanelexcon WHERE parent_id = ? AND is_root = 0 ORDER BY id ASC',
              args: [rootId]
            });
            if (childrenRes.rows.length > 0) {
              const definitions = childrenRes.rows.map(c => `<div class="mb-2"><b class="text-amber-500 font-bold">${c.word}</b>: <span class="leading-relaxed">${c.meanings}</span></div>`);
              entries.push({ dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions });
            }
          }
        } else {
          // Other dictionaries are simpler (word, meanings)
          let res = await turso.execute({
            sql: `SELECT meanings FROM ${dict.ident} WHERE word = ?`,
            args: [variants.compact]
          });
          if (res.rows.length === 0 && variants.raw !== variants.compact) {
            res = await turso.execute({
              sql: `SELECT meanings FROM ${dict.ident} WHERE word = ?`,
              args: [variants.raw]
            });
          }
          if (res.rows.length > 0 && res.rows[0].meanings) {
            entries.push({ dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions: [res.rows[0].meanings as string] });
          }
        }
      } catch (e) {
        // Table might not exist, silently skip
      }
    }
  } catch (err) {
    console.error('Error querying dictionaries from Turso:', err);
  }

  // Sort entries so English / Lane's appear first, then Arabic Classical
  entries.sort((a, b) => {
    if (a.dictId === 1) return -1;
    if (b.dictId === 1) return 1;
    return a.dictId - b.dictId;
  });

  const aiSummaries = getAiSummaries();
  const ai_summary = aiSummaries[variants.compact] || aiSummaries[rootQuery] || null;

  return {
    root: rootQuery,
    normalizedRoot: variants.compact,
    structuredLane,
    entries,
    ai_summary,
  };
}

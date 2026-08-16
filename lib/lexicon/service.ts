import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { unstable_cache } from 'next/cache';

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
  irab?: string | null;
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

// Singleton Turso client (safe to keep — this is just the connection, not data)
const globalForDb = globalThis as unknown as {
  tursoClient: any;
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

// Persistent cache using Next.js built-in cache — survives Vercel cold starts.
// structured_lane is a large static table; cache for 7 days.
const getStructuredLaneData = unstable_cache(
  async (): Promise<StructuredLaneEntry[]> => {
    try {
      const turso = getTursoClient();
      const res = await turso.execute('SELECT * FROM structured_lane');
      return res.rows.map((r: any) => ({
        id: 0,
        root: r.root as string,
        root_buckwalter: r.root_buckwalter as string,
        definition_en: r.definition_en as string,
        summary_en: r.summary_en as string,
        summary_tr: r.summary_tr as string,
        quran_frequency: r.quran_frequency as number,
        morphological_forms: JSON.parse((r.morphological_forms as string) || '[]')
      }));
    } catch (e) {
      console.error('Error loading structured Lane from Turso:', e);
      return [];
    }
  },
  ['structured-lane-data'],
  { revalidate: 604800 } // 7 days — static lexicon data
);

// AI summaries are also static after generation; cache for 7 days.
const getAiSummaries = unstable_cache(
  async (): Promise<Record<string, { root_meaning_html: string; quranic_usage_html: string }>> => {
    try {
      const turso = getTursoClient();
      const res = await turso.execute('SELECT * FROM ai_root_summary');
      const cache: Record<string, { root_meaning_html: string; quranic_usage_html: string }> = {};
      for (const r of res.rows) {
        cache[r.root as string] = {
          root_meaning_html: r.root_meaning_html as string,
          quranic_usage_html: r.quranic_usage_html as string,
        };
      }
      return cache;
    } catch (e) {
      console.error('Error loading AI summaries from Turso:', e);
      return {};
    }
  },
  ['ai-root-summaries'],
  { revalidate: 604800 } // 7 days
);

/**
 * Lightweight instant lookup for word click popup (0 database roundtrips, < 1ms)
 */
export async function getRootWordSummary(rootQuery: string): Promise<{
  rootSummary: string | null;
  aiSummary: { root_meaning_html: string; quranic_usage_html: string } | null;
}> {
  const variants = normalizeRootVariants(rootQuery);
  const [laneList, aiSummaries] = await Promise.all([
    getStructuredLaneData(),
    getAiSummaries(),
  ]);

  const structuredLane =
    laneList.find(
      (r) =>
        r.root === variants.compact ||
        r.root.replace(/\s+/g, '') === variants.compact
    ) || null;

  const aiSummary = aiSummaries[variants.compact] || aiSummaries[rootQuery] || null;

  return {
    rootSummary: structuredLane?.summary_en || null,
    aiSummary,
  };
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

export const getSurahWords = unstable_cache(
  async (surah: number): Promise<Record<number, any[]>> => {
    try {
      const turso = getTursoClient();
      const [res, engRes] = await Promise.all([
        turso.execute({
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
        }),
        turso.execute({
          sql: `SELECT ayah, word, pos_tags FROM word_morphology WHERE surah = ?`,
          args: [surah]
        }).catch((e: any) => {
          console.error('Error fetching English morphology:', e);
          return { rows: [] };
        })
      ]);

      const rows = res.rows;
      const engMorphMap: Record<string, string> = {};
      for (const er of engRes.rows) {
        engMorphMap[`${er.ayah}:${er.word}`] = er.pos_tags as string;
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
          stem: engMorph || r.sarf || null,
          irab: engMorph ? null : (r.irabMushakkal || null),
        });
      }
      return map;
    } catch (err) {
      console.error('Error fetching surah words from Turso:', err);
      return {};
    }
  },
  ['surah-words-map-v2'],
  { revalidate: 2592000 } // 30 days
);

export const MUQATTAAT_SURAH_AYAHS = new Set([
  "2:1", "3:1", "7:1", "10:1", "11:1", "12:1", "13:1", "14:1", "15:1",
  "19:1", "20:1", "26:1", "27:1", "28:1", "29:1", "30:1", "31:1", "32:1",
  "36:1", "38:1", "40:1", "41:1", "42:1", "42:2", "43:1", "44:1", "45:1",
  "46:1", "50:1", "68:1"
]);

export function isMuqattaatWord(surah: number, ayah: number, stem?: string | null, root?: string | null): boolean {
  if (MUQATTAAT_SURAH_AYAHS.has(`${surah}:${ayah}`)) return true;
  if (stem && (stem.toLowerCase().includes('quranic initials') || stem.includes('مقطعة'))) return true;
  if (root && (root.toLowerCase().includes('quranic initials') || root.includes('مقطعة'))) return true;
  return false;
}

export async function getAyahWords(surah: number, ayah: number) {
  const map = await getSurahWords(surah);
  return map[ayah] || [];
}

/**
 * Get morphology & root for a specific word in Quran
 */
export async function getWordMorphology(surah: number, ayah: number, wordIndex: number): Promise<WordMorphology | null> {
  const words = await getAyahWords(surah, ayah);
  const word = words.find((w: any) => w.wordIndex === wordIndex || (surah === 2 && ayah === 1 && (wordIndex === 5 || wordIndex === 1)));
  
  if (word) {
    const isMuq = isMuqattaatWord(surah, ayah, word.stem, word.root);
    return {
      surah,
      ayah,
      wordIndex: word.wordIndex,
      word: word.word as string,
      root: isMuq ? null : (word.root as string | null),
      lemma: isMuq ? null : word.lemma,
      stem: isMuq ? "Quranic Initials (حروف مقطعة)" : (word.stem as string | null),
      irab: isMuq ? null : (word.irab as string | null)
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
  
  const laneData = await getStructuredLaneData();
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
  const laneList = await getStructuredLaneData();
  const structuredLane =
    laneList.find(
      (r) =>
        r.root === variants.compact ||
        r.root.replace(/\s+/g, '') === variants.compact
    ) || null;

  // 2. Query ALL dictionary tables in Turso IN PARALLEL — not sequential.
  // Before: 11 awaits in a for loop = ~800ms waterfall. After: ~100ms total.
  const turso = getTursoClient();

  // Helper to fetch a single non-Lane dictionary entry
  async function fetchSimpleDict(dict: (typeof dicts)[0]): Promise<LexiconEntry | null> {
    try {
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
        return { dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions: [res.rows[0].meanings as string] };
      }
    } catch (e) {
      // Table might not exist, silently skip
    }
    return null;
  }

  // Helper to fetch Lane's Lexicon (has is_root / parent_id structure)
  async function fetchLaneDict(dict: (typeof dicts)[0]): Promise<LexiconEntry | null> {
    try {
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
          const definitions = childrenRes.rows.map((c: any) => `<div class="mb-2"><b class="text-amber-500 font-bold">${c.word}</b>: <span class="leading-relaxed">${c.meanings}</span></div>`);
          return { dictId: dict.id, dictName: dict.name, dictIdent: dict.ident, isEnglish: dict.ar_en, definitions };
        }
      }
    } catch (e) {
      // Lane table error, skip
    }
    return null;
  }

  // Run all dictionary lookups in parallel — this is the key optimization.
  const results = await Promise.all(
    dicts.map(dict => dict.ident === 'lane' ? fetchLaneDict(dict) : fetchSimpleDict(dict))
  );
  const entries: LexiconEntry[] = results.filter((e): e is LexiconEntry => e !== null);

  // Sort entries so English / Lane's appear first, then Arabic Classical
  entries.sort((a, b) => {
    if (a.dictId === 1) return -1;
    if (b.dictId === 1) return 1;
    return a.dictId - b.dictId;
  });

  const aiSummaries = await getAiSummaries();
  const ai_summary = aiSummaries[variants.compact] || aiSummaries[rootQuery] || null;

  return {
    root: rootQuery,
    normalizedRoot: variants.compact,
    structuredLane,
    entries,
    ai_summary,
  };
}

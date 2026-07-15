import { HybridSearchFilters } from '../rag/hybrid-search';

export interface AnalyzedQuery {
  rawQuery: string;
  expandedQuery: string;
  filters: HybridSearchFilters;
  detectedIntents: {
    wantsTafsir: boolean;
    wantsLexicon: boolean;
    wantsGrammarTadabbur: boolean;
    mentionedScholars: string[];
    surahAyahRef?: { surah: number; ayah: number };
  };
}

/**
 * Common English-to-Arabic root/concept mapping dictionary for multilingual query expansion.
 */
const CONCEPT_TO_ARABIC_KEYWORDS: Record<string, string[]> = {
  patience: ['صبر', 'الصبر', 'صابرين'],
  praise: ['حمد', 'الحمد', 'محمود'],
  mercy: ['رحم', 'الرحمن', 'الرحيم', 'رحمة'],
  knowledge: ['علم', 'العلم', 'عليم', 'يعلمون'],
  worship: ['عبد', 'عبادة', 'إياك نعبد', 'العبودية'],
  guidance: ['هدي', 'الهدى', 'اهدنا', 'مهتدون'],
  light: ['نور', 'النور', 'منير'],
  book: ['كتب', 'الكتاب', 'مكتوب'],
  lord: ['ربب', 'رب', 'الربوبية'],
  kingdom: ['ملك', 'الملك', 'مالك'],
};

export function analyzeQuery(userQuery: string): AnalyzedQuery {
  const query = (userQuery || '').trim();
  const lower = query.toLowerCase();

  const filters: HybridSearchFilters = {};
  const detectedIntents = {
    wantsTafsir: true,
    wantsLexicon: true,
    wantsGrammarTadabbur: lower.includes('grammar') || lower.includes('tadabbur') || lower.includes("i'rab") || lower.includes('irab') || lower.includes('balaghah'),
    mentionedScholars: [] as string[],
    surahAyahRef: undefined as { surah: number; ayah: number } | undefined,
  };

  // 1. Detect Surah:Ayah references (e.g., "2:45", "Surah 2 Ayah 45", "2:255")
  const refMatch = query.match(/\b(\d{1,3})\s*[:\.]\s*(\d{1,3})\b/) || 
                   query.match(/surah\s+(\d{1,3}).+?(?:ayah|verse)\s+(\d{1,3})/i);
  if (refMatch) {
    const surahNum = parseInt(refMatch[1], 10);
    const ayahNum = parseInt(refMatch[2], 10);
    if (surahNum >= 1 && surahNum <= 114 && ayahNum >= 1 && ayahNum <= 286) {
      filters.surahId = surahNum;
      filters.ayahId = ayahNum;
      detectedIntents.surahAyahRef = { surah: surahNum, ayah: ayahNum };
    }
  }

  // 2. Detect Scholar references
  if (lower.includes('ibn kathir') || lower.includes('ibn kaseer') || lower.includes('kathir')) {
    filters.authorId = 61; // Ibn Kathir En
    detectedIntents.mentionedScholars.push('Ibn Kathir');
  } else if (lower.includes('jalalayn') || lower.includes('jalalain')) {
    filters.authorId = 52; // Jalalayn Ar
    detectedIntents.mentionedScholars.push('Al-Jalalayn');
  }

  // 3. Detect Arabic Roots
  const arabicCharsMatch = query.match(/[\u0600-\u06FF]{2,}/g);
  if (arabicCharsMatch && arabicCharsMatch.length > 0) {
    // If it's a 3-letter Arabic word, likely a root
    const rootCandidate = arabicCharsMatch[0];
    if (rootCandidate.length >= 3 && rootCandidate.length <= 4) {
      filters.rootWord = rootCandidate;
    }
  }

  // 4. Multilingual Query Expansion
  const expandedTerms: string[] = [query];
  for (const [englishTerm, arabicWords] of Object.entries(CONCEPT_TO_ARABIC_KEYWORDS)) {
    if (lower.includes(englishTerm)) {
      expandedTerms.push(...arabicWords);
    }
  }

  return {
    rawQuery: query,
    expandedQuery: expandedTerms.join(' '),
    filters,
    detectedIntents,
  };
}

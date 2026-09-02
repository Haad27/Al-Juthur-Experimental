import { MODE_AUTHORS } from '../../../scripts/seed_rag_modes';
import { SURAHS_DATA } from '../../surahsData';

export type RagMode = 'default' | 'classical' | 'grammar' | 'modern' | 'philosophical' | 'lexicon' | 'dream';

export type QueryType = 'specific' | 'thematic' | 'specific_multiple';

export interface PreparedQueryInfo {
  isScopeValid: boolean;
  warningMessage?: string;
  expandedQueryAr: string;
  expandedQueryEn: string;
  keywords: string[];
  rootWords: string[];
  targetSurahAyah?: { surah?: number; ayah?: number };
  suggestedVerses?: { surah: number; ayah: number }[];
  queryType: QueryType;
  mode: RagMode;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'; // Deprecated - Using Gemini only

/**
 * Deterministic concept-to-Arabic root dictionary for fast baseline expansion.
 */
const BASE_CONCEPT_KEYWORDS: Record<string, { ar: string[]; roots: string[] }> = {
  patience: { ar: ['الصبر', 'صبر', 'صابرين', 'الابتلاء'], roots: ['صبر', 'بلي'] },
  mercy: { ar: ['الرحمن', 'الرحيم', 'رحمة', 'الرأفة'], roots: ['رحم', 'رأف'] },
  love: { ar: ['المودة', 'الود', 'المحبة', 'الحب'], roots: ['ودد', 'حبب'] },
  affection: { ar: ['المودة', 'الود'], roots: ['ودد'] },
  mawaddah: { ar: ['المودة', 'الود'], roots: ['ودد'] },
  rahmah: { ar: ['الرحمة', 'الرحمن', 'الرحيم'], roots: ['رحم'] },
  peace: { ar: ['السكينة', 'السلام'], roots: ['سكن', 'سلم'] },
  tranquility: { ar: ['السكينة', 'الطمأنينة'], roots: ['سكن', 'طمن'] },
  marriage: { ar: ['الزواج', 'النكاح', 'المودة', 'الرحمة', 'الأزواج'], roots: ['زوج', 'نكح', 'ودد', 'رحم'] },
  marraige: { ar: ['الزواج', 'النكاح', 'المودة', 'الرحمة', 'الأزواج'], roots: ['زوج', 'نكح', 'ودد', 'رحم'] },
  marry: { ar: ['الزواج', 'النكاح'], roots: ['زوج', 'نكح'] },
  nikah: { ar: ['النكاح', 'الزواج'], roots: ['نكح', 'زوج'] },
  zawaj: { ar: ['الزواج', 'الأزواج'], roots: ['زوج'] },
  spouse: { ar: ['الزوج', 'الزوجة', 'الأزواج'], roots: ['زوج'] },
  spouses: { ar: ['الأزواج', 'أزواجكم'], roots: ['زوج'] },
  wife: { ar: ['الزوجة', 'امرأة', 'الأزواج'], roots: ['زوج', 'مرأ'] },
  husband: { ar: ['الزوج', 'بعل'], roots: ['زوج', 'بعل'] },
  family: { ar: ['الأسرة', 'الأهل', 'العشيرة'], roots: ['أهل', 'عشر'] },
  parents: { ar: ['الوالدين', 'الأبوين', 'بر الوالدين'], roots: ['ولد', 'أبو', 'برر'] },
  divorce: { ar: ['الطلاق', 'سراح'], roots: ['طلق', 'سرح'] },
  talaq: { ar: ['الطلاق', 'سراح'], roots: ['طلق', 'سرح'] },
  charity: { ar: ['الصدقة', 'الزكاة', 'الإنفاق'], roots: ['صدق', 'زكو', 'نفق'] },
  justice: { ar: ['العدل', 'القسط', 'الميزان'], roots: ['عدل', 'قسط', 'وزن'] },
  knowledge: { ar: ['العلم', 'عليم', 'العلماء', 'الحكمة'], roots: ['علم', 'حكم'] },
  worship: { ar: ['العبادة', 'إياك نعبد', 'العبودية', 'الصلاة'], roots: ['عبد', 'صلي'] },
  guidance: { ar: ['الهدى', 'اهدنا', 'الصراط', 'التقوى'], roots: ['هدي', 'وقي'] },
  light: { ar: ['النور', 'منير', 'الإشراق', 'البصيرة'], roots: ['نور', 'بصر'] },
  book: { ar: ['الكتاب', 'القرآن', 'الوحي', 'التنزيل'], roots: ['كتب', 'قرأ'] },
  lord: { ar: ['الرب', 'الربوبية', 'الألوهية', 'الخالق'], roots: ['ربب', 'أله'] },
  kingdom: { ar: ['الملك', 'المالك', 'السيادة', 'السلطان'], roots: ['ملك', 'سلط'] },
  praise: { ar: ['الحمد', 'التسبيح', 'الشكر', 'التحميد'], roots: ['حمد', 'سبح', 'شكر'] }
};

const DEFAULT_THEMATIC_VERSES: Record<string, { surah: number; ayah: number }[]> = {
  marriage: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 2, ayah: 187 }, { surah: 24, ayah: 32 }],
  marraige: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 2, ayah: 187 }, { surah: 24, ayah: 32 }],
  marry: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 24, ayah: 32 }],
  nikah: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 24, ayah: 32 }],
  zawaj: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 2, ayah: 187 }],
  spouse: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 2, ayah: 187 }],
  spouses: [{ surah: 30, ayah: 21 }, { surah: 4, ayah: 1 }, { surah: 2, ayah: 187 }],
  divorce: [{ surah: 65, ayah: 1 }, { surah: 2, ayah: 228 }, { surah: 2, ayah: 229 }],
  talaq: [{ surah: 65, ayah: 1 }, { surah: 2, ayah: 228 }, { surah: 2, ayah: 229 }],
  patience: [{ surah: 2, ayah: 153 }, { surah: 2, ayah: 155 }, { surah: 39, ayah: 10 }, { surah: 103, ayah: 3 }],
  mercy: [{ surah: 21, ayah: 107 }, { surah: 7, ayah: 156 }, { surah: 39, ayah: 53 }],
  love: [{ surah: 30, ayah: 21 }, { surah: 3, ayah: 31 }, { surah: 5, ayah: 54 }],
  parents: [{ surah: 17, ayah: 23 }, { surah: 17, ayah: 24 }, { surah: 31, ayah: 14 }],
  justice: [{ surah: 4, ayah: 135 }, { surah: 5, ayah: 8 }, { surah: 16, ayah: 90 }],
  charity: [{ surah: 2, ayah: 261 }, { surah: 2, ayah: 274 }, { surah: 57, ayah: 18 }]
};

const SURAH_NAME_MAP: Record<string, number> = {
  'fatiha': 1, 'al-fatiha': 1, 'fatihah': 1, 'al-fatihah': 1, 'the opening': 1,
  'baqarah': 2, 'al-baqarah': 2, 'the cow': 2,
  'imran': 3, 'al-imran': 3, 'ali imran': 3,
  'nisa': 4, 'an-nisa': 4, 'al-nisa': 4,
  'maida': 5, 'al-maida': 5, 'al-maidah': 5,
  'an-nam': 6, 'al-anam': 6,
  'araf': 7, 'al-araf': 7,
  'anfal': 8, 'al-anfal': 8,
  'tawbah': 9, 'at-tawbah': 9,
  'yunus': 10,
  'hud': 11,
  'yusuf': 12,
  'rad': 13, 'ar-rad': 13,
  'ibrahim': 14,
  'hijr': 15, 'al-hijr': 15,
  'nahl': 16, 'an-nahl': 16,
  'isra': 17, 'al-isra': 17,
  'kahf': 18, 'al-kahf': 18, 'the cave': 18,
  'maryam': 19,
  'taha': 20,
  'anbiya': 21, 'al-anbiya': 21,
  'hajj': 22, 'al-hajj': 22,
  'muminun': 23, 'al-muminun': 23,
  'nur': 24, 'an-nur': 24, 'the light': 24,
  'furqan': 25, 'al-furqan': 25,
  'yasin': 36, 'ya-sin': 36, 'yaseen': 36,
  'rahman': 55, 'ar-rahman': 55,
  'waqiah': 56, 'al-waqiah': 56,
  'mulk': 67, 'al-mulk': 67,
  'ikhlas': 112, 'al-ikhlas': 112,
  'falaq': 113, 'al-falaq': 113,
  'nas': 114, 'an-nas': 114
};

/**
 * Validates if a given surah/ayah combination exists in the Quran.
 */
function validateVerseRef(v: { surah: number; ayah: number }): boolean {
  const surahMeta = SURAHS_DATA.find(s => s.number === v.surah);
  if (!surahMeta) return false;
  return v.ayah >= 1 && v.ayah <= surahMeta.numberOfAyahs;
}

/**
 * Parses explicit Surah:Ayah coordinates or Surah names.
 */
export function parseSurahAyah(text: string): { surah?: number; ayah?: number } | undefined {
  if (!text) return undefined;
  const clean = text.toLowerCase().trim();

  // Explicit coordinate e.g. 2:255
  const colonMatch = clean.match(/\b(\d{1,3})\s*:\s*(\d{1,3})\b/);
  if (colonMatch) {
    const s = parseInt(colonMatch[1], 10);
    const a = parseInt(colonMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1 && a <= 286) return { surah: s, ayah: a };
  }

  // Verbal match e.g. Surah 2 Ayah 255
  const verbalMatch = clean.match(/\b(?:surah|sura|ch|chapter)\s*(\d{1,3})\s*(?:ayah|ayat|verse|v)?\s*(\d{1,3})\b/);
  if (verbalMatch) {
    const s = parseInt(verbalMatch[1], 10);
    const a = parseInt(verbalMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1 && a <= 286) return { surah: s, ayah: a };
  }

  // Check if query mentions Surah by number only (e.g. "Surah 1" or "Surah 112")
  const surahOnlyMatch = clean.match(/\b(?:surah|sura|chapter)\s*(\d{1,3})\b/);
  if (surahOnlyMatch) {
    const s = parseInt(surahOnlyMatch[1], 10);
    if (s >= 1 && s <= 114) return { surah: s };
  }

  // Check Surah name map
  for (const [name, surahNo] of Object.entries(SURAH_NAME_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(clean)) {
      return { surah: surahNo };
    }
  }

  return undefined;
}

/**
 * LLM 1: Query Rewriter, Scope Guardrail Check, and Arabic Vocabulary Expansion.
 * Prioritizes Gemini Flash / Flash-Lite models per user instruction.
 */
export async function prepareRagQuery(
  userMessage: string, 
  mode: RagMode = 'default',
  options?: { targetSurah?: number; targetAyah?: number; rootWord?: string }
): Promise<PreparedQueryInfo> {
  const cleanMessage = (userMessage || '').trim();
  const lowerMsg = cleanMessage.toLowerCase();
  const parsedRef = options?.targetSurah && options?.targetAyah 
    ? { surah: options.targetSurah, ayah: options.targetAyah }
    : (options?.targetSurah ? { surah: options.targetSurah } : parseSurahAyah(cleanMessage));

  // 1. Deterministic baseline analysis
  const baseKeywords: string[] = [];
  const baseRoots: string[] = [];
  const baseArWords: string[] = [];

  for (const [concept, data] of Object.entries(BASE_CONCEPT_KEYWORDS)) {
    if (lowerMsg.includes(concept)) {
      baseKeywords.push(concept);
      baseArWords.push(...data.ar);
      baseRoots.push(...data.roots);
    }
  }

  // Detect Arabic characters in raw message
  const arabicMatch = cleanMessage.match(/[\u0600-\u06FF]+/g);
  if (arabicMatch) {
    for (const w of arabicMatch) {
      if (w.length >= 3 && w.length <= 4) baseRoots.push(w);
      baseArWords.push(w);
    }
  }

  // 2. Fast deterministic guardrail checks (Universally applied to ALL modes)
  const UNIVERSAL_GUARDRAIL_REFUSAL = 
    "Al-Juthur AI Scholar is strictly dedicated to classical Quranic Tafsir, verse exegesis, and linguistic commentary. It does NOT issue Fiqh rulings (Fatwas) or engage in sectarian, polemical, or theological (Aqeedah) disputes. For binding religious rulings and edicts, please consult certified human scholars (Ulama / Muftis).";

  // Detect if query is a broad thematic / conceptual inquiry about Quranic guidance or teachings
  const isThematicQuranQuery = /\b(what does (?:the )?(?:qur'?an|qurtan|quraan|koran) (?:say|teach|mention|state) (?:about|regarding)|what is the (?:qur'?an|qurtan|quraan|koran)(?:ic)? (?:view|perspective|guidance|teaching|concept|message) (?:on|about|regarding)|(?:qur'?an|qurtan|quraan|koran)(?:ic)? (?:view|perspective|teachings?|concept|guidance|verses?|passages?) (?:on|about|regarding)|mentions? of .+ in (?:the )?(?:qur'?an|qurtan|quraan|koran)|(?:qur'?an|qurtan|quraan|koran) (?:on|about))\b/i.test(cleanMessage) ||
    /^(?:what does (?:the )?(?:qur'?an|qurtan|quraan|koran) say about|verses about|concept of .+ in (?:the )?qur'?an)/i.test(cleanMessage);

  // A. Immediate block for sectarian groups, modern polemics & controversial theological keywords
  const isSectarianOrControversial = /\b(mawlid|milad|eid milad|kadiyani|qadiani|qadiyani|ahmadi|ahmadiyya|mirza ghulam|shiya|shia|shi'a|shiite|shiah|rafida|rafidi|rafidhi|sunni vs shia|shia vs sunni|deobandi|barelvi|barelwi|wahhabi|takfir|khawarij|kharijite)\b/i.test(cleanMessage);

  if (isSectarianOrControversial) {
    return {
      isScopeValid: false,
      warningMessage: UNIVERSAL_GUARDRAIL_REFUSAL,
      expandedQueryAr: baseArWords.join(' '),
      expandedQueryEn: cleanMessage,
      keywords: baseKeywords,
      rootWords: Array.from(new Set(baseRoots)),
      targetSurahAyah: parsedRef,
      queryType: parsedRef?.ayah ? 'specific' : 'thematic',
      mode
    };
  }

  // B. Immediate block for direct personal legal rulings (Fatwas) or procedural ritual steps
  // (NOTE: General thematic questions exploring what the Quran says about marriage, family, divorce, justice, etc. are completely allowed)
  const isPersonalFatwaOrLegalVerdict = /\b(fatwa|give me a fatwa|need a fatwa|is it halal to|is it haram to|is it permissible to|is it forbidden to|can i marry|can i divorce|how to divorce|talaq procedure|how to pray|steps of (?:prayer|salah|namaz|wudu|ghusl)|how to (?:make|do) (?:wudu|ghusl)|calculate (?:my )?zakat|calculate (?:my )?inheritance|inheritance share calculation|punishment for (?:theft|adultery|zina))\b/i.test(cleanMessage);
  
  // Check if query is explicitly asking for classical Tafsir commentary of a verse rather than a ruling
  const isExplicitTafsirRequest = /\b(tafsir|commentary|exegesis|ayah|surah|verse|tabari|ibn kathir|qurtubi|baghawi|ashur)\b/i.test(cleanMessage) && (parsedRef !== null || /\b(tafsir of|meaning of verse|commentary on)\b/i.test(cleanMessage));

  if (isPersonalFatwaOrLegalVerdict && !isExplicitTafsirRequest) {
    return {
      isScopeValid: false,
      warningMessage: UNIVERSAL_GUARDRAIL_REFUSAL,
      expandedQueryAr: baseArWords.join(' '),
      expandedQueryEn: cleanMessage,
      keywords: baseKeywords,
      rootWords: Array.from(new Set(baseRoots)),
      targetSurahAyah: parsedRef,
      queryType: parsedRef?.ayah ? 'specific' : 'thematic',
      mode
    };
  }

  // C. Immediate block for theological creed (Aqeedah/Kalam) debates
  const isAqeedahDebate = /\b(aqeedah debate|creed debate|ashari vs|maturidi vs|athari vs|where is allah|is quran created|kalam debate)\b/i.test(cleanMessage);
  if (isAqeedahDebate && !isExplicitTafsirRequest) {
    return {
      isScopeValid: false,
      warningMessage: UNIVERSAL_GUARDRAIL_REFUSAL,
      expandedQueryAr: baseArWords.join(' '),
      expandedQueryEn: cleanMessage,
      keywords: baseKeywords,
      rootWords: Array.from(new Set(baseRoots)),
      targetSurahAyah: parsedRef,
      queryType: parsedRef?.ayah ? 'specific' : 'thematic',
      mode
    };
  }

  if (mode === 'grammar') {
    const isOutOfScopeForGrammar = /\b(aqidah debate|creed debate|fatwa|is it halal|is it haram|kalam debate)\b/i.test(cleanMessage);
    if (isOutOfScopeForGrammar && !/\b(grammar|i'rab|irab|balagha|syntax|particle|rhetoric|linguistic|word|root)\b/i.test(cleanMessage)) {
      return {
        isScopeValid: false,
        warningMessage: UNIVERSAL_GUARDRAIL_REFUSAL,
        expandedQueryAr: baseArWords.join(' '),
        expandedQueryEn: cleanMessage,
        keywords: baseKeywords,
        rootWords: Array.from(new Set(baseRoots)),
        targetSurahAyah: parsedRef,
        queryType: parsedRef?.ayah ? 'specific' : 'thematic',
        mode
      };
    }
  }

  if (mode === 'lexicon') {
    const isOutOfScopeForLexicon = /\b(fatwa|is it halal|is it haram|how to pray|zakat calculation)\b/i.test(cleanMessage);
    if (isOutOfScopeForLexicon && !/\b(meaning|root|word|define|dictionary|lexicon|usage|lane|mufradat|lisan)\b/i.test(cleanMessage)) {
      return {
        isScopeValid: false,
        warningMessage: UNIVERSAL_GUARDRAIL_REFUSAL,
        expandedQueryAr: baseArWords.join(' '),
        expandedQueryEn: cleanMessage,
        keywords: baseKeywords,
        rootWords: Array.from(new Set(baseRoots)),
        targetSurahAyah: parsedRef,
        queryType: parsedRef?.ayah ? 'specific' : 'thematic',
        mode
      };
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is missing for Query Router.");

  const systemPrompt = mode === 'lexicon' 
    ? `You are the Lexicon Query Preparation Router for a Classical Quranic RAG System.
Your task is to analyze the user's prompt and extract all relevant Arabic root words, along with exemplary verses.

ACTIVE MODE: "lexicon"

CRITICAL INSTRUCTIONS:
1. **Root Word Extraction**: You MUST identify and extract ALL relevant 3-letter or 4-letter Arabic root words from the user's inquiry or referenced verses (e.g., if the user asks about 'marriage', extract 'زوج', 'نكح', 'ودد', 'رحم'; if asking about 'mawaddah and rahmah', extract BOTH 'ودد' and 'رحم'; if asking about 'tranquility (sakina) and love', extract 'سكن' and 'ودد'; if asking about a specific verse, extract the primary roots present in that verse). Always return all relevant roots in the "rootWords" array.
2. **Verse Suggestion**: Provide 1 to 3 prime examples of verses where these root words are beautifully showcased in the Quran. These verses will be used to demonstrate Quranic application of the roots.
3. **UNIVERSAL SCOPE POLICY & GUARDRAILS**:
   - ALWAYS ALLOW (isScopeValid: true, queryType: "thematic"): General Quranic thematic, conceptual, ethical, or linguistic inquiries (e.g. "what does the Quran say about marriage", "love and mercy in Quran", "patience", "justice", "creation"). The Quran speaks extensively on these themes. Analyzing their classical Arabic roots, lexicon definitions, and Quranic usage is 100% IN SCOPE. Tolerate spelling variations and typos gracefully (e.g. "qurtan", "marraige").
   - ONLY BLOCK (isScopeValid: false):
     * Personal Fiqh legal rulings or fatwas (e.g. "can I marry my cousin?", "is my divorce legally valid?", "is X halal or haram for me to do?").
     * Sectarian debates (e.g. Shia, Qadiani/Kadiyani, Mawlid disputes).
     * Speculative theological creed (Aqeedah/Kalam) debates.

OUTPUT JSON FORMAT ONLY:
{
  "isScopeValid": true or false,
  "warningMessage": "Only if isScopeValid is false: 'Al-Juthur AI Scholar is strictly dedicated to classical Quranic Tafsir, verse exegesis, and linguistic commentary. It does not provide Fiqh rulings (Fatwas) or engage in sectarian/theological (Aqeedah) debates. Please consult qualified human scholars (Ulama) for binding rulings.'",
  "queryType": "thematic",
  "targetSurah": null,
  "targetAyah": null,
  "expandedQueryAr": "Exact classical Arabic keywords",
  "expandedQueryEn": "Expanded English terminology",
  "keywords": ["keyword1", "keyword2"],
  "rootWords": ["3-letter or 4-letter Arabic root, e.g. زوج, نكح, ودد, رحم"],
  "suggestedVerses": [{"surah": 30, "ayah": 21}]
}`
    : `You are the Light Query Preparation & Guardrail Router for a Classical Quranic RAG System.
Your task is to analyze the user's prompt in the context of the selected mode and return a strict JSON object.

ACTIVE MODE: "${mode}"
${options?.targetSurah && options?.targetAyah ? `\nCONTEXT OVERRIDE: The user is specifically inquiring about Surah ${options.targetSurah}, Ayah ${options.targetAyah}. You MUST set targetSurah: ${options.targetSurah}, targetAyah: ${options.targetAyah}, queryType: "specific", and leave suggestedVerses empty.\n` : ''}
CRITICAL INSTRUCTIONS:
1. **Arabic Translation for Vector Search**: You must extract the core concepts from the user's English query and translate them into classical Arabic keywords ("expandedQueryAr"). This is critical because our databases are primarily in Arabic. The translation depth depends on the mode (e.g., Classical and Lexicon require heavy, precise Arabic root extraction).
2. **UNIVERSAL SCOPE & GUARDRAIL POLICY (APPLIES TO ALL MODES, INCLUDING DEFAULT)**: 
   - ALWAYS ALLOW (isScopeValid: true, queryType: "thematic"):
     General thematic, ethical, social, or topical questions asking what the Quran says, teaches, or reveals about ANY topic (e.g. "what does the Quran say about marriage", "what does Quran teach about divorce", "women in the Quran", "justice", "charity", "parents", "wealth", "creation", "patience", "covenants", "food", "forgiveness").
     The Quran addresses these themes extensively, and exploring them through classical Tafsir, verse exegesis, and linguistic commentary is the PRIMARY MISSION of Al-Juthur. NEVER block general thematic or conceptual questions!
     Tolerate common misspellings or typos gracefully (e.g., "qurtan" -> Quran, "marraige" -> marriage).
   - ONLY REFUSE (isScopeValid: false):
     * Practical personal Fiqh rulings or Fatwas asking for juristic legal verdicts on individual situations or procedural rituals (e.g. "can I marry my cousin?", "is my divorce legally valid if I said it once?", "is forex halal or haram for me?", "give me a fatwa on...", "how to perform wudu/prayer step-by-step", "calculate my exact inheritance/zakat").
     * Sectarian groups or polemical conflicts (e.g. Mawlid/Milad, Qadiani/Kadiyani, Shia/Shiite, Sunni vs Shia, Deobandi vs Barelvi, Takfir).
     * Speculative theological creed debates (Aqeedah/Kalam disputes, e.g. "where is Allah physically", "is the Quran created", Ashari vs Athari).
   When isScopeValid is false:
   You MUST set "warningMessage": "Al-Juthur AI Scholar is strictly dedicated to classical Quranic Tafsir, verse exegesis, and linguistic commentary. It does not provide Fiqh rulings (Fatwas) or engage in sectarian, polemical, or theological (Aqeedah) disputes. For binding religious edicts, please consult qualified human scholars (Ulama / Muftis)."
   Do NOT suggest switching to Default Mode or any other mode, because Al-Juthur is exclusively for Tafsir across all modes.
3. **Query Type Classification**:
   - "specific": The user explicitly mentions a SINGLE Surah:Ayah reference (e.g. "explain 2:255"). Set targetSurah/targetAyah and leave suggestedVerses empty.
   - "specific_multiple": The user explicitly mentions MULTIPLE verses (e.g. "explain 3:44 and 5:33"). Set targetSurah and targetAyah to null, and put ALL the explicitly requested verses into the "suggestedVerses" array.
   - "thematic": The user asks about a broad topic/concept WITHOUT referencing a specific verse (e.g. "what does the Quran say about marriage", "what does the Quran say about patience"). Set targetSurah and targetAyah to null and you MUST populate "suggestedVerses".
4. **Verse Suggestion (THEMATIC ONLY)**: This is MANDATORY for thematic queries. You MUST identify 2 to 6 Quranic verses that DIRECTLY address the topic. You MUST provide BOTH "surah" (1-114) AND "ayah" for every single suggested verse. Do NOT provide only a surah.

OUTPUT JSON FORMAT ONLY (no markdown formatting, purely valid JSON):
{
  "isScopeValid": true or false,
  "warningMessage": "Only if isScopeValid is false, state why clearly.",
  "queryType": "specific", "specific_multiple", or "thematic",
  "targetSurah": null or exact Surah number (1 to 114) — ONLY for specific queries,
  "targetAyah": null or exact Ayah number — ONLY for specific queries,
  "expandedQueryAr": "Exact classical Arabic keywords, vocabulary, and synonyms corresponding to the query for BM25 matching.",
  "expandedQueryEn": "Expanded English terminology and synonyms.",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "rootWords": ["3-letter or 4-letter Arabic root if applicable, e.g. زوج, صبر, رحم, علم"],
  "suggestedVerses": [{"surah": 30, "ayah": 21}, {"surah": 4, "ayah": 1}] // Both surah AND ayah are strictly required for every object
}`;

  try {
    let rawJsonText = '';

    // Prioritize direct Gemini API
    if (geminiKey) {
      const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
      for (const modelName of models) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER PROMPT: "${cleanMessage}"` }] }
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'OBJECT',
                  properties: {
                    isScopeValid: { type: 'BOOLEAN' },
                    warningMessage: { type: 'STRING' },
                    queryType: { type: 'STRING' },
                    targetSurah: { type: 'INTEGER' },
                    targetAyah: { type: 'INTEGER' },
                    expandedQueryAr: { type: 'STRING' },
                    expandedQueryEn: { type: 'STRING' },
                    keywords: { type: 'ARRAY', items: { type: 'STRING' } },
                    rootWords: { type: 'ARRAY', items: { type: 'STRING' } },
                    suggestedVerses: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          surah: { type: 'INTEGER' },
                          ayah: { type: 'INTEGER' }
                        },
                        required: ['surah', 'ayah']
                      }
                    }
                  },
                  required: ['isScopeValid', 'queryType', 'expandedQueryAr', 'expandedQueryEn', 'keywords', 'rootWords', 'suggestedVerses']
                },
                maxOutputTokens: 500
              }
            })
          });
          if (res.ok) {
            const data = await res.json();
            rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawJsonText) break;
          } else {
            const errorText = await res.text();
            console.error(`[QUERY-ROUTER] Gemini API returned ${res.status}:`, errorText);
          }
        } catch (e) {
          console.error(`[QUERY-ROUTER] API error with ${modelName}:`, e);
        }
      }
    }

    if (rawJsonText) {
      const cleanJsonStr = rawJsonText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.isScopeValid === false) {
        // Double check: if this is a genuine thematic Quranic query and not asking for a personal fatwa/sectarian dispute,
        // override false positive so genuine Quranic inquiries are never blocked.
        const isActuallySectarianOrFatwa = isSectarianOrControversial || isPersonalFatwaOrLegalVerdict || isAqeedahDebate;
        if (isThematicQuranQuery && !isActuallySectarianOrFatwa) {
          console.warn('[QUERY-ROUTER] Overriding false positive guardrail for thematic query:', cleanMessage);
          parsed.isScopeValid = true;
          parsed.queryType = 'thematic';
        } else {
          return {
            isScopeValid: false,
            warningMessage: parsed.warningMessage || UNIVERSAL_GUARDRAIL_REFUSAL,
            expandedQueryAr: parsed.expandedQueryAr || baseArWords.join(' '),
            expandedQueryEn: parsed.expandedQueryEn || cleanMessage,
            keywords: parsed.keywords || baseKeywords,
            rootWords: parsed.rootWords || baseRoots,
            targetSurahAyah: parsedRef,
            queryType: parsedRef?.ayah ? 'specific' : 'thematic',
            mode
          };
        }
      }

      const surahNum = typeof parsed.targetSurah === 'number' && parsed.targetSurah >= 1 && parsed.targetSurah <= 114
        ? parsed.targetSurah
        : parsedRef?.surah;
      const ayahNum = typeof parsed.targetAyah === 'number' && parsed.targetAyah >= 1 && parsed.targetAyah <= 286
        ? parsed.targetAyah
        : parsedRef?.ayah;

      const combinedAr = Array.from(new Set([
        ...baseArWords,
        ...(typeof parsed.expandedQueryAr === 'string' ? parsed.expandedQueryAr.split(/\s+/) : [])
      ])).join(' ');

      const combinedKeywords = Array.from(new Set([
        ...baseKeywords,
        ...(Array.isArray(parsed.keywords) ? parsed.keywords : [])
      ]));

      const combinedRoots = Array.from(new Set([
        ...baseRoots,
        ...(Array.isArray(parsed.rootWords) ? parsed.rootWords : [])
      ])).filter(r => r && r.length >= 3 && r.length <= 4);

      let validSuggestedVerses: {surah: number, ayah: number}[] = [];
      if (Array.isArray(parsed.suggestedVerses)) {
        // Normalize: if the array contains separate {surah: X} and {ayah: Y} objects, merge them
        const normalized = [];
        let currentObj: any = {};
        for (const item of parsed.suggestedVerses) {
          if (item && typeof item === 'object') {
            if ('surah' in item && 'ayah' in item) {
              normalized.push(item);
            } else if ('surah' in item) {
              currentObj.surah = item.surah;
            } else if ('ayah' in item) {
              currentObj.ayah = item.ayah;
              if ('surah' in currentObj) {
                normalized.push({ ...currentObj });
                currentObj = {};
              }
            }
          }
        }
        
        validSuggestedVerses = normalized.filter((v: any) => 
          v && typeof v.surah === 'number' && typeof v.ayah === 'number' && validateVerseRef(v)
        );
      }
      
      // Determine query type: LLM classification with deterministic fallback
      const llmQueryType = parsed.queryType === 'specific' || parsed.queryType === 'thematic' || parsed.queryType === 'specific_multiple'
        ? parsed.queryType
        : (parsedRef?.ayah ? 'specific' : 'thematic');
      
      // If thematic query yielded no valid suggested verses from LLM, pull from defaults
      if (validSuggestedVerses.length === 0 && (llmQueryType === 'thematic' || !parsedRef?.ayah)) {
        for (const [concept, defaultVerses] of Object.entries(DEFAULT_THEMATIC_VERSES)) {
          if (lowerMsg.includes(concept)) {
            validSuggestedVerses.push(...defaultVerses);
            break;
          }
        }
      }

      console.log('[QUERY-ROUTER] Query:', cleanMessage, '| Type:', llmQueryType, '| Suggested Verses:', parsed.suggestedVerses, '| Validated:', validSuggestedVerses);

      // For thematic queries or specific_multiple: do NOT lock surahId/ayahId — let suggestedVerses drive retrieval
      const resolvedTarget = (llmQueryType === 'thematic' || llmQueryType === 'specific_multiple')
        ? undefined
        : (surahNum ? { surah: surahNum, ayah: ayahNum } : parsedRef);

      return {
        isScopeValid: true,
        expandedQueryAr: combinedAr,
        expandedQueryEn: parsed.expandedQueryEn || cleanMessage,
        keywords: combinedKeywords,
        rootWords: combinedRoots,
        targetSurahAyah: resolvedTarget,
        suggestedVerses: validSuggestedVerses,
        queryType: llmQueryType,
        mode
      };
    }
  } catch (err) {
    console.warn('LLM 1 query routing error, using deterministic fallback:', err);
  }

  let fallbackVerses: { surah: number; ayah: number }[] = [];
  for (const [concept, defaultVerses] of Object.entries(DEFAULT_THEMATIC_VERSES)) {
    if (lowerMsg.includes(concept)) {
      fallbackVerses.push(...defaultVerses);
      break;
    }
  }

  return {
    isScopeValid: true,
    expandedQueryAr: baseArWords.join(' '),
    expandedQueryEn: cleanMessage,
    keywords: baseKeywords,
    rootWords: Array.from(new Set(baseRoots)),
    targetSurahAyah: parsedRef,
    suggestedVerses: fallbackVerses,
    queryType: parsedRef?.ayah ? 'specific' : 'thematic',
    mode
  };
}

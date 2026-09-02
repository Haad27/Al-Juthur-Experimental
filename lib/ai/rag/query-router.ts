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
  marriage: { ar: ['الزواج', 'النكاح', 'المودة', 'الرحمة'], roots: ['زوج', 'نكح', 'ودد', 'رحم'] },
  knowledge: { ar: ['العلم', 'عليم', 'العلماء', 'الحكمة'], roots: ['علم', 'حكم'] },
  worship: { ar: ['العبادة', 'إياك نعبد', 'العبودية', 'الصلاة'], roots: ['عبد', 'صلي'] },
  guidance: { ar: ['الهدى', 'اهدنا', 'الصراط', 'التقوى'], roots: ['هدي', 'وقي'] },
  light: { ar: ['النور', 'منير', 'الإشراق', 'البصيرة'], roots: ['نور', 'بصر'] },
  book: { ar: ['الكتاب', 'القرآن', 'الوحي', 'التنزيل'], roots: ['كتب', 'قرأ'] },
  lord: { ar: ['الرب', 'الربوبية', 'الألوهية', 'الخالق'], roots: ['ربب', 'أله'] },
  kingdom: { ar: ['الملك', 'المالك', 'السيادة', 'السلطان'], roots: ['ملك', 'سلط'] },
  praise: { ar: ['الحمد', 'التسبيح', 'الشكر', 'التحميد'], roots: ['حمد', 'سبح', 'شكر'] }
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

  // B. Immediate block for direct Fiqh legal rulings, fatwas, or procedural ritual rulings
  const isDirectFiqhOrFatwa = /\b(fatwa|ruling|halal|haram|permissible|impermissible|forbidden|can i marry|divorce|talaq|how to pray|wudu steps|ghusl steps|zakat calculation|calculate my zakat|inheritance calculation|inheritance share|punishment for)\b/i.test(cleanMessage);
  
  // Check if query is explicitly asking for classical Tafsir commentary of a verse rather than a ruling
  const isExplicitTafsirRequest = /\b(tafsir|commentary|exegesis|ayah|surah|verse|tabari|ibn kathir|qurtubi|baghawi|ashur)\b/i.test(cleanMessage) && (parsedRef !== null || /\b(tafsir of|meaning of verse|commentary on)\b/i.test(cleanMessage));

  if (isDirectFiqhOrFatwa && !isExplicitTafsirRequest) {
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
  const isAqeedahDebate = /\b(aqeedah|aqidah|creed debate|ashari vs|maturidi vs|athari vs|where is allah|is quran created|kalam debate)\b/i.test(cleanMessage);
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
    const isOutOfScopeForGrammar = /\b(aqidah|creed|halal|haram|fatwa|ruling|divorce|marriage|inherit|punishment|predestination|qadar)\b/i.test(cleanMessage);
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
    const isOutOfScopeForLexicon = /\b(halal|haram|fatwa|ruling|how to pray|zakat calculation)\b/i.test(cleanMessage);
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
1. **Root Word Extraction**: You MUST identify and extract ALL relevant 3-letter or 4-letter Arabic root words from the user's inquiry or referenced verses (e.g., if the user asks about 'mawaddah and rahmah', extract BOTH 'ودد' and 'رحم'; if asking about 'tranquility (sakina) and love', extract 'سكن' and 'ودد'; if asking about a specific verse, extract the primary roots present in that verse). Always return all relevant roots in the "rootWords" array.
2. **Verse Suggestion**: Provide 1 to 3 prime examples of verses where these root words are beautifully showcased in the Quran. These verses will be used to demonstrate Quranic application of the roots.
3. **UNIVERSAL AQEEDAH & FIQH GUARDRAIL**: Strictly refuse theological (Aqeedah), sectarian (e.g. Shia, Qadiani/Kadiyani, Mawlid), or Fiqh questions. Set isScopeValid to false.

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
  "rootWords": ["3-letter or 4-letter Arabic root, e.g. ودد, رحم, سكن"],
  "suggestedVerses": [{"surah": 30, "ayah": 21}]
}`
    : `You are the Light Query Preparation & Guardrail Router for a Classical Quranic RAG System.
Your task is to analyze the user's prompt in the context of the selected mode and return a strict JSON object.

ACTIVE MODE: "${mode}"
${options?.targetSurah && options?.targetAyah ? `\nCONTEXT OVERRIDE: The user is specifically inquiring about Surah ${options.targetSurah}, Ayah ${options.targetAyah}. You MUST set targetSurah: ${options.targetSurah}, targetAyah: ${options.targetAyah}, queryType: "specific", and leave suggestedVerses empty.\n` : ''}
CRITICAL INSTRUCTIONS:
1. **Arabic Translation for Vector Search**: You must extract the core concepts from the user's English query and translate them into classical Arabic keywords ("expandedQueryAr"). This is critical because our databases are primarily in Arabic. The translation depth depends on the mode (e.g., Classical and Lexicon require heavy, precise Arabic root extraction).
2. **UNIVERSAL AQEEDAH, SECTARIAN & FIQH GUARDRAIL (APPLIES TO ALL MODES, INCLUDING DEFAULT)**: 
   - If the user asks for practical religious legal rulings (Fiqh / Fatwas, e.g. "is X halal/haram?", "how to perform prayer/wudu", "ruling on divorce/inheritance/zakat"), 
   - OR asks about sectarian groups or modern controversial theological debates (e.g. Mawlid/Milad, Qadiani/Kadiyani, Shia/Shiite, Sunni vs Shia, Ashari vs Athari, Takfir):
   You MUST set "isScopeValid": false.
   You MUST set "warningMessage": "Al-Juthur AI Scholar is strictly dedicated to classical Quranic Tafsir, verse exegesis, and linguistic commentary. It does not provide Fiqh rulings (Fatwas) or engage in sectarian, polemical, or theological (Aqeedah) disputes. For binding religious edicts, please consult qualified human scholars (Ulama / Muftis)."
   Do NOT suggest switching to Default Mode or any other mode, because Al-Juthur is exclusively for Tafsir across all modes.
3. **Query Type Classification**:
   - "specific": The user explicitly mentions a SINGLE Surah:Ayah reference (e.g. "explain 2:255"). Set targetSurah/targetAyah and leave suggestedVerses empty.
   - "specific_multiple": The user explicitly mentions MULTIPLE verses (e.g. "explain 3:44 and 5:33"). Set targetSurah and targetAyah to null, and put ALL the explicitly requested verses into the "suggestedVerses" array.
   - "thematic": The user asks about a broad topic/concept WITHOUT referencing a specific verse (e.g. "what does the Quran say about patience"). Set targetSurah and targetAyah to null and you MUST populate "suggestedVerses".
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
  "rootWords": ["3-letter or 4-letter Arabic root if applicable, e.g. صبر, رحم, علم"],
  "suggestedVerses": [{"surah": 49, "ayah": 10}, {"surah": 49, "ayah": 11}] // Both surah AND ayah are strictly required for every object
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
        return {
          isScopeValid: false,
          warningMessage: parsed.warningMessage || "This specialized mode is not suitable for your inquiry. Please switch to Default Mode.",
          expandedQueryAr: parsed.expandedQueryAr || baseArWords.join(' '),
          expandedQueryEn: parsed.expandedQueryEn || cleanMessage,
          keywords: parsed.keywords || baseKeywords,
          rootWords: parsed.rootWords || baseRoots,
          targetSurahAyah: parsedRef,
          queryType: parsedRef?.ayah ? 'specific' : 'thematic',
          mode
        };
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

  return {
    isScopeValid: true,
    expandedQueryAr: baseArWords.join(' '),
    expandedQueryEn: cleanMessage,
    keywords: baseKeywords,
    rootWords: Array.from(new Set(baseRoots)),
    targetSurahAyah: parsedRef,
    suggestedVerses: [],
    queryType: parsedRef?.ayah ? 'specific' : 'thematic',
    mode
  };
}

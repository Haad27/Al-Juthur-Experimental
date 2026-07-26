import { MODE_AUTHORS } from '../../../scripts/seed_rag_modes';

export type RagMode = 'default' | 'classical' | 'grammar' | 'modern' | 'philosophical' | 'lexicon';

export interface PreparedQueryInfo {
  isScopeValid: boolean;
  warningMessage?: string;
  expandedQueryAr: string;
  expandedQueryEn: string;
  keywords: string[];
  rootWords: string[];
  targetSurahAyah?: { surah?: number; ayah?: number };
  mode: RagMode;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'; // Deprecated - Using Gemini only

/**
 * Deterministic concept-to-Arabic root dictionary for fast baseline expansion.
 */
const BASE_CONCEPT_KEYWORDS: Record<string, { ar: string[]; roots: string[] }> = {
  patience: { ar: ['الصبر', 'صبر', 'صابرين', 'الابتلاء'], roots: ['صبر', 'بلي'] },
  mercy: { ar: ['الرحمن', 'الرحيم', 'رحمة', 'الرأفة'], roots: ['رحم', 'رأف'] },
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
export async function prepareRagQuery(userMessage: string, mode: RagMode = 'default'): Promise<PreparedQueryInfo> {
  const cleanMessage = (userMessage || '').trim();
  const lowerMsg = cleanMessage.toLowerCase();
  const parsedRef = parseSurahAyah(cleanMessage);

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

  // 2. Fast deterministic guardrail checks
  if (mode === 'grammar') {
    const isAqidahOrFiqh = /\b(aqidah|creed|halal|haram|fatwa|ruling|divorce|marriage|inherit|punishment|predestination|qadar)\b/i.test(cleanMessage);
    if (isAqidahOrFiqh && !/\b(grammar|i'rab|irab|balagha|syntax|particle|rhetoric|linguistic|word|root)\b/i.test(cleanMessage)) {
      return {
        isScopeValid: false,
        warningMessage: "This mode is dedicated strictly to linguistic and grammatical extraction from classical linguists (Al-Zamakhshari, Abu Hayyan, Al-Darwish). For general rulings or theological inquiries, please switch to Default Mode.",
        expandedQueryAr: baseArWords.join(' '),
        expandedQueryEn: cleanMessage,
        keywords: baseKeywords,
        rootWords: Array.from(new Set(baseRoots)),
        targetSurahAyah: parsedRef,
        mode
      };
    }
  }

  if (mode === 'lexicon') {
    const isGeneralRuling = /\b(halal|haram|fatwa|ruling|how to pray|zakat calculation)\b/i.test(cleanMessage);
    if (isGeneralRuling && !/\b(meaning|root|word|define|dictionary|lexicon|usage|lane|mufradat|lisan)\b/i.test(cleanMessage)) {
      return {
        isScopeValid: false,
        warningMessage: "Lexicon Mode is specialized for word-level dictionary lookups and semantic root exploration (Mufradat, Lisan al-Arab, Lane's Lexicon). For general theological answers or commentary, please switch to Default Mode.",
        expandedQueryAr: baseArWords.join(' '),
        expandedQueryEn: cleanMessage,
        keywords: baseKeywords,
        rootWords: Array.from(new Set(baseRoots)),
        targetSurahAyah: parsedRef,
        mode
      };
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY is missing for Query Router.");

  const systemPrompt = `You are the Light Query Preparation & Guardrail Router for a Classical Quranic RAG System.
Your task is to analyze the user's prompt in the context of the selected mode and return a strict JSON object.

ACTIVE MODE: "${mode}"

CRITICAL INSTRUCTIONS:
1. **Arabic Translation for Vector Search**: You must extract the core concepts from the user's English query and translate them into classical Arabic keywords ("expandedQueryAr"). This is critical because our databases are primarily in Arabic. The translation depth depends on the mode (e.g., Classical and Lexicon require heavy, precise Arabic root extraction).
2. **Aqeedah & Fiqh Guardrail**: If the ACTIVE MODE is "grammar" or "lexicon", strictly refuse theological (Aqeedah), sectarian, or Fiqh questions. Set isScopeValid to false. If the mode is "default" or "philosophical", these are allowed.

OUTPUT JSON FORMAT ONLY (no markdown formatting, purely valid JSON):
{
  "isScopeValid": true or false,
  "warningMessage": "Only if isScopeValid is false, state why clearly and suggest switching to Default Mode.",
  "targetSurah": null or exact Surah number (1 to 114) if the query mentions a specific Surah (e.g. Al-Fatihah is 1),
  "targetAyah": null or exact Ayah number if mentioned,
  "expandedQueryAr": "Exact classical Arabic keywords, vocabulary, and synonyms corresponding to the query for BM25 matching against classical texts. (Must be in Arabic script)",
  "expandedQueryEn": "Expanded English terminology and synonyms.",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "rootWords": ["3-letter or 4-letter Arabic root if applicable, e.g. صبر, رحم, علم"]
}`;

  try {
    let rawJsonText = '';

    // Prioritize direct Gemini API
    if (geminiKey) {
      const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
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
                maxOutputTokens: 500
              }
            })
          });
          if (res.ok) {
            const data = await res.json();
            rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawJsonText) break;
          }
        } catch (e) {
          console.warn(`Query Router API error with ${modelName}:`, e);
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

      return {
        isScopeValid: true,
        expandedQueryAr: combinedAr,
        expandedQueryEn: parsed.expandedQueryEn || cleanMessage,
        keywords: combinedKeywords,
        rootWords: combinedRoots,
        targetSurahAyah: surahNum ? { surah: surahNum, ayah: ayahNum } : parsedRef,
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
    mode
  };
}

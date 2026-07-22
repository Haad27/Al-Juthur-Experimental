import { MODE_AUTHORS } from '../../../scripts/seed_rag_modes';

export type RagMode = 'default' | 'classical' | 'grammar' | 'modern' | 'philosophical' | 'lexicon';

export interface PreparedQueryInfo {
  isScopeValid: boolean;
  warningMessage?: string;
  expandedQueryAr: string;
  expandedQueryEn: string;
  keywords: string[];
  rootWords: string[];
  targetSurahAyah?: { surah: number; ayah: number };
  mode: RagMode;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

/**
 * Parses explicit Surah:Ayah coordinates (e.g. "2:255", "Surah 2 Ayah 255").
 */
export function parseSurahAyah(text: string): { surah: number; ayah: number } | undefined {
  if (!text) return undefined;
  const clean = text.toLowerCase().trim();

  const colonMatch = clean.match(/\b(\d{1,3})\s*:\s*(\d{1,3})\b/);
  if (colonMatch) {
    const s = parseInt(colonMatch[1], 10);
    const a = parseInt(colonMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1 && a <= 286) return { surah: s, ayah: a };
  }

  const verbalMatch = clean.match(/\b(?:surah|sura|ch|chapter)\s*(\d{1,3})\s*(?:ayah|ayat|verse|v)?\s*(\d{1,3})\b/);
  if (verbalMatch) {
    const s = parseInt(verbalMatch[1], 10);
    const a = parseInt(verbalMatch[2], 10);
    if (s >= 1 && s <= 114 && a >= 1 && a <= 286) return { surah: s, ayah: a };
  }

  return undefined;
}

/**
 * LLM 1: Query Rewriter, Scope Guardrail Check, and Arabic Vocabulary Expansion.
 * Uses lightweight/free-tier models (`meta-llama/llama-3.1-8b-instruct` / `gemini-2.5-flash`).
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

  // 2. Perform fast deterministic check for out-of-scope intent in specialized modes before LLM call
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

  // 3. Call Light LLM (OpenRouter Llama / Gemini Flash) to rewrite query for maximum BM25 & Vector recall
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `You are the Light Query Preparation & Guardrail Router for a Classical Quranic RAG System.
Your task is to analyze the user's prompt in the context of the selected mode and return a strict JSON object.

ACTIVE MODE: "${mode}"
MODE DESCRIPTION:
- default: Balanced & comprehensive commentary (Ibn Kathir, Tabari, Baghawi, Qurtubi, Ibn Ashur). Valid for any general Quranic query.
- classical: Early Ma'thur & Athar narrations from Sahabah and Salaf (Ibn Kathir, Tabari, Suyuti).
- grammar: Linguistic syntax, i'rab, rhetorical structure, and particle usage (Zamakhshari, Abu Hayyan, Darwish). NOTE: If user asks aqidah (creed) or general legal verdicts (fiqh) without linguistic context, set isScopeValid=false.
- modern: Macro-themes, maqasid, and contemporary application (Ibn Ashur, Shanqiti, Tantawi).
- philosophical: Kalam, theological proofs, and systematic logic (Al-Razi, Al-Alusi, Baydawi). NOTE: If user asks basic fiqh rulings, set isScopeValid=false.
- lexicon: Word roots, semantic definitions, and dictionary usage (Mufradat, Lisan al-Arab, Maqayis, Lane's).

OUTPUT JSON FORMAT ONLY (no markdown formatting, purely valid JSON):
{
  "isScopeValid": true or false,
  "warningMessage": "Only if isScopeValid is false, state why clearly and suggest switching to Default Mode.",
  "expandedQueryAr": "Exact classical Arabic keywords, vocabulary, and synonyms corresponding to the query for BM25 matching against classical texts.",
  "expandedQueryEn": "Expanded English terminology and synonyms.",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "rootWords": ["3-letter or 4-letter Arabic root if applicable, e.g. صبر, رحم, علم"]
}`;

  try {
    let rawJsonText = '';

    // Try Gemini Flash / Flash-Lite first if available
    if (geminiKey) {
      const models = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
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
        } catch (e) {}
      }
    }

    // Try OpenRouter Llama-3.1-8B-Instruct if Gemini didn't return or not set
    if (!rawJsonText && openRouterKey) {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Al-Juthur RAG Router',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanMessage }
          ],
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        rawJsonText = data.choices?.[0]?.message?.content || '';
      }
    }

    if (rawJsonText) {
      // Parse JSON response
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
        targetSurahAyah: parsedRef,
        mode
      };
    }
  } catch (err) {
    console.warn('LLM 1 query routing error, using deterministic fallback:', err);
  }

  // Fallback return if LLM unavailable
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

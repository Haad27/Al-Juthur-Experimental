import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { prepareRagQuery, RagMode } from '@/lib/ai/rag/query-router';
import { searchHybrid, ScoredParentDocument } from '@/lib/ai/rag/hybrid-search';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message;
    const mode: RagMode = body.mode || 'default';

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = checkRateLimit(`rag_${ip}`, 50, 24 * 60 * 60 * 1000); // 50 requests per 24 hours
    
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Daily free RAG request limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openRouterKey && !geminiKey) {
      return NextResponse.json(
        { success: false, error: 'API Keys missing from environment variables.' },
        { status: 500 }
      );
    }

    // 1. Run LLM 1 Query Rewriter & Scope Guardrail Check (prioritizing Gemini)
    const preparedQuery = await prepareRagQuery(message, mode);

    if (!preparedQuery.isScopeValid) {
      return NextResponse.json({
        success: true,
        isScopeInvalid: true,
        text: preparedQuery.warningMessage || "This inquiry is out of scope for the selected mode. Please switch to Default Mode.",
        sources: [],
        remaining: limit.remaining
      });
    }

    // 2. Perform Hybrid Search (BM25 + Vector + Mode & exact Surah filtering)
    const documents = await searchHybrid(
      message,
      {
        mode,
        surahId: preparedQuery.targetSurahAyah?.surah,
        ayahId: preparedQuery.targetSurahAyah?.ayah,
        keywords: preparedQuery.keywords,
        expandedQueryAr: preparedQuery.expandedQueryAr,
        rootWord: preparedQuery.rootWords?.[0]
      },
      8
    );

    // 3. Format Context and Sources for Grounded Synthesis
    let contextText = '';
    const retrievedSources: Array<{
      id: string;
      book: string;
      authorName: string;
      surah?: number | null;
      ayah?: number | null;
      rootWord?: string | null;
      snippet: string;
      workType: 'tafsir' | 'lexicon';
    }> = [];

    if (documents && documents.length > 0) {
      contextText = "\n\n### Retrieved Authentic Classical Passages for Mode [" + mode.toUpperCase() + "]:\n" +
        documents.map((doc: ScoredParentDocument, idx: number) => {
          const ref = doc.surahId && doc.ayahId
            ? `Surah ${doc.surahId}:${doc.ayahId}`
            : doc.rootWord
              ? `Root [${doc.rootWord}]`
              : 'Classical Text';
          return `[Source ${idx + 1}: ${doc.workTitle} (${doc.authorName}) | ${ref} | Lang: ${doc.language.toUpperCase()}]\n${doc.content.substring(0, 2500)}`;
        }).join("\n\n---\n\n");

      documents.forEach((doc: ScoredParentDocument) => {
        retrievedSources.push({
          id: doc.id,
          book: doc.workTitle,
          authorName: doc.authorName,
          surah: doc.surahId,
          ayah: doc.ayahId,
          rootWord: doc.rootWord,
          snippet: doc.content.substring(0, 180),
          workType: doc.workType
        });
      });
    }

    const systemPrompt = `You are a rigorous, scholarly Quranic RAG Synthesis Engine strictly grounded in canonical Quranic structure and the provided authentic classical texts.
Your task is to answer the user's inquiry accurately using ONLY the retrieved classical passages provided below and exact canonical Quranic knowledge.

ACTIVE RAG MODE: "${mode.toUpperCase()}"

CRITICAL MANDATORY FACTUALITY & ANTI-HALLUCINATION RULES:
1. ZERO FABRICATION OF QURANIC VERSES OR STRUCTURE: You MUST NEVER invent, fabricate, or hallucinate Quranic verses, Arabic texts, surah names, or ayah counts.
2. EXACT SURAH STRUCTURE:
   - Surah Al-Fatihah (Surah 1) has EXACTLY 7 verses (Ayahs 1:1 to 1:7). NEVER invent verses 8, 9, 10, 11, or 12 for Al-Fatihah.
   - Every Surah in the Quran has a fixed canonical number of verses (e.g. Al-Baqarah has 286, Al-Ikhlas has 4). If summarizing any surah, ONLY state its real canonical structure and exact verses.
3. STRICT SCHOLARLY ATTRIBUTION: Never invent opinions or rulings from outside the provided context. Every major claim or point MUST cite the exact source name in brackets, for example: [Tafsir Ibn Kathir, Surah 1:1] or [Lisan al-Arab, Root صبر].
4. CLEAR & STRUCTURED: Organize your response into neat markdown sections with bullet points or bold headers.
5. If the retrieved context does not contain enough information to fully answer the specific question, state clearly what is available in the sources.

${contextText}`;

    let responseText = '';

    // Prioritize Gemini models (gemini-2.5-flash / gemini-1.5-flash) via Google Gemini API first per user instruction
    if (geminiKey) {
      const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
      for (const modelName of models) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER INQUIRY: ${message}` }] }
              ],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
            }),
          });

          if (res.ok) {
            const data = await res.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (responseText) break;
          }
        } catch (e) {
          console.warn(`Gemini API synthesis error with ${modelName}:`, e);
        }
      }
    }

    // Try Gemini models on OpenRouter second (or fallback to other strong models) if direct Gemini key not available/failed
    if (!responseText && openRouterKey) {
      const openRouterModels = [
        'google/gemini-2.5-flash',
        'google/gemini-flash-1.5',
        'google/gemini-pro-1.5',
        'meta-llama/llama-3.1-8b-instruct'
      ];

      for (const model of openRouterModels) {
        try {
          const payload = {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            temperature: 0.1,
            max_tokens: 2000
          };

          const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Al-Juthur RAG Synthesis',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = await res.json();
            responseText = data.choices?.[0]?.message?.content || '';
            if (responseText) break;
          }
        } catch (e) {
          console.warn(`OpenRouter synthesis error with ${model}:`, e);
        }
      }
    }

    if (!responseText) {
      throw new Error('Failed to generate synthesis from AI models.');
    }

    // Deduplicate sources by book + surah:ayah or root
    const uniqueSourcesMap = new Map<string, typeof retrievedSources[0]>();
    retrievedSources.forEach((src) => {
      const key = `${src.book}_${src.surah || ''}_${src.ayah || ''}_${src.rootWord || ''}`;
      if (!uniqueSourcesMap.has(key)) {
        uniqueSourcesMap.set(key, src);
      }
    });

    return NextResponse.json({
      success: true,
      text: responseText,
      sources: Array.from(uniqueSourcesMap.values()),
      remaining: limit.remaining
    });
  } catch (error: any) {
    console.error('RAG Engine Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

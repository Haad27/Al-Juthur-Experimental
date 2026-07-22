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

    // 1. Run LLM 1 Query Rewriter & Scope Guardrail Check
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

    // 2. Perform Hybrid Search (BM25 + Vector + Mode filtering)
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
      6
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

    const systemPrompt = `You are a scholarly RAG Synthesis Engine strictly grounded in the provided classical Quranic texts.
Your task is to answer the user's inquiry directly using ONLY the retrieved classical passages provided in the context.

ACTIVE RAG MODE: "${mode.toUpperCase()}"

MANDATORY RULES:
1. STRICT SCHOLARLY ATTRIBUTION: Never invent opinions or rulings from outside the provided context. Every major claim or point MUST cite the exact source name in brackets, for example: [Tafsir Ibn Kathir, Surah 2:255] or [Lisan al-Arab, Root صبر].
2. MULTILINGUAL CLARITY: If quoting from Arabic sources, provide clear, accurate English translations alongside the terminology.
3. CLEAR & STRUCTURED: Organize your response into neat markdown sections with bullet points or bold headers.
4. If the retrieved context does not contain enough information to fully answer the specific question, state clearly what is available in the sources and mention that further classical commentary may be consulted.

${contextText}`;

    let responseText = '';

    // Try Llama-3.1-8B-Instruct via OpenRouter first (ultra-cheap, fast, reliable, perfect for free tier)
    if (openRouterKey) {
      try {
        const payload = {
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.2,
          max_tokens: 1500
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
        }
      } catch (e) {
        console.warn('OpenRouter synthesis error, falling back to Gemini:', e);
      }
    }

    // Fallback to Gemini 2.5 Flash if OpenRouter failed or not set
    if (!responseText && geminiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUSER INQUIRY: ${message}` }] }
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
          }),
        });

        if (res.ok) {
          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn('Gemini synthesis error:', e);
      }
    }

    if (!responseText) {
      throw new Error('Failed to generate synthesis from free-tier AI models.');
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

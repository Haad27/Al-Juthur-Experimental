import { NextRequest, NextResponse } from 'next/server';
import { checkUserQuota } from '@/lib/ai/quota-manager';
import { executeWithFallback } from '@/lib/ai/model-router';
import { estimateTokens } from '@/lib/ai/token-budget';
import { prepareRagQuery, RagMode } from '@/lib/ai/rag/query-router';
import { searchHybrid, ScoredParentDocument } from '@/lib/ai/rag/hybrid-search';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message;
    const mode: RagMode = body.mode || 'default';

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Quick token estimate for initial limit check
    const estimatedInputTokens = estimateTokens(message) + 1500; // rough baseline for retrieved context + prompt
    const quota = await checkUserQuota(ip, estimatedInputTokens);
    
    if (!quota.allowed) {
      return NextResponse.json(
        { success: false, error: 'Daily free RAG token limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY missing from environment variables.' },
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
        remaining: quota.remaining
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

    let modeSpecificRole = '';
    switch (mode) {
      case 'default':
        modeSpecificRole = 'Synthesize a comprehensive, structured answer using only the provided texts. Blend authentic narration with analytical clarity. First, extract the core meaning from the texts, then expand upon it for clarity. Adhere strictly to the universal guardrails regarding Fiqh and sectarian debates.';
        break;
      case 'classical':
        modeSpecificRole = 'You are a traditional Muhaddith. Focus strictly on historical narrations, reports from the Sahabah, and isnad-grounded exegesis from the retrieved texts. Do not provide modern contextualizations. Cite exact narrators. Do not engage in any theological or jurisprudential debates beyond what is explicitly quoted in the early texts.';
        break;
      case 'grammar':
        modeSpecificRole = 'You are a master of classical Arabic syntax (Nahw) and rhetoric (Balagha). Deconstruct the grammatical architecture and word morphology of the Ayah based on the provided texts. STRICT GUARDRAIL: You must absolutely refuse to answer any theological (Aqeedah), sectarian, or Fiqh question in this mode. Direct the user to Default mode instead. Only discuss linguistics.';
        break;
      case 'modern':
        modeSpecificRole = 'Focus on Maqasid al-Shariah (higher objectives). Connect the retrieved Quranic principles to societal realities, legislative wisdom, and holistic thematic relationships. Maintain a high academic standard. Do not issue modern legal fatwas; only discuss legislative wisdom as framed by the retrieved scholars.';
        break;
      case 'philosophical':
        modeSpecificRole = 'You are a master of scholastic theology (Ilm al-Kalam). Engage with deep rational arguments and logical proofs. Use rigorous, systematic logic to synthesize the answer based ONLY on the provided retrieved context. Maintain strict academic neutrality on sectarian differences.';
        break;
      case 'lexicon':
        modeSpecificRole = 'You are an expert Arabic lexicographer. Focus strictly on root semantics, word definitions, and morphological forms using the retrieved dictionaries. STRICT GUARDRAIL: Do not provide full verse exegesis, theological commentary, or practical rulings. Restrict your answer entirely to the linguistic journey of the root word.';
        break;
    }

    const systemPrompt = `You are a strictly academic Islamic AI researcher. You must base every claim on the provided retrieved texts. Do NOT hallucinate. 
CRITICAL GUARDRAILS: If the user asks about sectarian differences (e.g., Sunni vs Shia), modern political issues, or deeply contentious Fiqh (jurisprudence) debates, you MUST remain strictly academic. Do not take a side, do not issue legal rulings (fatwas), and do not entertain polemical or exploitative prompts. State what the provided classical texts say objectively, and note if the topic falls outside the retrieved scope.

MODE DIRECTIVE: ${modeSpecificRole}

ACTIVE RAG MODE: "${mode.toUpperCase()}"

CRITICAL MANDATORY FACTUALITY RULES:
1. ZERO FABRICATION OF QURANIC VERSES OR STRUCTURE.
2. EXACT SURAH STRUCTURE (e.g., Al-Fatihah has EXACTLY 7 verses).
3. STRICT SCHOLARLY ATTRIBUTION: Every major claim MUST cite the exact source name in brackets (e.g., [Tafsir Ibn Kathir, Surah 1:1]).
4. CLEAR & STRUCTURED: Organize your response into neat markdown sections.

${contextText}`;

    // Calculate actual estimated tokens before running LLM 2
    const totalEstimatedTokensForExecution = estimateTokens(systemPrompt + message) + 1000; // +1000 for expected output
    
    // Check if we still have quota for this exact size (in case it's huge)
    const exactQuotaCheck = await checkUserQuota(ip, totalEstimatedTokensForExecution);
    if (!exactQuotaCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Daily free RAG token limit reached for this query size.' }, { status: 429 });
    }

    // 4. Execute Multi-Model Fallback Chain
    const execution = await executeWithFallback(mode, systemPrompt, message, ip, totalEstimatedTokensForExecution);

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
      text: execution.text,
      sources: Array.from(uniqueSourcesMap.values()),
      remaining: exactQuotaCheck.remaining,
      modelUsed: execution.modelUsed
    });
  } catch (error: any) {
    console.error('RAG Engine Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

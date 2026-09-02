import { NextRequest, NextResponse } from 'next/server';
import { checkUserQuota } from '@/lib/ai/quota-manager';
import { executeWithFallback, executeWithFallbackStream } from '@/lib/ai/model-router';
import { estimateTokens } from '@/lib/ai/token-budget';
import { prepareRagQuery, RagMode } from '@/lib/ai/rag/query-router';
import { searchHybrid, ScoredParentDocument } from '@/lib/ai/rag/hybrid-search';
import { getLexiconEntriesForRoot, getAyahWords } from '@/lib/lexicon/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message;
    const mode: RagMode = body.mode || 'default';
    const targetSurah = body.targetSurah ? Number(body.targetSurah) : undefined;
    const targetAyah = body.targetAyah ? Number(body.targetAyah) : undefined;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Quick token estimate for initial limit check
    const estimatedInputTokens = estimateTokens(message) + 1500; // rough baseline for retrieved context + prompt
    const quota = await checkUserQuota(ip, estimatedInputTokens);
    
    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Daily AI research quota reached. Upgrade to Pro or Patron to continue your research without limits.",
          isQuotaExceeded: true,
        },
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
    const preparedQuery = await prepareRagQuery(message, mode, { targetSurah, targetAyah });

    if (targetSurah && targetAyah) {
      preparedQuery.targetSurahAyah = { surah: targetSurah, ayah: targetAyah };
      preparedQuery.queryType = 'specific';
      preparedQuery.suggestedVerses = [{ surah: targetSurah, ayah: targetAyah }];
    }

    console.log('[RAG-ROUTE] LLM1 Result:', {
      isScopeValid: preparedQuery.isScopeValid,
      queryType: preparedQuery.queryType,
      suggestedVerses: preparedQuery.suggestedVerses,
      targetSurahAyah: preparedQuery.targetSurahAyah,
      keywords: preparedQuery.keywords,
      rootWords: preparedQuery.rootWords,
      expandedQueryAr: preparedQuery.expandedQueryAr?.substring(0, 100),
    });

    if (!preparedQuery.isScopeValid) {
      return NextResponse.json({
        success: true,
        isScopeInvalid: true,
        text: preparedQuery.warningMessage || "Al-Juthur AI Scholar is strictly dedicated to classical Quranic Tafsir, verse exegesis, and linguistic commentary. It does not provide Fiqh rulings (Fatwas) or engage in sectarian/theological (Aqeedah) disputes. Please consult certified human scholars (Ulama / Muftis) for binding religious edicts.",
        sources: [],
        remaining: quota.remaining
      });
    }

    // 2. Perform Retrieval
    let documents: ScoredParentDocument[] = [];
    if (mode === 'lexicon') {
      // Lexicon Dual-Retrieval Strategy
      // If a specific verse is targeted and rootWords is empty or needs verse roots
      if (preparedQuery.targetSurahAyah?.surah && preparedQuery.targetSurahAyah?.ayah) {
        try {
          const ayahWords = await getAyahWords(preparedQuery.targetSurahAyah.surah, preparedQuery.targetSurahAyah.ayah);
          const verseRoots = ayahWords
            .map((w: any) => w.root)
            .filter((r: any): r is string => !!r && r.trim().length > 0);
          
          if (!preparedQuery.rootWords || preparedQuery.rootWords.length === 0) {
            preparedQuery.rootWords = Array.from(new Set(verseRoots));
          }
        } catch (e) {
          console.error('Error fetching ayah words for lexicon mode:', e);
        }
      }

      // A. Lexicon Dictionary Retrieval for Root(s)
      if (preparedQuery.rootWords && preparedQuery.rootWords.length > 0) {
        for (const root of preparedQuery.rootWords) {
          const lexResult = await getLexiconEntriesForRoot(root);
          for (const entry of lexResult.entries) {
            const fullContent = entry.definitions.join('\n\n');
            if (fullContent.trim().length > 0) {
              documents.push({
                id: `lexicon-${entry.dictIdent}-${root}`,
                workType: 'lexicon',
                authorId: entry.dictId,
                authorName: entry.dictName,
                workTitle: entry.dictName,
                language: entry.isEnglish ? 'en' : 'ar',
                surahId: null,
                ayahId: null,
                rootWord: root,
                content: fullContent,
                rrfScore: 1.0,
                matchedChildSnippets: [fullContent.substring(0, 300)],
                relevanceExplanation: `Lexicon definition for root [${root}] from ${entry.dictName}`
              });
            }
          }
        }
      }
      
      // B. Quranic Usage Retrieval for Suggested Verses
      if (preparedQuery.suggestedVerses && preparedQuery.suggestedVerses.length > 0) {
         const verseDocs = await searchHybrid(
           message,
           {
             mode: 'default', // trick to fetch tafsir
             suggestedVerses: preparedQuery.suggestedVerses
           },
           4 // pull a few short tafsir snippets for context
         );
         // Limit to just 2 tafsir entries to prevent token bloat
         documents = [...documents, ...verseDocs.slice(0, 2)];
      }
    } else {
      // 2. Perform Hybrid Search (BM25 + Vector + Mode & exact Surah filtering)
      const isThematic = !targetSurah && (preparedQuery.queryType === 'thematic' || preparedQuery.queryType === 'specific_multiple');
      documents = await searchHybrid(
        message,
        {
          mode,
          surahId: targetSurah || (isThematic ? undefined : preparedQuery.targetSurahAyah?.surah),
          ayahId: targetAyah || (isThematic ? undefined : preparedQuery.targetSurahAyah?.ayah),
          keywords: preparedQuery.keywords,
          expandedQueryAr: preparedQuery.expandedQueryAr,
          rootWord: preparedQuery.rootWords?.[0],
          suggestedVerses: targetSurah && targetAyah ? [{ surah: targetSurah, ayah: targetAyah }] : preparedQuery.suggestedVerses
        },
        8 // Top 8 relevant rule blocks
      );
    }

    console.log('[RAG-ROUTE] Hybrid Search returned', documents.length, 'docs:', documents.map(d => ({
      id: d.id,
      surah: d.surahId,
      ayah: d.ayahId,
      author: d.authorName,
      explanation: d.relevanceExplanation
    })));

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
      workType: 'tafsir' | 'lexicon' | 'textbook';
    }> = [];

    if (documents && documents.length > 0) {
      contextText = "\n\n### Retrieved Authentic Classical Passages for Mode [" + mode.toUpperCase() + "]:\n" +
        documents.map((doc: ScoredParentDocument, idx: number) => {
          const ref = doc.surahId && doc.ayahId
            ? `Surah ${doc.surahId}:${doc.ayahId}`
            : doc.rootWord
              ? `Root [${doc.rootWord}]`
              : 'Classical Text';
              
          // 1. Include the beginning of the entry to provide introductory context (isnad, primary opinion)
          let docText = doc.content.substring(0, 1500);
          
          // 2. Stitch in the exact snippets that triggered the vector/keyword match if they are deep in the text
          if (doc.matchedChildSnippets && doc.matchedChildSnippets.length > 0) {
            // Deduplicate snippets (BM25 and Vector might match the same chunk)
            const uniqueSnippets = Array.from(new Set(doc.matchedChildSnippets));
            const extraSnippets = uniqueSnippets
              .map(s => s.trim())
              // Prevent duplication: if the snippet is already in the first 1500 chars, skip it
              .filter(s => s.length > 50 && !docText.includes(s.substring(0, 50)))
              .join('\n\n... [Continuation] ...\n');
              
            if (extraSnippets.length > 0) {
              docText += '\n\n... [Relevant Excerpts Deep Within The Text] ...\n' + extraSnippets.substring(0, 2000);
            }
          }

          return `[Source ${idx + 1}: ${doc.workTitle} (${doc.authorName}) | ${ref} | Lang: ${doc.language.toUpperCase()}]\n${docText}`;
        }).join("\n\n---\n\n");

      documents.forEach((doc: ScoredParentDocument) => {
        const cleanContent = doc.content.replace(/<[^>]*>?/gm, '');
        retrievedSources.push({
          id: doc.id,
          book: doc.workTitle,
          authorName: doc.authorName,
          surah: doc.surahId,
          ayah: doc.ayahId,
          rootWord: doc.rootWord,
          snippet: cleanContent.substring(0, 180),
          workType: doc.workType
        });
      });
    }

    let modeSpecificRole = '';
    switch (mode) {
      case 'default':
        modeSpecificRole = 'Synthesize a comprehensive, structured answer using only the provided texts. Blend authentic narration with analytical clarity. First, extract the core meaning from the texts, then expand upon it for clarity. Adhere strictly to the universal guardrails: this system is exclusively for Quranic Tafsir and does NOT issue Fiqh rulings or engage in sectarian/theological debates.';
        break;
      case 'classical':
        modeSpecificRole = 'You are a classical scholar. Focus strictly on historical narrations, reports from the Sahabah, and isnad-grounded exegesis from the retrieved texts. Do not provide modern contextualizations. Cite exact narrators. Do not engage in any theological or jurisprudential debates beyond what is explicitly quoted in the early texts.';
        break;
      case 'grammar':
        modeSpecificRole = 'You are a master of classical Arabic syntax (Nahw) and rhetoric (Balagha). Deconstruct the grammatical architecture and word morphology of the Ayah based on the provided texts. STRICT GUARDRAIL: You must absolutely refuse to answer any theological (Aqeedah), sectarian, or Fiqh question. Only discuss linguistics and grammatical structure.';
        break;
      case 'modern':
        modeSpecificRole = 'You are a modern and contemporary scholar. You have to connect to our societal realities, wisdom, and thematic relationships, incorporating modern psychology while maintaining focus on the text and keeping a high academic standard. Do not issue modern legal fatwas; only discuss legislative wisdom as framed by the retrieved scholars.';
        break;
      case 'philosophical':
        modeSpecificRole = 'You are an intellectual and philosophical scholar. Engage with deep logical arguments and philosophical reasoning. Use systematic thinking to synthesize the answer based ONLY on the provided retrieved context. Maintain strict academic neutrality and keep terms clear and accessible without using complex scholastic/kalami terminology.';
        break;
      case 'lexicon':
        modeSpecificRole = 'You are an expert Arabic lexicographer and Quranic linguist. Your response must follow a strict structure:\n\n1. Lexical & Root Analysis: (Devote 80% of your response to this). Dive deep into the root semantics, classical meanings, and morphology. You MUST synthesize definitions by actively comparing the provided classical Arabic lexicons (e.g., Lisan al-Arab, Maqayis al-Lughah, Mufradat) alongside English lexicons (Lane\'s).\n\n2. Quranic Application: (Devote 20% of your response to this). Connect the root word\'s classical meaning directly to the Quran. Use the retrieved verses to explain the majestic rhetorical precision of why Allah used this specific root in that context.\n\n3. Gem from this Root Word: Provide a dedicated section titled \'### Gem from this Root Word\' before the suggested follow-ups.\n\nSTRICT GUARDRAIL: Do not provide modern fatwas or general theological debates. Keep it strictly linguistic and profoundly Quranic.';
        break;

    }

    const systemPrompt = `You are Sheikh Juthur, an expert, compassionate Islamic scholar and teacher (Murabbi). You treat the user as your dedicated student seeking sacred knowledge. 
Your tone must be polite, deeply scholarly, nurturing, and academically rigorous. Your answers should be profound and explore the deep intricacies of the subject matter—do not settle for simple or surface-level explanations; go into great depth. When explaining complex concepts, you should strive to provide at least one clear example or analogy to help your student understand. 
Every claim or answer you provide MUST be firmly grounded in and explicitly referenced from the provided retrieved classical texts. Do NOT hallucinate.
${targetSurah && targetAyah ? `\nTARGET VERSE MANDATE: The student is specifically inquiring about Surah ${targetSurah}, Ayah ${targetAyah}. You must ground your explanation and your 'Gem from this Ayat' specifically in Surah ${targetSurah}, Ayah ${targetAyah} using the provided classical commentaries.\n` : ''}

GREETING RULE: Keep your opening greeting extremely brief (at most 1 short sentence, e.g., "As-salamu alaykum, seeker of knowledge." or "Bismillah, student of knowledge."). Do NOT write long introductory paragraphs, elaborate salutations, or multiple sentences of greeting—jump straight into the core classical tafsir and analysis!

CRITICAL GUARDRAILS (STRICT & UNIVERSAL ACROSS ALL MODES): 
1. TAFSIR-ONLY MANDATE & ZERO FATWA/FIQH POLICY: You are exclusively a Quranic Tafsir (exegesis) and linguistic research engine. You must NEVER issue religious legal rulings (fatwas), declare acts halal or haram, or provide procedural fiqh instructions. If a student inquires about practical fiqh, fatwas, or legal judgments, explicitly state that you are strictly dedicated to Quranic Tafsir and advise them to consult certified human scholars (Ulama / Muftis) for binding religious rulings.
2. STRICT SECTARIAN & THEOLOGICAL (AQEEDAH) PROHIBITION: You must NEVER engage in sectarian debates (e.g. Sunni vs Shia, Qadiani/Ahmadiyya, Mawlid controversies, Deobandi vs Barelvi) or theological polemics (Aqeedah/Kalam creed disputes, takfir). If asked about such topics, state clearly that your mandate is strictly limited to authentic classical Quranic exegesis and decline engaging in sectarian controversies.
3. OUT-OF-SCOPE & WORLDLY QUERIES: If the student asks about worldly matters unrelated to Quranic exegesis (e.g., buying luxury cars, tech support, modern pop culture), do NOT give a generic, robotic refusal. Instead, respond with the polite, wise tone of a traditional scholar. Gently advise the student to refocus their intellectual pursuits on sacred knowledge, and remind them that your expertise is strictly dedicated to the Quran and classical exegesis.

MODE DIRECTIVE: ${modeSpecificRole}

ACTIVE RAG MODE: "${mode.toUpperCase()}"

CRITICAL MANDATORY FACTUALITY RULES:
1. ZERO FABRICATION OF QURANIC VERSES OR STRUCTURE.
2. EXACT SURAH STRUCTURE (e.g., Al-Fatihah has EXACTLY 7 verses).
3. STRICT SCHOLARLY ATTRIBUTION: Every major claim MUST cite the exact source name in brackets (e.g., [Tafsir Ibn Kathir, Surah 1:1]).
4. CLEAR & STRUCTURED: Organize your response into neat markdown sections for your student.
5. FOLLOW-UP SUGGESTIONS: Always append 3 concise, short suggested follow-up questions at the very end of your response under the heading '### Suggested Follow-ups'. Format them as a bulleted list. Ensure the questions are brief.
6. VERSE FORMATTING RULE: Whenever you quote or translate a Quranic verse in ANY mode, ALWAYS place it in a markdown blockquote (e.g. > "Verse text..." [Surah X:Y]). Never embed Quranic verse quotes inside plain text paragraphs.
7. GEM / MIRACLE OF QURAN / ROOT GEM: Before the suggested follow-ups, include a dedicated section titled:
- In Lexicon mode: '### Gem from this Root Word' (Provide one profound, mind-blowing lexical insight about the root's core linguistic origin, classical nuance, or morphological beauty).
- In Grammar mode: '### Miracle of Quran' (Provide a profound grammatical/balagha subtlety).
- In all other modes: '### Gem from this Ayat' (Provide a profound tafsir or thematic point).
8. UNRETRIEVED TOPICS: If the user asks about multiple topics but the retrieved texts only cover the main one, DO NOT invent or hallucinate answers for the unretrieved topics. Answer the main topic using the provided texts, and at the very end of your response (before the suggested follow-ups), explicitly ask the user if they want to proceed to the unaddressed topics (e.g., "You also asked about [Topic X and Topic Y]. Since we focused on [Main Topic] here, if this is clear, should we explore those next?").
9. MULTI-VERSE THEMATIC COVERAGE: When the retrieved texts span MULTIPLE different verses (e.g. sources from 4:19, 2:228, 65:6, 30:21), you MUST touch on ALL of them. Dedicate a section or paragraph to each verse. Do NOT deep-dive exhaustively into just one verse and ignore the rest. Give balanced coverage across all retrieved verses so the student gets a holistic Quranic perspective on the topic. If they want to go deeper into a specific verse, they can ask.
10. EQUAL SOURCE CITATION: You MUST actively cite and quote from ALL the different scholars/authors provided in the retrieved texts (e.g. if Tabari, Ibn Kathir, and Qurtubi are retrieved, you must quote all of them). Do not rely heavily on just one author and ignore the rest. Give equal weight and citation to all retrieved authors to provide a rich, multi-scholar perspective.

${contextText}`;

    // Calculate actual estimated tokens before running LLM 2
    const totalEstimatedTokensForExecution = estimateTokens(systemPrompt + message) + 1000; // +1000 for expected output
    
    // Check if we still have quota for this exact size (in case it's huge)
    const exactQuotaCheck = await checkUserQuota(ip, totalEstimatedTokensForExecution);
    if (!exactQuotaCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Daily free RAG token limit reached for this query size.' }, { status: 429 });
    }

    // 4. Execute Multi-Model Fallback Chain for Streaming
    const execution = await executeWithFallbackStream(mode, systemPrompt, message, ip, totalEstimatedTokensForExecution);

    // Deduplicate sources by book + surah:ayah or root
    const uniqueSourcesMap = new Map<string, typeof retrievedSources[0]>();
    retrievedSources.forEach((src) => {
      const key = `${src.book}_${src.surah || ''}_${src.ayah || ''}_${src.rootWord || ''}`;
      if (!uniqueSourcesMap.has(key)) {
        uniqueSourcesMap.set(key, src);
      }
    });
    
    const uniqueSources = Array.from(uniqueSourcesMap.values());

    const customStream = new ReadableStream({
      async start(controller) {
        // Enqueue metadata first
        const meta = {
          type: "metadata",
          sources: uniqueSources,
          remaining: exactQuotaCheck.remaining,
          modelUsed: execution.modelUsed
        };
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(meta)}\n\n`));

        // Pipe the LLM text chunks
        const reader = execution.stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('RAG Engine Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const quota = await checkUserQuota(ip, 0);
    return NextResponse.json({ success: true, remaining: quota.remaining, limit: 250000 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

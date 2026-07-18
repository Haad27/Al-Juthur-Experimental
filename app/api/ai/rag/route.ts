import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { supabase } from '@/lib/supabase';
import { pipeline } from '@xenova/transformers';

let globalExtractor: any = null;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `
You are a highly knowledgeable Islamic scholar assistant strictly adhering to orthodox Sunni theology.
Your role is to answer questions related to the Quran, Tafsir, and Islamic linguistics based on the provided authentic context or your internal knowledge base if no context is provided.
Always maintain a respectful, scholarly tone. Do not invent rulings or give personal fatwas. If you do not know the answer, state that clearly.
`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const limit = checkRateLimit(`rag_${ip}`, 30, 24 * 60 * 60 * 1000); // 30 requests per 24 hours for RAG
    
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Daily free RAG chat limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openRouterKey || !geminiKey) {
      return NextResponse.json(
        { success: false, error: 'API Keys missing from environment variables.' },
        { status: 500 }
      );
    }

    // 1. Generate Embedding for the User's Message using Xenova Offline
    let queryEmbedding: number[] = [];
    try {
      if (!globalExtractor) {
        globalExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          quantized: false,
        });
      }
      const output = await globalExtractor(message, { pooling: 'mean', normalize: true });
      queryEmbedding = Array.from(output.data) as number[];
    } catch (e) {
      console.error("Failed to generate embedding for query", e);
    }

    // 2. Query Supabase Vector DB for Context
    let contextText = "";
    let retrievedSources: any[] = [];
    if (queryEmbedding && queryEmbedding.length > 0) {
      const { data: documents, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Return matches that are somewhat similar
        match_count: 5 // Get top 5 most relevant paragraphs
      });

      if (error) {
        console.error("Supabase vector search error:", error);
      } else if (documents && documents.length > 0) {
        contextText = "\n\n### Authentic Context Retrieved from Tafsirs & Lexicons:\n" + 
          documents.map((doc: any) => `[Source: ${doc.metadata?.book || 'Classical Text'} | Surah ${doc.metadata?.surah} Ayah ${doc.metadata?.ayah}]\n${doc.content}`).join("\n\n");
          
        retrievedSources = documents.map((doc: any) => ({
          book: doc.metadata?.book,
          surah: doc.metadata?.surah,
          ayah: doc.metadata?.ayah
        }));
      }
    }

    // 3. Call OpenRouter Llama/Qwen with the Context
    const payload = {
      model: 'meta-llama/llama-3.1-8b-instruct', // Ultra-cheap, highly reliable model on OpenRouter ($0.0000009 per call)
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}${contextText}` },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 1000
    };

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
        'X-Title': 'Al-Juthur RAG', // Required by OpenRouter
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('OpenRouter API Error:', errorText);
      throw new Error(`OpenRouter returned ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    // Deduplicate sources
    const uniqueSources = Array.from(
      new Set(retrievedSources.map(s => JSON.stringify(s)))
    ).map(s => JSON.parse(s));

    return NextResponse.json({ 
      success: true, 
      text: responseText, 
      remaining: limit.remaining,
      sources: uniqueSources
    });
  } catch (error: any) {
    console.error('RAG Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

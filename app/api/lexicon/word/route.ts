import { NextRequest, NextResponse } from 'next/server';
import { getWordMorphology, getLexiconEntriesForRoot } from '@/lib/lexicon/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const surah = parseInt(searchParams.get('surah') || '0', 10);
    const ayah = parseInt(searchParams.get('ayah') || '0', 10);
    const wordIndex = parseInt(searchParams.get('wordIndex') || '0', 10);

    if (!surah || !ayah || !wordIndex) {
      return NextResponse.json({ error: 'surah, ayah, and wordIndex are required' }, { status: 400 });
    }

    const morphology = await getWordMorphology(surah, ayah, wordIndex);
    if (!morphology) {
      return NextResponse.json({ error: 'Word morphology not found' }, { status: 404 });
    }

    let rootSummary: string | null = null;
    let rootQuery: string | null = null;
    let aiSummary: { root_meaning_html: string; quranic_usage_html: string } | null = null;

    if (morphology.root) {
      rootQuery = morphology.root.replace(/\s+/g, '');
      const lexiconResult = await getLexiconEntriesForRoot(rootQuery);
      if (lexiconResult.structuredLane?.summary_en) {
        rootSummary = lexiconResult.structuredLane.summary_en;
      }
      if (lexiconResult.ai_summary) {
        aiSummary = lexiconResult.ai_summary;
      }
    }

    return NextResponse.json({
      morphology,
      rootSummary,
      rootQuery,
      aiSummary,
    });
  } catch (error: any) {
    console.error('Error in GET /api/lexicon/word:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch word morphology' }, { status: 500 });
  }
}

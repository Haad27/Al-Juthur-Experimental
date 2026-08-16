import { NextRequest, NextResponse } from 'next/server';
import { getWordMorphology, getRootWordSummary, isMuqattaatWord } from '@/lib/lexicon/service';

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

    const isMuqattaat = isMuqattaatWord(surah, ayah, morphology.stem, morphology.root);

    let rootSummary: string | null = null;
    let rootQuery: string | null = null;
    let aiSummary: { root_meaning_html: string; quranic_usage_html: string } | null = null;

    if (morphology.root && !isMuqattaat) {
      rootQuery = morphology.root.replace(/\s+/g, '');
      const summaryResult = await getRootWordSummary(rootQuery);
      rootSummary = summaryResult.rootSummary;
      aiSummary = summaryResult.aiSummary;
    } else if (isMuqattaat) {
      morphology.root = null;
      morphology.stem = "Quranic Initials (حروف مقطعة)";
    }

    return NextResponse.json(
      {
        morphology,
        rootSummary,
        rootQuery,
        aiSummary,
        isMuqattaat,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in GET /api/lexicon/word:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch word morphology' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSurahWords } from '@/lib/lexicon/service';

// Removed `force-dynamic` — it was actively preventing Vercel CDN from caching this route.
// Surah word morphology data is fully static (it's the Quran!), so cache for 30 days.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surahParam = searchParams.get('surah');

  if (!surahParam) {
    return NextResponse.json({ error: 'Missing surah parameter' }, { status: 400 });
  }

  const surah = parseInt(surahParam, 10);
  if (isNaN(surah)) {
    return NextResponse.json({ error: 'Invalid surah parameter' }, { status: 400 });
  }

  try {
    const map = await getSurahWords(surah);
    return NextResponse.json(map, {
      headers: {
        // Quran morphology is immutable — cache at CDN edge for 30 days.
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error in /api/lexicon/surah-words:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
